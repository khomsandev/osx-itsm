from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.core.dependencies import CurrentUser, DbSession

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])

VALID_ROLES = {"USER", "IT_SUPPORT", "IT_MANAGER", "ADMIN"}


def require_admin(user: CurrentUser):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin permission required")


class StatusUpdate(BaseModel):
    status_name: str = Field(min_length=1, max_length=100)
    sort_order: int = Field(ge=0)
    is_active: bool
    is_terminal: bool


class TransitionUpdate(BaseModel):
    from_status: str
    to_status: str
    role: str
    is_active: bool


class SettingUpdate(BaseModel):
    setting_value: str = Field(max_length=2000)


@router.get("")
def get_admin_settings(db: DbSession, user: CurrentUser):
    require_admin(user)

    statuses = db.execute(text("""
        SELECT status_code, status_name, sort_order, is_active, is_terminal
        FROM public.ticket_statuses
        ORDER BY sort_order, status_code
    """)).mappings().all()

    transitions = db.execute(text("""
        SELECT from_status, to_status, role, is_active
        FROM public.ticket_status_transitions
        ORDER BY from_status, to_status, role
    """)).mappings().all()

    settings = db.execute(text("""
        SELECT setting_key, setting_value, description, updated_at
        FROM public.system_settings
        ORDER BY setting_key
    """)).mappings().all()

    return {
        "statuses": [dict(row) for row in statuses],
        "transitions": [dict(row) for row in transitions],
        "settings": [dict(row) for row in settings],
        "roles": sorted(VALID_ROLES),
    }


@router.put("/statuses/{status_code}")
def update_status_setting(
    status_code: str,
    data: StatusUpdate,
    db: DbSession,
    user: CurrentUser,
):
    require_admin(user)

    result = db.execute(text("""
        UPDATE public.ticket_statuses
        SET status_name = :status_name,
            sort_order = :sort_order,
            is_active = :is_active,
            is_terminal = :is_terminal
        WHERE status_code = :status_code
        RETURNING status_code
    """), {
        "status_code": status_code,
        "status_name": data.status_name.strip(),
        "sort_order": data.sort_order,
        "is_active": data.is_active,
        "is_terminal": data.is_terminal,
    }).first()

    if result is None:
        db.rollback()
        raise HTTPException(status_code=404, detail="Status not found")

    db.commit()
    return {"message": "บันทึกสถานะเรียบร้อยแล้ว"}


@router.put("/transitions")
def update_transition(
    data: TransitionUpdate,
    db: DbSession,
    user: CurrentUser,
):
    require_admin(user)

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    if data.from_status == data.to_status:
        raise HTTPException(status_code=400, detail="สถานะต้นทางและปลายทางต้องต่างกัน")

    statuses = db.execute(text("""
        SELECT status_code
        FROM public.ticket_statuses
        WHERE status_code IN (:from_status, :to_status)
    """), {
        "from_status": data.from_status,
        "to_status": data.to_status,
    }).scalars().all()

    if len(set(statuses)) != 2:
        raise HTTPException(status_code=400, detail="ไม่พบสถานะต้นทางหรือปลายทาง")

    db.execute(text("""
        INSERT INTO public.ticket_status_transitions
            (from_status, to_status, role, is_active)
        VALUES
            (:from_status, :to_status, :role, :is_active)
        ON CONFLICT (from_status, to_status, role)
        DO UPDATE SET is_active = EXCLUDED.is_active
    """), data.model_dump())

    db.commit()
    return {"message": "บันทึกสิทธิ์ Workflow เรียบร้อยแล้ว"}


@router.put("/general/{setting_key}")
def update_general_setting(
    setting_key: str,
    data: SettingUpdate,
    db: DbSession,
    user: CurrentUser,
):
    require_admin(user)

    result = db.execute(text("""
        UPDATE public.system_settings
        SET setting_value = :setting_value,
            updated_at = NOW(),
            updated_by = :updated_by
        WHERE setting_key = :setting_key
        RETURNING setting_key
    """), {
        "setting_key": setting_key,
        "setting_value": data.setting_value,
        "updated_by": user.id,
    }).first()

    if result is None:
        db.rollback()
        raise HTTPException(status_code=404, detail="Setting not found")

    db.commit()
    return {"message": "บันทึกการตั้งค่าทั่วไปเรียบร้อยแล้ว"}
