
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import TicketCreate from "./TicketCreate";
import usePageTitle from "../hooks/usePageTitle";

export default function TicketCreatePage({
  user,
  onBack,
  onCreated,
}) {
  usePageTitle("แจ้งซ่อม / เปิด Ticket");

  return (
    <div className="dashboard-shell">
      <AppSidebar
        user={user}
        variant="dashboard"
        onBackDashboard={onBack}
        onCreateTicket={() => {}}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <b>แจ้งซ่อม / เปิด Ticket</b>
          </div>

          <div className="topbar-actions">
            <span className="system-status">
              <span />
              ระบบพร้อมใช้งาน
            </span>
            <div className="topbar-avatar">
              {(user?.full_name || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div>
              <span className="page-eyebrow">NEW SERVICE REQUEST</span>
              <h1>แจ้งปัญหาใหม่</h1>
              <p>
                กรอกรายละเอียดปัญหาเพื่อส่งคำขอให้ทีม IT
                ตรวจสอบและดำเนินการ
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={onBack}
            >
              <ArrowLeft size={17} />
              กลับ Dashboard
            </button>
          </section>

          <section className="surface-card create-ticket-panel">
            <div className="section-heading">
              <div className="section-heading-icon">
                <ClipboardList size={19} />
              </div>

              <div>
                <h2>รายละเอียด Ticket</h2>
                <p>กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึก</p>
              </div>

            </div>

            <TicketCreate onCreated={onCreated} />
          </section>

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
