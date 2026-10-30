import { useCallback, useEffect, useRef, useState } from "react";
import {Check, CircleUserRound, LockKeyhole, Plus, RefreshCw, Search,ShieldCheck,UserPlus,
  Users,X,FileUp,KeyRound,UserRoundPen,Download
} from "lucide-react";
import api from "../api/client";
import AppSidebar from "../components/AppSidebar";
import usePageTitle from "../hooks/usePageTitle";

const ROLES = [
  { value: "USER", label: "User" },
  { value: "IT_SUPPORT", label: "IT Support" },
  { value: "IT_MANAGER", label: "IT Manager" },
  { value: "ADMIN", label: "Admin" },
];

const EMPTY_FORM = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  department: "",
  job_position: "",
  role: "USER",
  is_active: true,
};

export default function UserManagement({
  user,
  onBack,
  onShowUsers,
  onShowSettings,
  onLogout,
}) {


  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const importFileRef = useRef(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadUsers = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "ไม่สามารถโหลดรายการผู้ใช้งานได้"
      );
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ปรับหน้าปัจจุบันเมื่อจำนวนผู้ใช้หลังค้นหาลดลง
  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(
        users.filter((item) =>
          [
            item.username,
            item.full_name,
            item.email,
            item.role,
            item.department,
            item.job_position,
          ].some((value) =>
            String(value || "").toLowerCase().includes(search.toLowerCase().trim())
          )
        ).length / itemsPerPage
      )
    );

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [users, search, itemsPerPage, currentPage]);

  function openCreateForm() {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(target) {
    setEditingUser(target);
    setForm({
      username: target.username || "",
      password: "",
      full_name: target.full_name || "",
      email: target.email || "",
      department: target.department || "",
      job_position: target.job_position || "",
      role: target.role || "USER",
      is_active: Boolean(target.is_active),
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (loading) return;

    setShowForm(false);
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  function openResetPasswordModal(target) {
    setResetUser(target);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setError("");
    setMessage("");
    setShowResetModal(true);
  }

  function closeResetPasswordModal() {
    if (loading) return;

    setShowResetModal(false);
    setResetUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (form.password && (form.password.length < 8 || form.password.length > 128)) {
      setError("Password ต้องมีความยาว 8-128 ตัวอักษร");
      return;
    }

    setLoading(true);

    try {
      if (editingUser) {
        const payload = {
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          department: form.department.trim() || null,
          job_position: form.job_position.trim() || null,
          role: form.role,
          is_active: Boolean(form.is_active),
        };

        if (form.password) {
          payload.password = form.password;
        }

        await api.patch(`/users/${editingUser.id}`, payload);
        setMessage("บันทึกการแก้ไขผู้ใช้เรียบร้อยแล้ว");
      } else {
        await api.post("/users", {
          username: form.username.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          department: form.department.trim() || null,
          job_position: form.job_position.trim() || null,
          role: form.role,
        });

        setMessage("เพิ่มผู้ใช้เรียบร้อยแล้ว");
      }

      setShowForm(false);
      setEditingUser(null);
      setForm({ ...EMPTY_FORM });
      setCurrentPage(1);
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "บันทึกข้อมูลไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "csv"].includes(extension)) {
      setError("รองรับเฉพาะไฟล์ Excel (.xlsx) และ CSV (.csv)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันนำเข้าผู้ใช้งานจากไฟล์ "${file.name}" หรือไม่?\n\n` +
        "ระบบจะข้าม Username ที่มีอยู่แล้ว และไม่แก้ไขข้อมูลเดิม"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setImportResult(null);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/users/import", formData);
      const result = response.data;

      setImportResult(result);
      setMessage(
        `นำเข้าเสร็จสิ้น: สำเร็จ ${result.created} รายการ, ` +
          `ข้าม ${result.skipped} รายการ, ` +
          `ผิดพลาด ${result.failed} รายการ`
      );

      setCurrentPage(1);
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "นำเข้าไฟล์ไม่สำเร็จ กรุณาตรวจสอบไฟล์และลองอีกครั้ง"
      );
    } finally {
      setImportLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetError("");
    setError("");
    setMessage("");

    if (newPassword.length < 8 || newPassword.length > 128) {
      setResetError("Password ต้องมีความยาว 8-128 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    if (!resetUser) return;

    setLoading(true);

    try {
      await api.post(`/users/${resetUser.id}/reset-password`, {
        password: newPassword,
      });

      setMessage(
        `Reset Password ของ ${resetUser.username} เรียบร้อยแล้ว`
      );

      setShowResetModal(false);
      setResetUser(null);
      setNewPassword("");
      setConfirmPassword("");

      await loadUsers();
    } catch (err) {
      setResetError(
        err.response?.data?.detail ||
          "Reset Password ไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  }

  const keyword = search.toLowerCase().trim();

  const filteredUsers = users.filter((item) =>
    [
      item.username,
      item.full_name,
      item.email,
      item.role,
      item.department,
      item.job_position,
    ].some((value) =>
      String(value || "").toLowerCase().includes(keyword)
    )
  );

  const activeCount = users.filter((item) => item.is_active).length;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  )
  
  usePageTitle("จัดการผู้ใช้งาน");

  return (
    <div className="dashboard-shell admin-shell">
      <AppSidebar
        user={user}
        variant="admin"
        activeAdminSection="users"
        onBackDashboard={onBack}
        onShowUsers={onShowUsers}
        onShowSettings={onShowSettings}
        onLogout={onLogout}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            Administration <span>/</span> <b>User Management</b>
          </div>

          <div className="topbar-actions">
            <span className="system-status">
              <span /> สิทธิ์ผู้ดูแลระบบ
            </span>
            <div className="topbar-avatar">
              {(user?.full_name || "A").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div>
              <span className="page-eyebrow">ACCESS CONTROL</span>
              <h1>จัดการผู้ใช้งาน</h1>
              <p>
                เพิ่มบัญชี กำหนดบทบาท และควบคุมสิทธิ์การเข้าใช้งานระบบ
              </p>
            </div>

            <div className="form-actions">
              <a
                href="/user_import_template.xlsx"
                download
                className="secondary-button"
              >
                <Download size={16} />
                Download Excel Template
              </a>

              <a
                href="/user_import_template.csv"
                download
                className="secondary-button"
              >
                <Download size={16} />
                Download CSV Template
              </a>

              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleImportFile}
                disabled={importLoading}
                hidden
              />

              <button
                type="button"
                className="secondary-button"
                onClick={() => importFileRef.current?.click()}
                disabled={importLoading}
              >
                <FileUp size={17} />
                {importLoading ? "กำลังนำเข้า..." : "Import Excel / CSV"}
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={openCreateForm}
              >
                <UserPlus size={18} />
                เพิ่มผู้ใช้งาน
              </button>
            </div>
          </section>

          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}

          {message && (
            <div className="success-banner">
              <Check size={17} />
              {message}
            </div>
          )}

          {importResult && (
            <section className="surface-card" style={{ marginBottom: 16 }}>
              <h3>ผลการนำเข้าผู้ใช้งาน</h3>
              <p>
                ทั้งหมด {importResult.total} รายการ
                {" · "}สำเร็จ {importResult.created}
                {" · "}ข้าม {importResult.skipped}
                {" · "}ผิดพลาด {importResult.failed}
              </p>

              <div className="table-scroll">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>แถว</th>
                      <th>Username</th>
                      <th>ผลลัพธ์</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(importResult.results || []).map((item, index) => (
                      <tr key={`${item.row}-${index}`}>
                        <td>{item.row}</td>
                        <td>{item.username || "-"}</td>
                        <td>
                          {item.status === "created"
                            ? "สำเร็จ"
                            : item.status === "skipped"
                              ? "ข้าม"
                              : "ผิดพลาด"}
                        </td>
                        <td>{item.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="stats-grid admin-stats">
            <article className="stat-card stat-blue">
              <div className="stat-top">
                <span>ผู้ใช้งานทั้งหมด</span>
                <span className="stat-icon"><Users size={20} /></span>
              </div>
              <div className="stat-value">{users.length}</div>
              <div className="stat-hint">
                <span className="hint-dot" />บัญชีในระบบ
              </div>
            </article>

            <article className="stat-card stat-green">
              <div className="stat-top">
                <span>บัญชีที่ใช้งาน</span>
                <span className="stat-icon"><Check size={20} /></span>
              </div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-hint">
                <span className="hint-dot" />Active accounts
              </div>
            </article>

            <article className="stat-card stat-red">
              <div className="stat-top">
                <span>บัญชีที่ปิดใช้งาน</span>
                <span className="stat-icon"><LockKeyhole size={20} /></span>
              </div>
              <div className="stat-value">{users.length - activeCount}</div>
              <div className="stat-hint">
                <span className="hint-dot" />Inactive accounts
              </div>
            </article>

            <article className="stat-card stat-navy">
              <div className="stat-top">
                <span>บทบาทที่รองรับ</span>
                <span className="stat-icon"><ShieldCheck size={20} /></span>
              </div>
              <div className="stat-value">{ROLES.length}</div>
              <div className="stat-hint">
                <span className="hint-dot" />Role types
              </div>
            </article>
          </section>

          {/* Modal เพิ่ม / แก้ไขผู้ใช้งาน */}
          {showForm && (
            <div
              className="modal-overlay"
              onClick={closeForm}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background: "rgba(15, 23, 42, 0.55)",
                overflowY: "auto",
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-form-title"
                className="surface-card admin-form-card modal-content"
                onClick={(event) => event.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 760,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  margin: "auto",
                }}
              >
                <div className="section-heading">
                  <div className="section-heading-icon">
                    <CircleUserRound size={19} />
                  </div>

                  <div>
                    <h2 id="user-form-title">
                      {editingUser ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
                    </h2>
                    <p>กรอกข้อมูลบัญชีและกำหนดสิทธิ์การใช้งาน</p>
                  </div>

                  <button
                    type="button"
                    className="icon-button close-form"
                    onClick={closeForm}
                    disabled={loading}
                    aria-label="ปิด"
                  >
                    <X size={18} />
                  </button>
                </div>

                {error && (
                  <p role="alert" className="error-message">{error}</p>
                )}

                <form onSubmit={handleSubmit} className="form-grid">
                  <label className="styled-field">
                    <span>Username <i>*</i></span>
                    <input
                      name="username"
                      value={form.username}
                      onChange={updateField}
                      disabled={!!editingUser}
                      required
                      minLength={3}
                      maxLength={100}
                      autoComplete="username"
                      placeholder="ชื่อสำหรับเข้าสู่ระบบ"
                    />
                  </label>

                  <label className="styled-field">
                    <span>
                      {editingUser ? "รหัสผ่านใหม่" : "Password"}
                      {!editingUser && <i>*</i>}
                    </span>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={updateField}
                      required={!editingUser}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder={
                        editingUser
                          ? "เว้นว่างหากไม่เปลี่ยน"
                          : "อย่างน้อย 8 ตัวอักษร"
                      }
                    />
                  </label>

                  <label className="styled-field">
                    <span>ชื่อผู้ใช้งาน <i>*</i></span>
                    <input
                      name="full_name"
                      value={form.full_name}
                      onChange={updateField}
                      required
                      maxLength={200}
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </label>

                  <label className="styled-field">
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="name@company.com"
                    />
                  </label>

                  <label className="styled-field">
                    <span>ฝ่าย / แผนก</span>
                    <input
                      name="department"
                      value={form.department}
                      onChange={updateField}
                      maxLength={150}
                      placeholder="ระบุฝ่ายหรือแผนก"
                    />
                  </label>

                  <label className="styled-field">
                    <span>ตำแหน่งงาน</span>
                    <input
                      name="job_position"
                      value={form.job_position}
                      onChange={updateField}
                      maxLength={150}
                      placeholder="ระบุตำแหน่งงาน"
                    />
                  </label>

                  <label className="styled-field">
                    <span>Role / สิทธิ์ <i>*</i></span>
                    <select
                      name="role"
                      value={form.role}
                      onChange={updateField}
                      required
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {editingUser && (
                    <label className="active-toggle">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={Boolean(form.is_active)}
                        onChange={updateField}
                      />
                      <span>เปิดใช้งานบัญชีนี้</span>
                    </label>
                  )}

                  <div className="form-actions full-field">
                    <button
                      type="submit"
                      disabled={loading}
                      className="primary-button"
                    >
                      <Check size={17} />
                      {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={closeForm}
                      disabled={loading}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {/* ตารางผู้ใช้งาน */}
          <section className="surface-card ticket-table-card">
            <div className="section-heading">
              <div className="section-heading-icon"><Users size={19} /></div>
              <div>
                <h2>รายชื่อผู้ใช้งาน</h2>
                <p>ผู้ใช้งานทั้งหมด {filteredUsers.length} รายการ</p>
              </div>
              <div className="table-heading-actions">
                <button
                  type="button"
                  onClick={loadUsers}
                  className="secondary-button"
                  disabled={loading}
                >
                  <RefreshCw size={15} /> รีเฟรช
                </button>
              </div>
            </div>

            <div className="user-search-row">
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหาชื่อ, Username, Email หรือ Role"
                />
              </div>
              <span className="record-count">{filteredUsers.length} รายการ</span>
            </div>

            <div className="table-scroll">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>ผู้ใช้งาน</th>
                    <th>แผนก</th>
                    <th>ตำแหน่งงาน</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            {(item.full_name || item.username || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                          <div>
                            <b>{item.full_name || "-"}</b>
                            <small>{item.username || "-"}</small>
                          </div>
                        </div>
                      </td>

                      <td>{item.department || "ไม่ระบุ"}</td>
                      <td>{item.job_position || "ไม่ระบุ"}</td>
                      <td>{item.email || <span className="muted-text">ไม่ระบุ</span>}</td>

                      <td>
                        <span className={`role-pill role-${(item.role || "").toLowerCase()}`}>
                          {ROLES.find((role) => role.value === item.role)?.label || item.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${
                            item.is_active ? "status-resolved" : "status-cancelled"
                          }`}
                        >
                          <span />
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="form-actions">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="table-action"
                          >
                            <UserRoundPen size={14} />
                            แก้ไข
                          </button>

                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(item)}
                            className="table-action"
                          >
                            <KeyRound size={14} />
                            Reset Password
                          </button>
                        </div>

                        {item.must_change_password && (
                          <small className="muted-text">
                            รอเปลี่ยน Password
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}

                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-icon"><Users size={26} /></div>
                          <b>ไม่พบผู้ใช้งาน</b>
                          <p>ลองเปลี่ยนคำค้นหา หรือเพิ่มผู้ใช้งานใหม่</p>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={openCreateForm}
                          >
                            <Plus size={16} /> เพิ่มผู้ใช้งาน
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="table-footer">
                <span>
                  แสดง {filteredUsers.length === 0 ? 0 : startIndex + 1}
                  {" - "}
                  {Math.min(startIndex + itemsPerPage, filteredUsers.length)}
                  {" จาก "}
                  {filteredUsers.length} รายการ
                </span>
              </div>

              <div className="pagination">
                <div className="pagination-size">
                  <label htmlFor="itemsPerPage">แสดงต่อหน้า</label>

                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
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
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="หน้าแรก"
                    aria-label="หน้าแรก"
                  >
                    «
                  </button>

                  <button
                    type="button"
                    className="pagination-button"
                    disabled={safeCurrentPage === 1}
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
                        Math.abs(page - safeCurrentPage) <= 1
                    )
                    .map((page, index, pages) => (
                      <span
                        key={page}
                        className="pagination-page-wrapper"
                      >
                        {index > 0 &&
                          pages[index - 1] !== page - 1 && (
                            <span className="pagination-ellipsis">…</span>
                          )}

                        <button
                          type="button"
                          className={`pagination-button ${
                            safeCurrentPage === page ? "active" : ""
                          }`}
                          aria-current={
                            safeCurrentPage === page ? "page" : undefined
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
                    disabled={safeCurrentPage >= totalPages}
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
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="หน้าสุดท้าย"
                    aria-label="หน้าสุดท้าย"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </section>

          <footer className="dashboard-footer">
            <span>© {new Date().getFullYear()} OSX IT Service Desk</span>
            <span>จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</span>
          </footer>
        </div>

        {/* Modal Reset Password */}
        {showResetModal && resetUser && (
          <div
            className="modal-overlay"
            onClick={closeResetPasswordModal}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              background: "rgba(15, 23, 42, 0.55)",
              overflowY: "auto",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-password-title"
              className="surface-card admin-form-card modal-content"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                margin: "auto",
              }}
            >
              <div className="section-heading">
                <div className="section-heading-icon">
                  <KeyRound size={19} />
                </div>
                <div>
                  <h2 id="reset-password-title">Reset Password</h2>
                  <p>ผู้ใช้งาน: {resetUser.username}</p>
                </div>
                <button
                  type="button"
                  className="icon-button close-form"
                  onClick={closeResetPasswordModal}
                  disabled={loading}
                  aria-label="ปิด"
                >
                  <X size={18} />
                </button>
              </div>

              {resetError && (
                <p role="alert" className="error-message">{resetError}</p>
              )}

              <form onSubmit={handleResetPassword} className="form-grid">
                <label className="styled-field full-field">
                  <span>รหัสผ่านใหม่ <i>*</i></span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                  />
                </label>

                <label className="styled-field full-field">
                  <span>ยืนยันรหัสผ่านใหม่ <i>*</i></span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                  />
                </label>

                <div className="form-actions full-field">
                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-button"
                  >
                    <Check size={17} />
                    {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
                  </button>

                  <button
                    type="button"
                    onClick={closeResetPasswordModal}
                    disabled={loading}
                    className="secondary-button"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
