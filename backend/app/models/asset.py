
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_name: Mapped[str] = mapped_column(String(150), unique=True)
    tracking_type: Mapped[str] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    tracking_type: Mapped[str] = mapped_column(String(20))
    asset_name: Mapped[str] = mapped_column(String(200))
    category_id: Mapped[int] = mapped_column(
        ForeignKey("asset_categories.id")
    )

    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(150), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    minimum_quantity: Mapped[int] = mapped_column(Integer, default=0)

    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="AVAILABLE")

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    disposed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    disposed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    disposal_note: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"))
    assigned_to: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    returned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    returned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssetTransfer(Base):
    __tablename__ = "asset_transfers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"))
    from_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    to_location: Mapped[str] = mapped_column(String(200))
    transferred_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    transferred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssetMaintenance(Base):
    __tablename__ = "asset_maintenance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"))
    ticket_id: Mapped[int | None] = mapped_column(
        ForeignKey("tickets.id"), nullable=True
    )
    maintenance_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    maintenance_cost: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=0
    )
    performed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    maintenance_date: Mapped[date] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssetStockTransaction(Base):
    __tablename__ = "asset_stock_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"))
    transaction_type: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)
    reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    performed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
