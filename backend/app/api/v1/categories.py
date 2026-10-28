from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import CurrentUser, DbSession
from app.models.category import Category

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    parent_id: int | None = None
    is_active: bool | None = None


def require_admin(user: CurrentUser):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required",
        )


def category_response(category: Category):
    return {
        "id": category.id,
        "name": category.name,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
    }


def validate_parent(db: DbSession, parent_id: int | None, category_id: int | None = None):
    if parent_id is None:
        return

    if category_id is not None and parent_id == category_id:
        raise HTTPException(
            status_code=400,
            detail="A category cannot be its own parent",
        )

    parent = db.get(Category, parent_id)
    if parent is None:
        raise HTTPException(status_code=400, detail="Parent category not found")


@router.get("")
def list_categories(db: DbSession, user: CurrentUser):
    # ผู้ใช้ที่เข้าสู่ระบบสามารถอ่านเฉพาะหมวดหมู่ที่เปิดใช้งาน
    categories = db.scalars(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name)
    ).all()

    return [category_response(item) for item in categories]


@router.get("/admin")
def list_categories_admin(db: DbSession, user: CurrentUser):
    require_admin(user)

    categories = db.scalars(
        select(Category).order_by(Category.name)
    ).all()

    return [category_response(item) for item in categories]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: DbSession, user: CurrentUser):
    require_admin(user)

    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")

    duplicate = db.scalar(
        select(Category).where(Category.name == name)
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Category already exists")

    validate_parent(db, data.parent_id)

    category = Category(name=name, parent_id=data.parent_id, is_active=True)
    db.add(category)

    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to create category")

    return category_response(category)


@router.patch("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: DbSession,
    user: CurrentUser,
):
    require_admin(user)

    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Category name is required")

        duplicate = db.scalar(
            select(Category).where(
                Category.name == name,
                Category.id != category_id,
            )
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Category already exists")

        changes["name"] = name

    if "parent_id" in changes:
        validate_parent(db, changes["parent_id"], category_id)

    for field, value in changes.items():
        setattr(category, field, value)

    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to update category")

    return category_response(category)
