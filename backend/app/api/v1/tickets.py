from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.models.category import Category
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.models.ticket_history import TicketHistory
from app.models.user import User
from sqlalchemy.orm import aliased
from app.schemas.ticket import (
    CommentCreate,
    StatusUpdate,
    TicketCreate,
    TicketDetailResponse,
    TicketResponse,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])

STAFF = ("IT_SUPPORT", "IT_MANAGER", "ADMIN")
MANAGERS = ("IT_MANAGER", "ADMIN")

TRANSITIONS = {
    "NEW": {"ASSIGNED", "CANCELLED"},
    "ASSIGNED": {"IN_PROGRESS", "CANCELLED"},
    "IN_PROGRESS": {
        "WAITING_USER",
        "WAITING_VENDOR",
        "RESOLVED",
    },
    "WAITING_USER": {"IN_PROGRESS", "CANCELLED"},
    "WAITING_VENDOR": {"IN_PROGRESS", "CANCELLED"},
    "RESOLVED": {"IN_PROGRESS", "CLOSED"},
    "CLOSED": set(),
    "CANCELLED": set(),
}


def generate_ticket_number(db: DbSession) -> str:
    # ใช้ sequence แยกตามเดือนใน PostgreSQL จริง
    # เพื่อป้องกันเลขซ้ำเมื่อเปิด Ticket พร้อมกัน
    # ให้เปลี่ยนส่วนนี้เป็นการใช้ ticket_number_counters
    # และ Transaction ก่อนนำขึ้นใช้งานจริง
    from sqlalchemy import func

    now = datetime.now(timezone.utc)
    prefix = f"IT-{now:%m%Y}-"

    count = db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.ticket_no.like(f"{prefix}%")
        )
    ) or 0

    return f"{prefix}{count + 1:06d}"


@router.post("", response_model=TicketResponse,
             status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: TicketCreate,
    db: DbSession,
    user: CurrentUser,
):
    category = db.get(Category, data.category_id)

    if category is None or not category.is_active:
        raise HTTPException(400, "Invalid category")

    ticket = Ticket(
        ticket_no=generate_ticket_number(db),
        subject=data.subject,
        description=data.description,
        requester_id=user.id,
        category_id=data.category_id,
        priority=data.priority,
        status="NEW",
    )

    db.add(ticket)
    db.flush()

    db.add(TicketHistory(
        ticket_id=ticket.id,
        changed_by=user.id,
        old_status=None,
        new_status="NEW",
        note="Ticket created",
    ))

    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=list[TicketResponse])
def list_tickets(db: DbSession, user: CurrentUser):
    query = select(Ticket).order_by(Ticket.created_at.desc())

    if user.role == "USER":
        query = query.where(Ticket.requester_id == user.id)

    return list(db.scalars(query).all())



@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(ticket_id: int, db: DbSession, user: CurrentUser):
    Requester = aliased(User)
    Assignee = aliased(User)

    row = db.execute(
        select(Ticket, Requester.full_name, Assignee.full_name)
        .join(Requester, Requester.id == Ticket.requester_id)
        .outerjoin(Assignee, Assignee.id == Ticket.assigned_to)
        .where(Ticket.id == ticket_id)
    ).first()

    if row is None:
        raise HTTPException(404, "Ticket not found")

    ticket, requester_name, assigned_to_name = row

    if user.role == "USER" and ticket.requester_id != user.id:
        raise HTTPException(403, "Permission denied")

    ticket_data = TicketResponse.model_validate(ticket).model_dump()

    ticket_data["requester_name"] = requester_name
    ticket_data["assigned_to_name"] = assigned_to_name

    return ticket_data


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: int,
    data: StatusUpdate,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    if user.role not in STAFF:
        raise HTTPException(403, "Permission denied")

    if data.status == "CLOSED" and user.role not in MANAGERS:
        raise HTTPException(403, "Only IT Manager or Admin can close tickets")

    if data.status == "CANCELLED" and user.role not in MANAGERS:
        raise HTTPException(403, "Only IT Manager or Admin can cancel tickets")

    if data.status not in TRANSITIONS.get(ticket.status, set()):
        raise HTTPException(
            400,
            f"Cannot change status from {ticket.status} to {data.status}",
        )

    old_status = ticket.status
    ticket.status = data.status

    if data.status == "RESOLVED":
        ticket.resolved_at = datetime.now(timezone.utc)

    if data.status == "CLOSED":
        ticket.closed_at = datetime.now(timezone.utc)

    db.add(TicketHistory(
        ticket_id=ticket.id,
        changed_by=user.id,
        old_status=old_status,
        new_status=data.status,
        note=data.note,
    ))

    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/comments", status_code=201)
def add_comment(
    ticket_id: int,
    data: CommentCreate,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    if user.role == "USER" and ticket.requester_id != user.id:
        raise HTTPException(403, "Permission denied")

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=user.id,
        comment=data.comment,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "ticket_id": comment.ticket_id,
        "user_id": comment.user_id,
        "comment": comment.comment,
        "created_at": comment.created_at,
    }

@router.get("/{ticket_id}/comments")
def list_comments(
    ticket_id: int,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    if user.role == "USER" and ticket.requester_id != user.id:
        raise HTTPException(403, "Permission denied")

    rows = db.execute(
        select(TicketComment, User.full_name)
        .join(User, User.id == TicketComment.user_id)
        .where(TicketComment.ticket_id == ticket_id)
        .order_by(TicketComment.created_at.asc())
    ).all()

    return [
        {
            "id": comment.id,
            "ticket_id": comment.ticket_id,
            "user_id": comment.user_id,
            "full_name": full_name,
            "comment": comment.comment,
            "created_at": comment.created_at,
        }
        for comment, full_name in rows
    ]

@router.get("/{ticket_id}/history")
def list_ticket_history(
    ticket_id: int,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    if user.role == "USER" and ticket.requester_id != user.id:
        raise HTTPException(403, "Permission denied")

    rows = db.execute(
        select(TicketHistory, User.full_name)
        .join(User, User.id == TicketHistory.changed_by)
        .where(TicketHistory.ticket_id == ticket_id)
        .order_by(TicketHistory.created_at.asc())
    ).all()

    return [
        {
            "id": history.id,
            "changed_by": history.changed_by,
            "full_name": full_name,
            "old_status": history.old_status,
            "new_status": history.new_status,
            "note": history.note,
            "created_at": history.created_at,
        }
        for history, full_name in rows
    ]

@router.post("/{ticket_id}/assign-to-me", response_model=TicketResponse)
def assign_ticket_to_me(
    ticket_id: int,
    db: DbSession,
    user: CurrentUser,
):
    if user.role not in STAFF:
        raise HTTPException(403, "Permission denied")

    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    if ticket.status not in {"NEW", "ASSIGNED"}:
        raise HTTPException(
            400,
            "Only NEW or ASSIGNED tickets can be accepted",
        )

    if ticket.assigned_to is not None and ticket.assigned_to != user.id:
        raise HTTPException(
            409,
            "This ticket is already assigned to another staff member",
        )

    old_status = ticket.status
    ticket.assigned_to = user.id

    if ticket.status == "NEW":
        ticket.status = "ASSIGNED"

    db.add(
        TicketHistory(
            ticket_id=ticket.id,
            changed_by=user.id,
            old_status=old_status,
            new_status=ticket.status,
            note=f"Ticket accepted by {user.full_name}",
        )
    )

    db.commit()
    db.refresh(ticket)

    return ticket

