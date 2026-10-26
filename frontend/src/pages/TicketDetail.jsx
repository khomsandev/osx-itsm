import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  History,
  MessageSquare,
  Paperclip,
  Download,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import api from "../api/client";
import AppSidebar from "../components/AppSidebar";
import usePageTitle from "../hooks/usePageTitle";

const STAFF = ["IT_SUPPORT", "IT_MANAGER", "ADMIN"];
const MANAGERS = ["IT_MANAGER", "ADMIN"];

const STATUS_LABELS = {
  NEW: "งานใหม่",
  ASSIGNED: "รับงานแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_USER: "รอข้อมูลจากผู้แจ้ง",
  WAITING_VENDOR: "รอผู้ให้บริการ",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิดงาน",
  CANCELLED: "ยกเลิก",
};

const STATUS_CLASSES = {
  NEW: "status-new",
  ASSIGNED: "status-assigned",
  IN_PROGRESS: "status-progress",
  WAITING_USER: "status-waiting",
  WAITING_VENDOR: "status-waiting",
  RESOLVED: "status-resolved",
  CLOSED: "status-closed",
  CANCELLED: "status-cancelled",
};

function getNextStatuses(ticket, role) {
  const transitions = {
    NEW: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["WAITING_USER", "WAITING_VENDOR", "RESOLVED"],
    WAITING_USER: ["IN_PROGRESS", "CANCELLED"],
    WAITING_VENDOR: ["IN_PROGRESS", "CANCELLED"],
    RESOLVED: ["IN_PROGRESS", "CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };

  return (transitions[ticket.status] || []).filter((status) => {
    if (["CLOSED", "CANCELLED"].includes(status)) {
      return MANAGERS.includes(role);
    }
    return STAFF.includes(role);
  });
}

export default function TicketDetail({
  ticketId,
  user,
  onBack,
  onUpdated,
  onCreateTicket,
}) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  usePageTitle(
    ticket?.ticket_no ? `Ticket ${ticket.ticket_no}` : "รายละเอียด Ticket"
  );

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ticketRes, commentsRes, historyRes, attachmentsRes] =
        await Promise.all([
          api.get(`/tickets/${ticketId}`),
          api.get(`/tickets/${ticketId}/comments`),
          api.get(`/tickets/${ticketId}/history`),
          api.get(`/tickets/${ticketId}/attachments`),
        ]);

      setTicket(ticketRes.data);
      setComments(commentsRes.data);
      setHistory(historyRes.data);
      setAttachments(attachmentsRes.data);
      setStatus(ticketRes.data.status);
    } catch (err) {
      setError(
        err.response?.data?.detail || "ไม่สามารถโหลดรายละเอียด Ticket ได้"
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function acceptTicket() {
    setSaving(true);
    setError("");

    try {
      await api.post(`/tickets/${ticketId}/assign-to-me`);
      await loadDetail();
      await onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.detail || "ไม่สามารถรับงานได้");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(event) {
    event.preventDefault();

    if (!status || status === ticket.status) {
      setError("กรุณาเลือกสถานะใหม่");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status,
        note: statusNote.trim() || null,
      });

      setStatusNote("");
      await loadDetail();
      await onUpdated?.();
    } catch (err) {
      setError(
        err.response?.data?.detail || "ไม่สามารถเปลี่ยนสถานะ Ticket ได้"
      );
    } finally {
      setSaving(false);
    }
  }

  async function downloadAttachment(attachment) {
    setError("");
    try {
      const response = await api.get(
        `/tickets/${ticketId}/attachments/${attachment.id}/download`,
        { responseType: "blob" }
      );
      const objectUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.original_name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.response?.data?.detail || "ดาวน์โหลดไฟล์ไม่สำเร็จ");
    }
  }

  async function addComment(event) {
    event.preventDefault();

    if (!comment.trim()) {
      setError("กรุณากรอกความคิดเห็น");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/tickets/${ticketId}/comments`, {
        comment: comment.trim(),
      });

      setComment("");
      await loadDetail();
    } catch (err) {
      setError(
        err.response?.data?.detail || "ไม่สามารถบันทึกความคิดเห็นได้"
      );
    } finally {
      setSaving(false);
    }
  }

  const sidebar = (
    <AppSidebar
      user={user}
      variant="dashboard"
      onBackDashboard={onBack}
      onCreateTicket={onCreateTicket || onBack}
    />
  );

  if (loading && !ticket) {
    return (
      <div className="dashboard-shell">
        {sidebar}
        <main className="dashboard-main">
          <div className="detail-shell">
            <div className="loading-panel">
              <RefreshCw className="spin" size={24} />
              กำลังโหลดรายละเอียด Ticket...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="dashboard-shell">
        {sidebar}
        <main className="dashboard-main">
          <div className="detail-shell">
            <button onClick={onBack} className="back-link">
              <ArrowLeft size={16} />
              กลับ Dashboard
            </button>
            <div role="alert" className="error-banner">
              {error || "ไม่พบ Ticket"}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const nextStatuses = getNextStatuses(ticket, user.role);
  const canManage = STAFF.includes(user.role);
  const canAccept =
    canManage &&
    ["NEW", "ASSIGNED"].includes(ticket.status) &&
    (!ticket.assigned_to || ticket.assigned_to === user.id);

  return (
    <div className="dashboard-shell">
      {sidebar}

      <main className="dashboard-main">
        <div className="detail-shell">
          <button onClick={onBack} className="back-link">
            <ArrowLeft size={17} />
            กลับ Dashboard
          </button>

          <header className="detail-hero">
            <div>
              <span className="page-eyebrow">TICKET DETAILS</span>
              <h1>{ticket.ticket_no}</h1>
              <p>{ticket.subject}</p>

              <div className="detail-meta">
                <span>
                  <Clock3 size={14} />
                  {ticket.created_at
                    ? new Date(ticket.created_at).toLocaleString("th-TH")
                    : "-"}
                </span>
                <span>
                  <UserRound size={14} />
                  {ticket.requester_name || `User ID: ${ticket.requester_id}`}
                </span>
              </div>
            </div>

            <span
              className={`status-pill ${
                STATUS_CLASSES[ticket.status] || "status-closed"
              }`}
            >
              <span />
              {STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </header>

          {error && (
            <div role="alert" className="error-banner">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-primary">
              {/* ข้อมูลปัญหา */}
              <section className="surface-card detail-section">
                <div className="section-heading">
                  <div className="section-heading-icon">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h2>ข้อมูลปัญหา</h2>
                    <p>รายละเอียดของคำขอรับบริการ</p>
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div>
                    <span>หัวข้อปัญหา</span>
                    <b>{ticket.subject}</b>
                  </div>

                  <div>
                    <span>ระดับความสำคัญ</span>
                    <b>
                      <span
                        className={`priority-pill priority-${(
                          ticket.priority || "MEDIUM"
                        ).toLowerCase()}`}
                      >
                        <span />
                        {ticket.priority || "MEDIUM"}
                      </span>
                    </b>
                  </div>

                  <div>
                    <span>ผู้แจ้ง</span>
                    <b>
                      {ticket.requester_name ||
                        `User ID: ${ticket.requester_id}`}
                    </b>
                  </div>

                  <div>
                    <span>ผู้รับผิดชอบ</span>
                    <b>
                      {ticket.assigned_to_name ||
                        (ticket.assigned_to
                          ? `User ID: ${ticket.assigned_to}`
                          : "ยังไม่มีผู้รับงาน")}
                    </b>
                  </div>

                  <div className="detail-description">
                    <span>รายละเอียดปัญหา</span>
                    <p>{ticket.description}</p>
                  </div>
                </div>
              </section>

              {/* ไฟล์แนบ */}
              <section className="surface-card action-section">
                <div className="section-heading">
                  <div className="section-heading-icon">
                    <Paperclip size={18} />
                  </div>
                  <div>
                    <h2>ไฟล์แนบ</h2>
                    <p>รูปภาพหรือเอกสารที่แนบมากับ Ticket นี้</p>
                  </div>
                </div>

                {attachments.length > 0 ? (
                  <div className="attachment-list">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        <div className="attachment-file-info">
                          <Paperclip size={16} className="attachment-icon" />
                          <span className="attachment-name">
                            {attachment.original_name}
                          </span>
                          <span className="attachment-size">
                            ({(Number(attachment.file_size || 0) / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => downloadAttachment(attachment)}
                        >
                          <Download size={15} /> ดาวน์โหลด
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-empty">ไม่มีไฟล์แนบใน Ticket นี้</p>
                )}
              </section>

              {/* รับงาน */}
              {canAccept && (
                <section className="surface-card action-section">
                  <div className="section-heading">
                    <div className="section-heading-icon red-icon">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h2>การรับงาน</h2>
                      <p>ยืนยันการรับผิดชอบ Ticket นี้</p>
                    </div>
                  </div>

                  <button
                    onClick={acceptTicket}
                    disabled={saving}
                    className="primary-button"
                  >
                    <CheckCircle2 size={17} />
                    {saving ? "กำลังบันทึก..." : "รับงานนี้"}
                  </button>
                </section>
              )}

              {/* อัปเดตสถานะ */}
              {canManage && nextStatuses.length > 0 && (
                <section className="surface-card action-section">
                  <div className="section-heading">
                    <div className="section-heading-icon">
                      <ActivityIcon />
                    </div>
                    <div>
                      <h2>อัปเดตสถานะงาน</h2>
                      <p>บันทึกความคืบหน้าในการแก้ไขปัญหา</p>
                    </div>
                  </div>

                  <form onSubmit={updateStatus} className="status-form">
                    <label className="styled-field">
                      <span>สถานะใหม่</span>
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        required
                      >
                        <option value={ticket.status}>
                          {STATUS_LABELS[ticket.status] || ticket.status} (ปัจจุบัน)
                        </option>
                        {nextStatuses.map((item) => (
                          <option key={item} value={item}>
                            {STATUS_LABELS[item] || item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="styled-field">
                      <span>หมายเหตุการดำเนินงาน</span>
                      <textarea
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        rows={3}
                        placeholder="เช่น ตรวจสอบอุปกรณ์แล้ว พบสาย LAN ชำรุด"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={saving || status === ticket.status}
                      className="primary-button"
                    >
                      <CheckCircle2 size={17} />
                      {saving ? "กำลังบันทึก..." : "บันทึกสถานะ"}
                    </button>
                  </form>
                </section>
              )}

              {/* ความคิดเห็นและวิธีแก้ไข */}
              <section className="surface-card action-section">
                <div className="section-heading">
                  <div className="section-heading-icon red-icon">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h2>ความคิดเห็นและวิธีแก้ไข</h2>
                    <p>บันทึกความคืบหน้าและแลกเปลี่ยนข้อมูล</p>
                  </div>
                </div>

                <form onSubmit={addComment} className="comment-form">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    maxLength={10000}
                    placeholder="บันทึกความคืบหน้า หรือวิธีแก้ไขปัญหา..."
                    required
                  />

                  <button
                    type="submit"
                    disabled={saving}
                    className="primary-button"
                  >
                    <Send size={16} />
                    {saving ? "กำลังบันทึก..." : "เพิ่มความคิดเห็น"}
                  </button>
                </form>

                <div className="comment-list">
                  {comments.map((item) => (
                    <article key={item.id} className="comment-item">
                      <div className="comment-avatar">
                        {(item.full_name || "U").slice(0, 1).toUpperCase()}
                      </div>

                      <div className="comment-body">
                        <div className="comment-author">
                          {item.full_name}
                          <span>
                            {new Date(item.created_at).toLocaleString("th-TH")}
                          </span>
                        </div>
                        <p>{item.comment}</p>
                      </div>
                    </article>
                  ))}

                  {comments.length === 0 && (
                    <p className="muted-empty">ยังไม่มีความคิดเห็น</p>
                  )}
                </div>
              </section>
            </div>

            {/* ประวัติการดำเนินงาน */}
            <aside className="detail-aside">
              <section className="surface-card history-card">
                <div className="section-heading">
                  <div className="section-heading-icon red-icon">
                    <History size={18} />
                  </div>
                  <div>
                    <h2>ประวัติการดำเนินงาน</h2>
                    <p>Timeline ของ Ticket</p>
                  </div>
                </div>

                <div className="history-timeline">
                  {history.map((item) => (
                    <article key={item.id} className="history-item">
                      <span className="timeline-dot" />
                      <b>
                        {item.old_status
                          ? STATUS_LABELS[item.old_status] || item.old_status
                          : "สร้าง Ticket"}{" "}
                        <span>→</span>{" "}
                        {STATUS_LABELS[item.new_status] || item.new_status}
                      </b>

                      <p>ผู้ดำเนินการ: {item.full_name}</p>

                      {item.note && (
                        <p className="history-note">{item.note}</p>
                      )}

                      <time>
                        {new Date(item.created_at).toLocaleString("th-TH")}
                      </time>
                    </article>
                  ))}

                  {history.length === 0 && (
                    <p className="muted-empty">ยังไม่มีประวัติการดำเนินงาน</p>
                  )}
                </div>

                <button
                  onClick={loadDetail}
                  className="secondary-button refresh-detail"
                  disabled={loading}
                >
                  <RefreshCw size={15} />
                  รีเฟรชรายละเอียด
                </button>
              </section>

              <div className="security-note">
                <ShieldCheck size={18} />
                <span>
                  <b>ข้อมูลการดำเนินงาน</b>
                  <small>
                    การเปลี่ยนสถานะและความคิดเห็นจะถูกบันทึกในประวัติ Ticket
                  </small>
                </span>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function ActivityIcon() {
  return <History size={18} />;
}