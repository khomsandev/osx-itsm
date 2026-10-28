import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  Plus,
  Users,
  Settings,
} from "lucide-react";
import logo from "../assets/logo.png";

const ROLE_LABELS = {
  USER: "User",
  IT_SUPPORT: "IT Support",
  IT_MANAGER: "IT Manager",
  ADMIN: "Administrator",
};

export default function AppSidebar({
  user,
  onLogout,
  onCreateTicket,
  onShowUsers,
  onShowSettings,
  activeAdminSection = "users",
  onBackDashboard,
  variant = "dashboard",
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isAdminPage = variant === "admin";

  const displayName =
    user?.full_name || user?.username || "U";

  const avatar = displayName.slice(0, 1).toUpperCase();

  return (
    <aside
      className={`app-sidebar ${collapsed ? "collapsed" : ""}`}
      aria-label="เมนูหลัก"
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <img src={logo} alt="Company Logo" />
        </div>

        <div className="sidebar-brand-text">
          <b>OSX IT</b>
          <span>
            {isAdminPage ? "ADMINISTRATION" : "SERVICE DESK"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight size={19} />
        ) : (
          <ChevronLeft size={19} />
        )}
      </button>

      <div className="sidebar-section-label">
        {isAdminPage ? "ADMIN TOOLS" : "WORKSPACE"}
      </div>

      <nav className="sidebar-navigation">
        {isAdminPage ? (
          <>
            <button
              type="button"
              className="sidebar-link"
              onClick={onBackDashboard}
              title="กลับ Dashboard"
            >
              <ArrowLeft size={18} />
              <span className="sidebar-label">กลับ Dashboard</span>
            </button>

            <button
              type="button"
              className={`sidebar-link ${
                activeAdminSection === "users" ? "active" : ""
              }`}
              onClick={onShowUsers}
              title="จัดการผู้ใช้งาน"
            >
              <Users size={18} />
              <span className="sidebar-label">จัดการผู้ใช้งาน</span>
              {activeAdminSection === "users" && (
                <span className="sidebar-link-dot" />
              )}
            </button>

            <button
              type="button"
              className={`sidebar-link ${
                activeAdminSection === "settings" ? "active" : ""
              }`}
              onClick={onShowSettings}
              title="ตั้งค่าระบบ"
            >
              <Settings size={18} />
              <span className="sidebar-label">ตั้งค่าระบบ</span>
              {activeAdminSection === "settings" && (
                <span className="sidebar-link-dot" />
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="sidebar-link active"
              title="Dashboard"
              onClick={() => {
                if (onBackDashboard) {
                  onBackDashboard();
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <ClipboardList size={18} />
              <span className="sidebar-label">Dashboard</span>
              <span className="sidebar-link-dot" />
            </button>

            <button
              type="button"
              className="sidebar-link"
              title="แจ้งซ่อม / เปิด Ticket"
              onClick={onCreateTicket}
            >
              <Plus size={18} />
              <span className="sidebar-label">แจ้งซ่อม / เปิด Ticket</span>
            </button>

            {user?.role === "ADMIN" && onShowUsers && (
              <button
                type="button"
                className="sidebar-link"
                title="จัดการผู้ใช้งาน"
                onClick={onShowUsers}
              >
                <Users size={18} />
                <span className="sidebar-label">จัดการผู้ใช้งาน</span>
              </button>
            )}

            {user?.role === "ADMIN" && onShowSettings && (
              <button
                type="button"
                className="sidebar-link"
                title="ตั้งค่าระบบ"
                onClick={onShowSettings}
              >
                <Settings size={18} />
                <span className="sidebar-label">ตั้งค่าระบบ</span>
              </button>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="avatar" title={displayName}>
            {avatar}
          </div>

          <div className="sidebar-user-info">
            <b title={displayName}>{displayName}</b>
            <span>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="icon-button logout-icon"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
