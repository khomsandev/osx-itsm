
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    uploaded_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    original_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    stored_name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )

    content_type: Mapped[str] = mapped_column(
        String(150), nullable=False
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
