
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "../api/client";
import AppSidebar from "../components/AppSidebar";
import TicketDetail from "./TicketDetail";
import UserManagement from "./UserManagement";
import TicketCreatePage from "./TicketCreatePage";
import AdminSettings from "./AdminSettings";
import usePageTitle from "../hooks/usePageTitle";

const STATUS = {
  NEW: { label: "งานใหม่", className: "status-new" },
  ASSIGNED: { label: "รับงานแล้ว", className: "status-assigned" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", className: "status-progress" },
  WAITING_USER: { label: "รอข้อมูลผู้แจ้ง", className: "status-waiting" },
  WAITING_VENDOR: { label: "รอผู้ให้บริการ", className: "status-waiting" },
  RESOLVED: { label: "แก้ไขแล้ว", className: "status-resolved" },
  CLOSED: { label: "ปิดงาน", className: "status-closed" },
  CANCELLED: { label: "ยกเลิก", className: "status-cancelled" },
};

const ROLE_LABELS = {
  USER: "User",
  IT_SUPPORT: "IT Support",
  IT_MANAGER: "IT Manager",
  ADMIN: "Administrator",
};

export default function Dashboard({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalTickets = tickets.length;
  const totalPages = Math.max(1, Math.ceil(totalTickets / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = tickets.slice(startIndex, endIndex);

  usePageTitle(
    showSettings
      ? "ตั้งค่าระบบ"
      : showUsers
        ? "จัดการผู้ใช้งาน"
        : selectedTicketId !== null
          ? "รายละเอียด Ticket"
          : showCreate
            ? "แจ้งซ่อม"
            : "Dashboard"
  );

  const loadTickets = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/tickets");
      const data = response.data;

      // รองรับ API ที่ส่งข้อมูลเป็น Array
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "ไม่สามารถโหลดรายการ Ticket ได้"
      );
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // กลับไปหน้าที่ถูกต้องเมื่อจำนวน Ticket ลดลง
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function refreshTickets() {
    setRefreshing(true);
    setCurrentPage(1);

    try {
      await loadTickets();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreated() {
    setShowCreate(false);
    setCurrentPage(1);
    await loadTickets();
  }

  // Conditional Views for Sub-pages
  if (showSettings) {
    return (
      <AdminSettings
        user={user}
        onBackDashboard={() => setShowSettings(false)}
        onShowUsers={() => {
          setShowSettings(false);
          setShowUsers(true);
        }}
        onLogout={onLogout}
      />
    );
  }

  if (showUsers) {
    return (
      <UserManagement
        user={user}
        onBack={() => setShowUsers(false)}
        onShowSettings={() => {
          setShowUsers(false);
          setShowSettings(true);
        }}
        onLogout={onLogout}
      />
    );
  }

  if (selectedTicketId !== null) {
    return (
      <TicketDetail
        ticketId={selectedTicketId}
        user={user}
        onBack={() => setSelectedTicketId(null)}
        onUpdated={loadTickets}
      />
    );
  }

  if (showCreate) {
    return (
      <TicketCreatePage
        user={user}
        onBack={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    );
  }

  const counts = [
    {
      label: "Ticket ทั้งหมด",
      value: tickets.length,
      icon: ClipboardList,
      tone: "blue",
      hint: "รายการในระบบ",
    },
    {
      label: "งานใหม่",
      value: tickets.filter((t) => t.status === "NEW").length,
      icon: AlertCircle,
      tone: "red",
      hint: "รอดำเนินการ",
    },
    {
      label: "กำลังดำเนินการ",
      value: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      icon: Activity,
      tone: "navy",
      hint: "อยู่ระหว่างแก้ไข",
    },
    {
      label: "แก้ไขแล้ว",
      value: tickets.filter((t) =>
        ["RESOLVED", "CLOSED"].includes(t.status)
      ).length,
      icon: CheckCircle2,
      tone: "green",
      hint: "ดำเนินการสำเร็จ",
    },
  ];

  return (
    <div className="dashboard-shell">
      <AppSidebar
        user={user}
        onLogout={onLogout}
        onCreateTicket={() => setShowCreate(true)}
        onShowUsers={() => setShowUsers(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <b>Dashboard</b>
          </div>

          <div className="topbar-actions">
            <span className="system-status">
              <span /> ระบบพร้อมใช้งาน
            </span>

            <div className="topbar-avatar">
              {(user?.full_name || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Welcome Row */}
          <section className="welcome-row">
            <div>
              <span className="page-eyebrow">OVERVIEW</span>
              <h1>
                สวัสดี, {user?.full_name || "ผู้ใช้งาน"}{" "}
                <span className="wave">👋</span>
              </h1>
              <p>ภาพรวมการแจ้งปัญหาและการให้บริการ IT ของคุณ</p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} />
              แจ้งปัญหาใหม่
            </button>
          </section>

          {/* Stats Grid */}
          <section className="stats-grid">
            {counts.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className={`stat-card stat-${item.tone}`}
                >
                  <div className="stat-top">
                    <span>{item.label}</span>
                    <span className="stat-icon">
                      <Icon size={20} />
                    </span>
                  </div>

                  <div className="stat-value">{item.value}</div>

                  <div className="stat-hint">
                    <span className="hint-dot" />
                    {item.hint}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Ticket Table Section */}
          <section className="surface-card ticket-table-card">
            <div className="section-heading">
              <div className="section-heading-icon">
                <ClipboardList size={19} />
              </div>

              <div>
                <h2>รายการแจ้งซ่อม</h2>
                <p>ติดตามสถานะและรายละเอียดใบงานทั้งหมด</p>
              </div>

              <div className="table-heading-actions">
                <span className="record-count">
                  {totalTickets} รายการ
                </span>

                <button
                  type="button"
                  onClick={refreshTickets}
                  disabled={refreshing}
                  className="secondary-button"
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? "spin" : ""}
                  />
                  รีเฟรช
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="error-banner">
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            <div className="table-scroll">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Ticket No.</th>
                    <th>หัวข้อปัญหา</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>วันที่แจ้ง</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {paginatedTickets.map((ticket) => {
                    const status = STATUS[ticket.status] || {
                      label: ticket.status || "-",
                      className: "status-closed",
                    };

                    const priority = (
                      ticket.priority || "MEDIUM"
                    ).toUpperCase();

                    return (
                      <tr key={ticket.id}>
                        <td>
                          <span className="ticket-number">
                            {ticket.ticket_no}
                          </span>
                        </td>

                        <td>
                          <span className="ticket-subject">
                            {ticket.subject}
                          </span>
                          <small className="ticket-subtitle">
                            คำขอรับบริการ IT
                          </small>
                        </td>

                        <td>
                          <span
                            className={`priority-pill priority-${priority.toLowerCase()}`}
                          >
                            <span />
                            {priority}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-pill ${status.className}`}
                          >
                            <span />
                            {status.label}
                          </span>
                        </td>

                        <td>
                          <span className="date-cell">
                            <Clock3 size={14} />
                            {ticket.created_at
                              ? new Date(
                                  ticket.created_at
                                ).toLocaleString("th-TH", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "-"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() =>
                              setSelectedTicketId(ticket.id)
                            }
                          >
                            ดูรายละเอียด
                            <ArrowUpRight size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {totalTickets === 0 && !error && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-icon">
                            <ClipboardList size={27} />
                          </div>

                          <b>ยังไม่มีรายการแจ้งซ่อม</b>
                          <p>
                            เมื่อมีการสร้าง Ticket
                            รายการจะแสดงที่นี่
                          </p>

                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => setShowCreate(true)}
                          >
                            <Plus size={17} />
                            เปิด Ticket แรก
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {totalTickets > 0 && paginatedTickets.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          ไม่พบรายการในหน้านี้
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="table-footer">
              <span>
                แสดง {totalTickets === 0 ? 0 : startIndex + 1}
                {" - "}
                {Math.min(endIndex, totalTickets)}
                {" จาก "}
                {totalTickets} รายการ
              </span>

              <span>
                <ShieldCheck size={14} />
                ข้อมูลสำหรับผู้ใช้งานที่เข้าสู่ระบบ
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
              <div className="pagination-size">
                <label htmlFor="pageSize">แสดงต่อหน้า</label>

                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>

                <span>รายการ</span>
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="หน้าแรก"
                  aria-label="หน้าแรก"
                >
                  «
                </button>

                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  title="หน้าก่อนหน้า"
                  aria-label="หน้าก่อนหน้า"
                >
                  ‹
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                )
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                  )
                  .map((page, index, pages) => (
                    <span
                      key={page}
                      className="pagination-page-wrapper"
                    >
                      {index > 0 &&
                        pages[index - 1] !== page - 1 && (
                          <span className="pagination-ellipsis">
                            …
                          </span>
                        )}

                      <button
                        type="button"
                        className={`pagination-button ${
                          currentPage === page ? "active" : ""
                        }`}
                        aria-current={
                          currentPage === page ? "page" : undefined
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </span>
                  ))}

                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  title="หน้าถัดไป"
                  aria-label="หน้าถัดไป"
                >
                  ›
                </button>

                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="หน้าสุดท้าย"
                  aria-label="หน้าสุดท้าย"
                >
                  »
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="dashboard-footer">
            <span>
              © {new Date().getFullYear()} OSX IT Service Desk
            </span>
            <span>ระบบจัดการงานบริการเทคโนโลยีสารสนเทศ</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
