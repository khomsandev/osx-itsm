import { useCallback, useEffect, useState } from "react";
import { 
  ArrowLeft, Check, CircleUserRound, LockKeyhole, Plus, 
  RefreshCw, Search, ShieldCheck, UserPlus, Users, X 
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
  role: "USER" 
};

export default function UserManagement({ user, onBack, onShowUsers, onShowSettings, onLogout }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showUsersState, setShowUsersState] = useState(false);
  const [showSettingsState, setShowSettingsState] = useState(false);

  // Navigate to settings view
  if (showSettingsState) {
    return (
      <AdminSettings
        user={user}
        onBackDashboard={() => setShowSettingsState(false)}
        onShowUsers={() => {
          setShowSettingsState(false);
          setShowUsersState(true);
        }}
        onLogout={onLogout}
      />
    );
  }

  // Navigate to users view
  if (showUsersState) {
    return (
      <UserManagement
        user={user}
        onBack={() => setShowUsersState(false)}
        onShowSettings={() => {
          setShowUsersState(false);
          setShowSettingsState(true);
        }}
        onLogout={onLogout}
      />
    );
  }

  const loadUsers = useCallback(async () => {
    try { 
      setError(""); 
      const response = await api.get("/users"); 
      setUsers(response.data); 
    } catch (err) { 
      setError(err.response?.data?.detail || "ไม่สามารถโหลดรายการผู้ใช้งานได้"); 
    }
  }, []);

  useEffect(() => { 
    loadUsers(); 
  }, [loadUsers]);

  function openCreateForm() { 
    setEditingUser(null); 
    setForm(EMPTY_FORM); 
    setError(""); 
    setMessage(""); 
    setShowForm(true); 
  }

  function openEditForm(target) { 
    setEditingUser(target); 
    setForm({ 
      username: target.username, 
      password: "", 
      full_name: target.full_name || "", 
      email: target.email || "", 
      department: target.department || "", 
      job_position: target.job_position || "", 
      role: target.role, 
      is_active: target.is_active 
    }); 
    setError(""); 
    setMessage(""); 
    setShowForm(true); 
  }

  function updateField(event) { 
    const { name, value, type, checked } = event.target; 
    setForm((current) => ({ 
      ...current, 
      [name]: type === "checkbox" ? checked : value 
    })); 
  }

  async function handleSubmit(event) {
    event.preventDefault(); 
    setError(""); 
    setMessage(""); 
    setLoading(true);

    try {
      if (editingUser) {
        const payload = { 
          full_name: form.full_name.trim(), 
          email: form.email.trim() || null, 
          department: form.department.trim() || null, 
          job_position: form.job_position.trim() || null, 
          role: form.role, 
          is_active: form.is_active 
        };
        if (form.password) payload.password = form.password;
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
          role: form.role 
        });
        setMessage("เพิ่มผู้ใช้เรียบร้อยแล้ว");
      }
      setShowForm(false); 
      setEditingUser(null); 
      setForm(EMPTY_FORM); 
      await loadUsers();
    } catch (err) { 
      setError(err.response?.data?.detail || "บันทึกข้อมูลไม่สำเร็จ"); 
    } finally { 
      setLoading(false); 
    }
  }

  const keyword = search.toLowerCase();
  const filteredUsers = users.filter((item) => 
    item.username.toLowerCase().includes(keyword) || 
    item.full_name.toLowerCase().includes(keyword) || 
    (item.email || "").toLowerCase().includes(keyword) || 
    item.role.toLowerCase().includes(keyword)
  );
  
  const activeCount = users.filter((item) => item.is_active).length;

  if (user.role !== "ADMIN") {
    return (
      <main className="detail-shell">
        <div className="error-banner">คุณไม่มีสิทธิ์เข้าถึงหน้าจัดการผู้ใช้งาน</div>
        <button onClick={onBack} className="secondary-button">
          <ArrowLeft size={16} /> กลับ Dashboard
        </button>
      </main>
    );
  }

  usePageTitle("จัดการผู้ใช้งาน");

  return (
    <div className="dashboard-shell admin-shell">
      <AppSidebar
        user={user}
        variant="admin"
        activeAdminSection="users"
        onBackDashboard={onBack}
        onShowUsers={() => setShowUsersState(true)}
        onShowSettings={() => setShowSettingsState(true)}
        onLogout={onLogout}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            Administration <span>/</span> <b>User Management</b>
          </div>
          <div className="topbar-actions">
            <span className="system-status"><span /> สิทธิ์ผู้ดูแลระบบ</span>
            <div className="topbar-avatar">
              {(user.full_name || "A").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Welcome Row */}
          <section className="welcome-row">
            <div>
              <span className="page-eyebrow">ACCESS CONTROL</span>
              <h1>จัดการผู้ใช้งาน</h1>
              <p>เพิ่มบัญชี กำหนดบทบาท และควบคุมสิทธิ์การเข้าใช้งานระบบ</p>
            </div>
            <button className="primary-button" onClick={openCreateForm}>
              <UserPlus size={18} /> เพิ่มผู้ใช้งาน
            </button>
          </section>

          {error && <div role="alert" className="error-banner">{error}</div>}
          {message && <div className="success-banner"><Check size={17} />{message}</div>}

          {/* Stats Grid */}
          <section className="stats-grid admin-stats">
            <article className="stat-card stat-blue">
              <div className="stat-top">
                <span>ผู้ใช้งานทั้งหมด</span>
                <span className="stat-icon"><Users size={20} /></span>
              </div>
              <div className="stat-value">{users.length}</div>
              <div className="stat-hint"><span className="hint-dot" />บัญชีในระบบ</div>
            </article>

            <article className="stat-card stat-green">
              <div className="stat-top">
                <span>บัญชีที่ใช้งาน</span>
                <span className="stat-icon"><Check size={20} /></span>
              </div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-hint"><span className="hint-dot" />Active accounts</div>
            </article>

            <article className="stat-card stat-red">
              <div className="stat-top">
                <span>บัญชีที่ปิดใช้งาน</span>
                <span className="stat-icon"><LockKeyhole size={20} /></span>
              </div>
              <div className="stat-value">{users.length - activeCount}</div>
              <div className="stat-hint"><span className="hint-dot" />Inactive accounts</div>
            </article>

            <article className="stat-card stat-navy">
              <div className="stat-top">
                <span>บทบาทที่รองรับ</span>
                <span className="stat-icon"><ShieldCheck size={20} /></span>
              </div>
              <div className="stat-value">{ROLES.length}</div>
              <div className="stat-hint"><span className="hint-dot" />Role types</div>
            </article>
          </section>

          {/* Form Modal / Section */}
          {showForm && (
            <section className="surface-card admin-form-card">
              <div className="section-heading">
                <div className="section-heading-icon"><CircleUserRound size={19} /></div>
                <div>
                  <h2>{editingUser ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</h2>
                  <p>กรอกข้อมูลบัญชีและกำหนดสิทธิ์การใช้งาน</p>
                </div>
                <button className="icon-button close-form" onClick={() => setShowForm(false)} aria-label="ปิด">
                  <X size={18} />
                </button>
              </div>

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
                    placeholder="ชื่อสำหรับเข้าสู่ระบบ" 
                  />
                </label>

                <label className="styled-field">
                  <span>{editingUser ? "รหัสผ่านใหม่" : "Password"} {!editingUser && <i>*</i>}</span>
                  <input 
                    type="password" 
                    name="password" 
                    value={form.password} 
                    onChange={updateField} 
                    required={!editingUser} 
                    minLength={8} 
                    maxLength={128} 
                    autoComplete="new-password" 
                    placeholder={editingUser ? "เว้นว่างหากไม่เปลี่ยน" : "อย่างน้อย 8 ตัวอักษร"} 
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
                    placeholder=""
                  />
                </label>

                <label className="styled-field">
                  <span>ตำแหน่งงาน</span>
                  <input
                    name="job_position"
                    value={form.job_position}
                    onChange={updateField}
                    maxLength={150}
                    placeholder=""
                  />
                </label>

                <label className="styled-field">
                  <span>Role / สิทธิ์ <i>*</i></span>
                  <select name="role" value={form.role} onChange={updateField}>
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>

                {editingUser && (
                  <label className="active-toggle">
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={form.is_active} 
                      onChange={updateField} 
                    />
                    <span>เปิดใช้งานบัญชีนี้</span>
                  </label>
                )}

                <div className="form-actions full-field">
                  <button type="submit" disabled={loading} className="primary-button">
                    <Check size={17} />
                    {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                    ยกเลิก
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Users Table Section */}
          <section className="surface-card ticket-table-card">
            <div className="section-heading">
              <div className="section-heading-icon"><Users size={19} /></div>
              <div>
                <h2>รายชื่อผู้ใช้งาน</h2>
                <p>ผู้ใช้งานทั้งหมด {filteredUsers.length} รายการ</p>
              </div>
              <div className="table-heading-actions">
                <button onClick={loadUsers} className="secondary-button">
                  <RefreshCw size={15} /> รีเฟรช
                </button>
              </div>
            </div>

            <div className="user-search-row">
              <div className="search-box">
                <Search size={17} />
                <input 
                  value={search} 
                  onChange={(event) => setSearch(event.target.value)} 
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
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            {(item.full_name || item.username || "U").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <b>{item.full_name}</b>
                            <small>{item.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.department || "ไม่ระบุ"}</td>
                      <td>{item.job_position || "ไม่ระบุ"}</td>
                      <td>{item.email || <span className="muted-text">ไม่ระบุ</span>}</td>
                      <td>
                        <span className={`role-pill role-${item.role.toLowerCase()}`}>
                          {ROLES.find((role) => role.value === item.role)?.label || item.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${item.is_active ? "status-resolved" : "status-cancelled"}`}>
                          <span />
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => openEditForm(item)} className="table-action">
                          แก้ไข <ArrowLeft className="edit-arrow" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-icon"><Users size={26} /></div>
                          <b>ไม่พบผู้ใช้งาน</b>
                          <p>ลองเปลี่ยนคำค้นหา หรือเพิ่มผู้ใช้งานใหม่</p>
                          <button className="primary-button" onClick={openCreateForm}>
                            <Plus size={16} /> เพิ่มผู้ใช้งาน
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer className="dashboard-footer">
            <span>© {new Date().getFullYear()} OSX IT Service Desk</span>
            <span>จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</span>
          </footer>
        </div>
      </main>
    </div>
  );
}