
from fastapi import APIRouter, HTTPException, status
from pwdlib import PasswordHash
from sqlalchemy import func, select

from app.core.dependencies import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserAdminResponse


router = APIRouter(prefix="/users", tags=["User Management"])
password_hasher = PasswordHash.recommended()

VALID_ROLES = {"USER", "IT_SUPPORT", "IT_MANAGER", "ADMIN"}


def require_admin(user: CurrentUser):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required",
        )


def prevent_last_admin_removal(db: DbSession, target: User):
    if target.role != "ADMIN":
        return

    admin_count = db.scalar(
        select(func.count(User.id)).where(
            User.role == "ADMIN",
            User.is_active.is_(True),
        )
    ) or 0

    if target.is_active and admin_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot disable or demote the last active admin",
        )


@router.get("", response_model=list[UserAdminResponse])
def list_users(db: DbSession, user: CurrentUser):
    require_admin(user)

    return db.scalars(
        select(User).order_by(User.id.desc())
    ).all()


@router.post(
    "",
    response_model=UserAdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(data: UserCreate, db: DbSession, user: CurrentUser):
    require_admin(user)

    existing = db.scalar(
        select(User).where(User.username == data.username)
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    new_user = User(
        username=data.username,
        password_hash=password_hasher.hash(data.password),
        full_name=data.full_name,
        email=str(data.email) if data.email else None,
        department=data.department.strip() if data.department else None,
        job_position=data.job_position.strip() if data.job_position else None,
        role=data.role,
        is_active=True,

    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.patch("/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: DbSession,
    user: CurrentUser,
):
    require_admin(user)

    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    changes = data.model_dump(exclude_unset=True)

    if user.id == target.id:
        if changes.get("is_active") is False:
            raise HTTPException(
                status_code=400,
                detail="You cannot disable your own account",
            )
        if changes.get("role") not in (None, "ADMIN"):
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role",
            )

    new_role = changes.get("role", target.role)
    new_active = changes.get("is_active", target.is_active)

    if target.role == "ADMIN" and target.is_active:
        if new_role != "ADMIN" or new_active is False:
            prevent_last_admin_removal(db, target)

    if "username" in changes:
        raise HTTPException(
            status_code=400,
            detail="Username cannot be changed",
        )

    if "password" in changes:
        new_password = changes.pop("password")
        if new_password:
            target.password_hash = password_hasher.hash(new_password)

    if "email" in changes:
        changes["email"] = (
            str(changes["email"]) if changes["email"] else None
        )

    for field, value in changes.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)

    return target
