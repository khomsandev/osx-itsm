from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255)
    )
    full_name: Mapped[str] = mapped_column(
        String(200)
    )
    email: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(30), default="USER"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )