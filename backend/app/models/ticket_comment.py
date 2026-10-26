from datetime import datetime

from sqlalchemy import (
    DateTime, ForeignKey, Integer, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id")
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )