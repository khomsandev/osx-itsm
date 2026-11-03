from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import DbSession, CurrentUser, require_roles
from app.models.user import User
from app.models.asset import Asset, AssetCategory, AssetStockTransaction, AssetAssignment, AssetTransfer, AssetMaintenance
from app.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    AssetCategoryResponse,
    StockTransactionCreate,
    AssetAssignmentCreate,
    AssetReturnCreate,
    AssetAssignmentResponse,
    AssetTransferCreate,
    AssetTransferResponse,
    AssetMaintenanceCreate,
    AssetMaintenanceResponse,
    AssetCategoryCreate,
    AssetCategoryUpdate,
    AssetDisposalCreate,
    AssetDashboardSummary,
    AssetAssignableUserResponse,
)

router = APIRouter(
    prefix="/assets",
    tags=["IT Assets"],
    dependencies=[
        Depends(require_roles("IT_SUPPORT", "IT_MANAGER", "ADMIN"))
    ],
)


@router.get("/categories", response_model=list[AssetCategoryResponse])
def get_asset_categories(db: DbSession):
    return db.scalars(
        select(AssetCategory)
        .where(AssetCategory.is_active.is_(True))
        .order_by(AssetCategory.category_name)
    ).all()


@router.get("", response_model=list[AssetResponse])
def get_assets(
    db: DbSession,
    tracking_type: str | None = None,
    status_filter: str | None = None,
    keyword: str | None = None,
):
    query = select(Asset)

    if tracking_type:
        if tracking_type not in ("INDIVIDUAL", "QUANTITY"):
            raise HTTPException(400, "Invalid tracking_type")
        query = query.where(Asset.tracking_type == tracking_type)

    if status_filter:
        query = query.where(Asset.status == status_filter)

    if keyword:
        search = f"%{keyword.strip()}%"
        query = query.where(
            Asset.asset_code.ilike(search)
            | Asset.asset_name.ilike(search)
            | Asset.serial_number.ilike(search)
        )

    return db.scalars(query.order_by(Asset.id.desc())).all()


@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(
    payload: AssetCreate,
    db: DbSession,
    user: CurrentUser,
):
    category = db.get(AssetCategory, payload.category_id)

    if category is None or not category.is_active:
        raise HTTPException(404, "Asset category not found")

    tracking_type = category.tracking_type

    if tracking_type == "INDIVIDUAL":
        if payload.quantity_on_hand != 0:
            raise HTTPException(
                400, "Individual asset quantity_on_hand must be 0"
            )
    elif tracking_type == "QUANTITY":
        if payload.serial_number:
            raise HTTPException(
                400, "Stock item should not have a serial number"
            )
    else:
        raise HTTPException(400, "Invalid category tracking type")

    try:
        asset_code = db.execute(
            select(
                # Call PostgreSQL function to generate asset code
                # using SELECT public.generate_asset_code(...)
                Asset.id
            ).where(Asset.id == -1)
        ).scalar_one_or_none()

        from sqlalchemy import text

        asset_code = db.execute(
            text(
                "SELECT public.generate_asset_code(:tracking_type)"
            ),
            {"tracking_type": tracking_type},
        ).scalar_one()

        asset = Asset(
            asset_code=asset_code,
            tracking_type=tracking_type,
            asset_name=payload.asset_name,
            category_id=payload.category_id,
            brand=payload.brand,
            model=payload.model,
            serial_number=payload.serial_number,
            description=payload.description,
            location=payload.location,
            quantity_on_hand=payload.quantity_on_hand,
            minimum_quantity=payload.minimum_quantity,
            purchase_date=payload.purchase_date,
            purchase_price=payload.purchase_price,
            warranty_expiry=payload.warranty_expiry,
            status="AVAILABLE",
            created_by=user.id,
        )

        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    except Exception:
        db.rollback()
        raise

@router.get(
    "/assignable-users",
    response_model=list[AssetAssignableUserResponse],
)
def get_assignable_users(
    db: DbSession,
    user: CurrentUser,
):
    users = db.scalars(
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.full_name.asc(), User.id.asc())
    ).all()

    return users

@router.post(
    "/{asset_id}/assign",
    response_model=AssetAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_asset(
    asset_id: int,
    payload: AssetAssignmentCreate,
    db: DbSession,
    user: CurrentUser,
):
    # 1. ตรวจสอบ Asset และ Lock แถวข้อมูลป้องกันการจ่ายซ้ำพร้อมกัน
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail="Asset not found",
        )

    # 2. ตรวจสอบประเภท Asset
    if asset.tracking_type != "INDIVIDUAL":
        raise HTTPException(
            status_code=400,
            detail="Only INDIVIDUAL assets can be assigned",
        )

    # 3. ตรวจสอบสถานะ Asset
    if asset.status != "AVAILABLE":
        raise HTTPException(
            status_code=400,
            detail="Asset is not available for assignment",
        )

    # 4. ตรวจสอบพนักงานผู้รับ
    assignee = db.get(User, payload.assigned_to)

    if assignee is None or not assignee.is_active:
        raise HTTPException(
            status_code=400,
            detail="Assigned user not found or inactive",
        )

    # 5. ตรวจสอบว่ามีรายการที่ยังไม่คืนอยู่หรือไม่
    active_assignment = db.scalar(
        select(AssetAssignment).where(
            AssetAssignment.asset_id == asset_id,
            AssetAssignment.returned_at.is_(None),
        )
    )

    if active_assignment:
        raise HTTPException(
            status_code=409,
            detail="Asset already has an active assignment",
        )

    # 6. บันทึกข้อมูลการจ่าย
    assignment = AssetAssignment(
        asset_id=asset.id,
        assigned_to=assignee.id,
        assigned_by=user.id,
        note=payload.note,
    )

    # 7. เปลี่ยนสถานะ Asset
    asset.status = "ASSIGNED"
    asset.updated_by = user.id

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment

@router.post(
    "/{asset_id}/return",
    response_model=AssetAssignmentResponse,
)
def return_asset(
    asset_id: int,
    payload: AssetReturnCreate,
    db: DbSession,
    user: CurrentUser,
):
    # 1. ตรวจสอบ Asset และ Lock แถวข้อมูล
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail="Asset not found",
        )

    # 2. ตรวจสอบประเภท Asset
    if asset.tracking_type != "INDIVIDUAL":
        raise HTTPException(
            status_code=400,
            detail="Only INDIVIDUAL assets can be returned",
        )

    # 3. ตรวจสอบสถานะ
    if asset.status != "ASSIGNED":
        raise HTTPException(
            status_code=400,
            detail="Asset is not currently assigned",
        )

    # 4. ค้นหารายการ Assignment ที่ยังไม่ได้คืน
    assignment = db.scalar(
        select(AssetAssignment)
        .where(
            AssetAssignment.asset_id == asset_id,
            AssetAssignment.returned_at.is_(None),
        )
        .order_by(AssetAssignment.assigned_at.desc())
        .with_for_update()
    )

    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="Active assignment not found",
        )

    # 5. บันทึกข้อมูลการรับคืน
    assignment.returned_at = datetime.now(timezone.utc)
    assignment.returned_by = user.id

    if payload.note:
        assignment.note = (
            f"{assignment.note}\nReturn: {payload.note}"
            if assignment.note
            else f"Return: {payload.note}"
        )

    # 6. เปลี่ยนสถานะ Asset
    asset.status = "AVAILABLE"
    asset.updated_by = user.id

    # 7. บันทึกลง Database
    db.commit()
    db.refresh(assignment)
    db.refresh(asset)

    return assignment

@router.get(
    "/{asset_id}/assignments",
    response_model=list[AssetAssignmentResponse],
)
def get_asset_assignments(
    asset_id: int,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail="Asset not found",
        )

    assignments = db.scalars(
        select(AssetAssignment)
        .where(AssetAssignment.asset_id == asset_id)
        .order_by(AssetAssignment.assigned_at.desc())
    ).all()

    return assignments

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: DbSession):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(404, "Asset not found")

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.status == "DISPOSED":
        raise HTTPException(400, "Disposed asset cannot be edited")

    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        category = db.get(AssetCategory, data["category_id"])
        if category is None or not category.is_active:
            raise HTTPException(404, "Asset category not found")
        if category.tracking_type != asset.tracking_type:
            raise HTTPException(
                400, "Cannot change asset tracking type"
            )

    for field, value in data.items():
        setattr(asset, field, value)

    asset.updated_by = user.id

    db.commit()
    db.refresh(asset)
    return asset


@router.post("/{asset_id}/stock-transactions")
def create_stock_transaction(
    asset_id: int,
    payload: StockTransactionCreate,
    db: DbSession,
    user: CurrentUser,
):
    # Lock the asset row to prevent concurrent stock updates.
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.tracking_type != "QUANTITY":
        raise HTTPException(
            400, "Stock transactions are only for quantity-based assets"
        )

    if asset.status in ("DISPOSED", "INACTIVE"):
        raise HTTPException(400, "This stock item is inactive")

    if payload.transaction_type == "RECEIVE":
        asset.quantity_on_hand += payload.quantity
    elif payload.transaction_type == "ISSUE":
        if asset.quantity_on_hand < payload.quantity:
            raise HTTPException(
                400,
                f"Insufficient stock. Available: {asset.quantity_on_hand}",
            )
        asset.quantity_on_hand -= payload.quantity

    transaction = AssetStockTransaction(
        asset_id=asset.id,
        transaction_type=payload.transaction_type,
        quantity=payload.quantity,
        reference_no=payload.reference_no,
        performed_by=user.id,
        note=payload.note,
    )

    db.add(transaction)
    asset.updated_by = user.id

    db.commit()

    return {
        "message": "Stock transaction completed",
        "asset_code": asset.asset_code,
        "transaction_type": payload.transaction_type,
        "quantity": payload.quantity,
        "quantity_on_hand": asset.quantity_on_hand,
    }

@router.post(
    "/{asset_id}/assign",
    response_model=AssetAssignmentResponse,
    status_code=201,
)
def assign_asset(
    asset_id: int,
    payload: AssetAssignmentCreate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.tracking_type != "INDIVIDUAL":
        raise HTTPException(
            400, "Only individual assets can be assigned"
        )

    if asset.status != "AVAILABLE":
        raise HTTPException(
            400, f"Asset is not available. Current status: {asset.status}"
        )

    employee = db.get(User, payload.assigned_to)

    if employee is None or not employee.is_active:
        raise HTTPException(404, "Active employee not found")

    active_assignment = db.scalar(
        select(AssetAssignment).where(
            AssetAssignment.asset_id == asset_id,
            AssetAssignment.returned_at.is_(None),
        )
    )

    if active_assignment:
        raise HTTPException(
            409, "Asset already has an active assignment"
        )

    assignment = AssetAssignment(
        asset_id=asset.id,
        assigned_to=employee.id,
        assigned_by=user.id,
        note=payload.note,
    )

    asset.status = "ASSIGNED"
    asset.updated_by = user.id

    try:
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Asset already has an active assignment"
        )


@router.post(
    "/{asset_id}/return",
    response_model=AssetAssignmentResponse,
)
def return_asset(
    asset_id: int,
    payload: AssetReturnCreate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.tracking_type != "INDIVIDUAL":
        raise HTTPException(
            400, "Only individual assets can be returned"
        )

    assignment = db.scalar(
        select(AssetAssignment)
        .where(
            AssetAssignment.asset_id == asset_id,
            AssetAssignment.returned_at.is_(None),
        )
        .with_for_update()
    )

    if assignment is None:
        raise HTTPException(
            404, "No active assignment found for this asset"
        )

    assignment.returned_at = datetime.now(timezone.utc)
    assignment.returned_by = user.id

    if payload.note:
        assignment.note = (
            f"{assignment.note or ''}\nReturn: {payload.note}"
        ).strip()

    asset.status = "AVAILABLE"
    asset.updated_by = user.id

    db.commit()
    db.refresh(assignment)

    return assignment


@router.get(
    "/{asset_id}/assignments",
    response_model=list[AssetAssignmentResponse],
)
def get_asset_assignments(
    asset_id: int,
    db: DbSession,
):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(404, "Asset not found")

    return db.scalars(
        select(AssetAssignment)
        .where(AssetAssignment.asset_id == asset_id)
        .order_by(AssetAssignment.assigned_at.desc())
    ).all()


@router.post(
    "/{asset_id}/transfers",
    response_model=AssetTransferResponse,
    status_code=201,
)
def transfer_asset(
    asset_id: int,
    payload: AssetTransferCreate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.status in ("DISPOSED", "INACTIVE"):
        raise HTTPException(400, "This asset cannot be transferred")

    new_location = payload.to_location.strip()

    if not new_location:
        raise HTTPException(400, "Destination location is required")

    old_location = asset.location

    if old_location == new_location:
        raise HTTPException(
            400, "Destination must be different from current location"
        )

    transfer = AssetTransfer(
        asset_id=asset.id,
        from_location=old_location,
        to_location=new_location,
        transferred_by=user.id,
        note=payload.note,
    )

    asset.location = new_location
    asset.updated_by = user.id

    try:
        db.add(transfer)
        db.commit()
        db.refresh(transfer)
        return transfer
    except Exception:
        db.rollback()
        raise


@router.get(
    "/{asset_id}/transfers",
    response_model=list[AssetTransferResponse],
)
def get_asset_transfers(
    asset_id: int,
    db: DbSession,
):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(404, "Asset not found")

    return db.scalars(
        select(AssetTransfer)
        .where(AssetTransfer.asset_id == asset_id)
        .order_by(AssetTransfer.transferred_at.desc())
    ).all()


@router.post(
    "/{asset_id}/maintenance",
    response_model=AssetMaintenanceResponse,
    status_code=201,
)
def create_asset_maintenance(
    asset_id: int,
    payload: AssetMaintenanceCreate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.status in ("DISPOSED", "INACTIVE"):
        raise HTTPException(
            400, "This asset cannot be maintained"
        )

    maintenance = AssetMaintenance(
        asset_id=asset.id,
        maintenance_type=payload.maintenance_type,
        description=payload.description,
        maintenance_cost=payload.maintenance_cost,
        performed_by=user.id,
        maintenance_date=payload.maintenance_date,
        note=payload.note,
    )

    asset.status = "UNDER_REPAIR"
    asset.updated_by = user.id

    try:
        db.add(maintenance)
        db.commit()
        db.refresh(maintenance)
        return maintenance
    except Exception:
        db.rollback()
        raise


@router.get(
    "/{asset_id}/maintenance",
    response_model=list[AssetMaintenanceResponse],
)
def get_asset_maintenance(
    asset_id: int,
    db: DbSession,
):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(404, "Asset not found")

    return db.scalars(
        select(AssetMaintenance)
        .where(AssetMaintenance.asset_id == asset_id)
        .order_by(AssetMaintenance.maintenance_date.desc())
    ).all()


@router.post("/{asset_id}/maintenance/{maintenance_id}/complete")
def complete_asset_maintenance(
    asset_id: int,
    maintenance_id: int,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    maintenance = db.scalar(
        select(AssetMaintenance)
        .where(
            AssetMaintenance.id == maintenance_id,
            AssetMaintenance.asset_id == asset_id,
        )
        .with_for_update()
    )

    if maintenance is None:
        raise HTTPException(404, "Maintenance record not found")

    if maintenance.completed_at is not None:
        raise HTTPException(400, "Maintenance already completed")

    if asset.status != "UNDER_REPAIR":
        raise HTTPException(
            400, "Asset is not currently under repair"
        )

    maintenance.completed_at = datetime.now(timezone.utc)

    # หากมีผู้ครอบครองอยู่ ให้กลับเป็น ASSIGNED
    active_assignment = db.scalar(
        select(AssetAssignment).where(
            AssetAssignment.asset_id == asset_id,
            AssetAssignment.returned_at.is_(None),
        )
    )

    asset.status = "ASSIGNED" if active_assignment else "AVAILABLE"
    asset.updated_by = user.id

    db.commit()

    return {
        "message": "Maintenance completed",
        "asset_code": asset.asset_code,
        "status": asset.status,
        "completed_at": maintenance.completed_at,
    }

@router.post(
    "/categories",
    response_model=AssetCategoryResponse,
    status_code=201,
    dependencies=[Depends(require_roles("IT_MANAGER", "ADMIN"))],
)
def create_asset_category(
    payload: AssetCategoryCreate,
    db: DbSession,
):
    category = AssetCategory(
        category_name=payload.category_name.strip(),
        tracking_type=payload.tracking_type,
        description=payload.description,
    )

    db.add(category)

    try:
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Category name already exists"
        )


@router.put(
    "/categories/{category_id}",
    response_model=AssetCategoryResponse,
    dependencies=[Depends(require_roles("IT_MANAGER", "ADMIN"))],
)
def update_asset_category(
    category_id: int,
    payload: AssetCategoryUpdate,
    db: DbSession,
):
    category = db.get(AssetCategory, category_id)

    if category is None:
        raise HTTPException(404, "Category not found")

    data = payload.model_dump(exclude_unset=True)

    # ป้องกันเปลี่ยนชื่อ/ปิดหมวดหมู่ที่มีการใช้งาน
    if data.get("is_active") is False:
        used = db.scalar(
            select(Asset.id)
            .where(Asset.category_id == category_id)
            .limit(1)
        )
        if used is not None:
            raise HTTPException(
                400,
                "Category is used by assets. Cannot deactivate."
            )

    for field, value in data.items():
        if field == "category_name" and value is not None:
            value = value.strip()
        setattr(category, field, value)

    try:
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Category name already exists")


@router.post(
    "/{asset_id}/dispose",
    dependencies=[Depends(require_roles("IT_MANAGER", "ADMIN"))],
)
def dispose_asset(
    asset_id: int,
    payload: AssetDisposalCreate,
    db: DbSession,
    user: CurrentUser,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.status == "DISPOSED":
        raise HTTPException(400, "Asset already disposed")

    if asset.status == "ASSIGNED":
        raise HTTPException(
            400, "Please return the assigned asset before disposal"
        )

    if asset.status == "UNDER_REPAIR":
        raise HTTPException(
            400, "Please complete maintenance before disposal"
        )

    if asset.tracking_type == "QUANTITY" and asset.quantity_on_hand > 0:
        raise HTTPException(
            400,
            "Stock quantity must be zero before disposal"
        )

    asset.status = "DISPOSED"
    asset.disposed_at = datetime.now(timezone.utc)
    asset.disposed_by = user.id
    asset.disposal_note = payload.disposal_note
    asset.updated_by = user.id

    db.commit()

    return {
        "message": "Asset disposed successfully",
        "asset_code": asset.asset_code,
        "status": asset.status,
        "disposed_at": asset.disposed_at,
    }

@router.delete(
    "/{asset_id}",
    dependencies=[Depends(require_roles("ADMIN"))],
)
def delete_asset(
    asset_id: int,
    db: DbSession,
):
    asset = db.scalar(
        select(Asset)
        .where(Asset.id == asset_id)
        .with_for_update()
    )

    if asset is None:
        raise HTTPException(404, "Asset not found")

    try:
        db.delete(asset)
        db.commit()

        return {
            "message": "Asset permanently deleted",
            "asset_id": asset_id,
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "Cannot permanently delete this asset because it has transaction history or related records. Use disposal instead."
        )

@router.get(
    "/dashboard/summary",
    response_model=AssetDashboardSummary,
)
def get_asset_dashboard_summary(db: DbSession):

    total_assets = db.scalar(
        select(func.count(Asset.id))
    ) or 0

    individual_assets = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.tracking_type == "INDIVIDUAL",
            Asset.status != "DISPOSED",
        )
    ) or 0

    quantity_items = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.tracking_type == "QUANTITY",
            Asset.status != "DISPOSED",
        )
    ) or 0

    assigned_assets = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.status == "ASSIGNED"
        )
    ) or 0

    under_repair = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.status == "UNDER_REPAIR"
        )
    ) or 0

    disposed_assets = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.status == "DISPOSED"
        )
    ) or 0

    low_stock_items = db.scalar(
        select(func.count(Asset.id)).where(
            Asset.tracking_type == "QUANTITY",
            Asset.status == "AVAILABLE",
            Asset.quantity_on_hand <= Asset.minimum_quantity,
        )
    ) or 0

    total_stock_quantity = db.scalar(
        select(func.coalesce(func.sum(Asset.quantity_on_hand), 0))
        .where(
            Asset.tracking_type == "QUANTITY",
            Asset.status != "DISPOSED",
        )
    ) or 0

    return AssetDashboardSummary(
        total_assets=total_assets,
        individual_assets=individual_assets,
        quantity_items=quantity_items,
        assigned_assets=assigned_assets,
        under_repair=under_repair,
        disposed_assets=disposed_assets,
        low_stock_items=low_stock_items,
        total_stock_quantity=total_stock_quantity,
    )