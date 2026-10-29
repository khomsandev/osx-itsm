from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.core.security import create_access_token, verify_password, hash_password
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: DbSession):
    user = db.scalar(
        select(User).where(User.username == data.username)
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is incorrect",
        )

    return LoginResponse(
        access_token=create_access_token(user.id, user.role),
        must_change_password=user.must_change_password,
    )


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return user

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    user: CurrentUser,
    db: DbSession,
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different",
        )

    user.password_hash = hash_password(data.new_password)
    user.must_change_password = False

    db.commit()

    return {"message": "Password changed successfully"}