from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.models.category import Category

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("")
def list_categories(
    db: DbSession,
    user: CurrentUser,
):
    statement = (
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name)
    )

    categories = db.scalars(statement).all()

    return [
        {
            "id": category.id,
            "name": category.name,
            "parent_id": category.parent_id,
        }
        for category in categories
    ]