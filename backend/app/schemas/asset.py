
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TrackingType = Literal["INDIVIDUAL", "QUANTITY"]


class AssetCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_name: str
    tracking_type: str
    description: str | None = None
    is_active: bool


class AssetCreate(BaseModel):
    asset_name: str = Field(min_length=2, max_length=200)
    category_id: int
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    description: str | None = None
    location: str | None = None
    quantity_on_hand: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=0, ge=0)
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    warranty_expiry: date | None = None


class AssetUpdate(BaseModel):
    asset_name: str | None = Field(default=None, min_length=2, max_length=200)
    category_id: int | None = None
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    description: str | None = None
    location: str | None = None
    minimum_quantity: int | None = Field(default=None, ge=0)
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    warranty_expiry: date | None = None
    status: Literal[
        "AVAILABLE", "ASSIGNED", "IN_USE",
        "UNDER_REPAIR", "DISPOSED", "INACTIVE"
    ] | None = None


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_code: str
    tracking_type: str
    asset_name: str
    category_id: int
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    description: str | None = None
    location: str | None = None
    quantity_on_hand: int
    minimum_quantity: int
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    warranty_expiry: date | None = None
    status: str
    created_at: datetime


class StockTransactionCreate(BaseModel):
    transaction_type: Literal["RECEIVE", "ISSUE"]
    quantity: int = Field(gt=0)
    reference_no: str | None = None
    note: str | None = None


class AssetAssignmentCreate(BaseModel):
    assigned_to: int
    note: str | None = None


class AssetReturnCreate(BaseModel):
    note: str | None = None


class AssetAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    assigned_to: int
    assigned_by: int
    assigned_at: datetime
    returned_at: datetime | None = None
    returned_by: int | None = None
    note: str | None = None


class AssetTransferCreate(BaseModel):
    to_location: str = Field(min_length=1, max_length=200)
    note: str | None = None


class AssetTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    from_location: str | None = None
    to_location: str
    transferred_by: int
    transferred_at: datetime
    note: str | None = None


class AssetMaintenanceCreate(BaseModel):
    maintenance_type: Literal[
        "REPAIR", "PREVENTIVE", "INSPECTION", "OTHER"
    ]
    description: str = Field(min_length=3)
    maintenance_cost: Decimal = Field(default=0, ge=0)
    maintenance_date: date
    note: str | None = None


class AssetMaintenanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    ticket_id: int | None = None
    maintenance_type: str
    description: str
    maintenance_cost: Decimal
    performed_by: int
    maintenance_date: date
    completed_at: datetime | None = None
    note: str | None = None

class AssetCategoryCreate(BaseModel):
    category_name: str = Field(min_length=2, max_length=150)
    tracking_type: TrackingType
    description: str | None = None


class AssetCategoryUpdate(BaseModel):
    category_name: str | None = Field(
        default=None, min_length=2, max_length=150
    )
    description: str | None = None
    is_active: bool | None = None


class AssetDisposalCreate(BaseModel):
    disposal_note: str = Field(min_length=3, max_length=2000)

class AssetDashboardSummary(BaseModel):
    total_assets: int
    individual_assets: int
    quantity_items: int
    assigned_assets: int
    under_repair: int
    disposed_assets: int
    low_stock_items: int
    total_stock_quantity: int

class AssetAssignableUserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    department: str | None = None
    job_position: str | None = None