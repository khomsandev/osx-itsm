import os
import uuid

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, text

from pathlib import Path
from fastapi import File, UploadFile
from fastapi.responses import FileResponse

from app.models.ticket_attachment import TicketAttachment
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

    # ตรวจสอบว่าสถานะปลายทางมีอยู่และเปิดใช้งาน
    target_status = db.execute(text("""
        SELECT status_code
        FROM public.ticket_statuses
        WHERE status_code = :status
          AND is_active = TRUE
    """), {"status": data.status}).scalar_one_or_none()

    if target_status is None:
        raise HTTPException(
            400,
            f"Status {data.status} does not exist or is inactive",
        )

    # ตรวจสอบกฎการเปลี่ยนสถานะตาม Role จาก PostgreSQL
    allowed = db.execute(text("""
        SELECT 1
        FROM public.ticket_status_transitions
        WHERE from_status = :from_status
          AND to_status = :to_status
          AND role = :role
          AND is_active = TRUE
        LIMIT 1
    """), {
        "from_status": ticket.status,
        "to_status": data.status,
        "role": user.role,
    }).first()

    if allowed is None:
        raise HTTPException(
            403,
            f"Role {user.role} cannot change status "
            f"from {ticket.status} to {data.status}",
        )

    old_status = ticket.status
    now = datetime.now(timezone.utc)

    ticket.status = data.status

    if data.status == "RESOLVED":
        ticket.resolved_at = now

    if data.status == "CLOSED":
        ticket.closed_at = now

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


# เก็บไฟล์ไว้ที่ backend/uploads/tickets/
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads" / "tickets"

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB ต่อไฟล์
MAX_FILES = 5

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png",
    ".pdf", ".doc", ".docx",
    ".xlsx", ".txt",
}


def check_ticket_access(ticket, user):
    if user.role == "USER" and ticket.requester_id != user.id:
        raise HTTPException(403, "Permission denied")


@router.post("/{ticket_id}/attachments", status_code=201)
async def upload_ticket_attachments(
    ticket_id: int,
    db: DbSession,
    user: CurrentUser,
    files: list[UploadFile] = File(...),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    check_ticket_access(ticket, user)

    if not files or len(files) > MAX_FILES:
        raise HTTPException(
            400, f"กรุณาเลือกไฟล์ตั้งแต่ 1 ถึง {MAX_FILES} ไฟล์"
        )

    prepared_files = []
    total_size = 0

    # ตรวจสอบไฟล์ทั้งหมดก่อนเขียนลงดิสก์
    for upload in files:
        original_name = Path(upload.filename or "").name

        if not original_name:
            raise HTTPException(400, "ชื่อไฟล์ไม่ถูกต้อง")

        extension = Path(original_name).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                400, f"ไม่อนุญาตให้อัปโหลดไฟล์ {original_name}"
            )

        content = await upload.read(MAX_FILE_SIZE + 1)

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                413, f"ไฟล์ {original_name} มีขนาดเกิน 10 MB"
            )

        total_size += len(content)

        if total_size > MAX_FILES * MAX_FILE_SIZE:
            raise HTTPException(413, "ขนาดไฟล์รวมเกินกำหนด")

        prepared_files.append(
            (original_name, extension, content, upload.content_type)
        )

    target_dir = UPLOAD_DIR / str(ticket_id)
    target_dir.mkdir(parents=True, exist_ok=True)

    created_paths = []
    attachment_rows = []

    try:
        for original_name, extension, content, content_type in prepared_files:
            stored_name = f"{uuid.uuid4().hex}{extension}"
            file_path = target_dir / stored_name

            with file_path.open("xb") as output:
                output.write(content)

            created_paths.append(file_path)

            attachment = TicketAttachment(
                ticket_id=ticket_id,
                uploaded_by=user.id,
                original_name=original_name,
                stored_name=stored_name,
                content_type=content_type or "application/octet-stream",
                file_size=len(content),
            )

            db.add(attachment)
            attachment_rows.append(attachment)

        db.commit()

        for attachment in attachment_rows:
            db.refresh(attachment)

        return [
            {
                "id": item.id,
                "ticket_id": item.ticket_id,
                "original_name": item.original_name,
                "content_type": item.content_type,
                "file_size": item.file_size,
                "created_at": item.created_at,
            }
            for item in attachment_rows
        ]

    except Exception:
        db.rollback()

        for file_path in created_paths:
            file_path.unlink(missing_ok=True)

        raise


@router.get("/{ticket_id}/attachments")
def list_ticket_attachments(
    ticket_id: int,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    check_ticket_access(ticket, user)

    items = db.scalars(
        select(TicketAttachment)
        .where(TicketAttachment.ticket_id == ticket_id)
        .order_by(TicketAttachment.created_at.asc())
    ).all()

    return [
        {
            "id": item.id,
            "ticket_id": item.ticket_id,
            "original_name": item.original_name,
            "content_type": item.content_type,
            "file_size": item.file_size,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/{ticket_id}/attachments/{attachment_id}/download")
def download_ticket_attachment(
    ticket_id: int,
    attachment_id: int,
    db: DbSession,
    user: CurrentUser,
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    check_ticket_access(ticket, user)

    attachment = db.scalar(
        select(TicketAttachment).where(
            TicketAttachment.id == attachment_id,
            TicketAttachment.ticket_id == ticket_id,
        )
    )

    if attachment is None:
        raise HTTPException(404, "Attachment not found")

    file_path = UPLOAD_DIR / str(ticket_id) / attachment.stored_name

    if not file_path.is_file():
        raise HTTPException(404, "File not found on server")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=attachment.original_name,
        content_disposition_type="attachment",
    )
