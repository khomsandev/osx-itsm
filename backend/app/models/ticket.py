from datetime import datetime

from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    ticket_no: Mapped[str] = mapped_column(
        String(30), unique=True, index=True
    )
    subject: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)

    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id")
    )
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    priority: Mapped[str] = mapped_column(
        String(20), default="MEDIUM"
    )
    status: Mapped[str] = mapped_column(
        String(30), default="NEW"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )