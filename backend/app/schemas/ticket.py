from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Priority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    category_id: int
    priority: Priority = "MEDIUM"


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_no: str
    subject: str
    description: str
    requester_id: int
    category_id: int
    assigned_to: int | None
    priority: str
    status: str
    created_at: datetime


class TicketDetailResponse(TicketResponse):
    requester_name: str
    assigned_to_name: str | None = None



class StatusUpdate(BaseModel):
    status: Literal[
        "ASSIGNED",
        "IN_PROGRESS",
        "WAITING_USER",
        "WAITING_VENDOR",
        "RESOLVED",
        "CLOSED",
        "CANCELLED",
    ]
    note: str | None = None


class CommentCreate(BaseModel):
    comment: str = Field(min_length=1, max_length=10000)