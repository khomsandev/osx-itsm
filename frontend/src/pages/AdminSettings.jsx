import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderCog,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
} from "lucide-react";

import api from "../api/client";
import AppSidebar from "../components/AppSidebar";
import usePageTitle from "../hooks/usePageTitle";


const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "9px 13px",
  borderRadius: 8,
  border: "1px solid #dbe2ea",
  cursor: "pointer",
  fontWeight: 600,
};

export default function AdminSettings({
  user,
  onBackDashboard,
  onShowUsers,
  onLogout,
}) {
    
  const [settingsData, setSettingsData] = useState({
    statuses: [],
    transitions: [],
    settings: [],
    roles: [],
  });
  const [generalValues, setGeneralValues] = useState({});
  const [savingKey, setSavingKey] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const loadAdminSettings = useCallback(async () => {
    setWorkflowLoading(true);

    try {
      const response = await api.get("/admin/settings");
      const data = response.data;

      setSettingsData(data);
      setGeneralValues(
        Object.fromEntries(
          data.settings.map((item) => [
            item.setting_key,
            item.setting_value,
          ]),
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "โหลดการตั้งค่า Workflow ไม่สำเร็จ",
      );
    } finally {
      setWorkflowLoading(false);
    }
  }, []);

  async function saveStatus(status) {
    setSavingKey(`status:${status.status_code}`);
    setError("");
    setNotice("");

    try {
      await api.put(
        `/admin/settings/statuses/${status.status_code}`,
        {
          status_name: status.status_name,
          sort_order: Number(status.sort_order),
          is_active: status.is_active,
          is_terminal: status.is_terminal,
        },
      );

      setNotice(`บันทึกสถานะ ${status.status_code} แล้ว`);
      await loadAdminSettings();
    } catch (err) {
      setError(
        err.response?.data?.detail || "บันทึกสถานะไม่สำเร็จ",
      );
    } finally {
      setSavingKey("");
    }
  }

  async function saveTransition(transition, isActive) {
    const key = [
      transition.from_status,
      transition.to_status,
      transition.role,
    ].join(":");

    setSavingKey(key);
    setError("");
    setNotice("");

    try {
      await api.put("/admin/settings/transitions", {
        ...transition,
        is_active: isActive,
      });

      setNotice("บันทึกสิทธิ์การเปลี่ยนสถานะแล้ว");
      await loadAdminSettings();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "บันทึกสิทธิ์ Workflow ไม่สำเร็จ",
      );
    } finally {
      setSavingKey("");
    }
  }

  async function saveGeneralSetting(setting) {
    const key = setting.setting_key;

    setSavingKey(key);
    setError("");
    setNotice("");

    try {
      await api.put(`/admin/settings/general/${key}`, {
        setting_value: generalValues[key] ?? setting.setting_value,
      });

      setNotice(`บันทึก ${key} เรียบร้อยแล้ว`);
      await loadAdminSettings();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `บันทึก ${key} ไม่สำเร็จ`,
      );
    } finally {
      setSavingKey("");
    }
  }

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/categories/admin");
      setCategories(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "โหลดหมวดหมู่ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Admin และ API",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadCategories();
      loadAdminSettings();
    } else {
      setLoading(false);
      setError("หน้านี้อนุญาตเฉพาะผู้ดูแลระบบ (Admin)");
    }
  }, [user, loadCategories, loadAdminSettings]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setParentId("");
  }

  function startEdit(category) {
    setEditingId(category.id);
    setName(category.name);
    setParentId(category.parent_id ? String(category.parent_id) : "");
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      setError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    const payload = {
      name: cleanName,
      parent_id: parentId ? Number(parentId) : null,
    };

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingId !== null) {
        await api.patch(`/categories/${editingId}`, payload);
        setNotice("บันทึกการแก้ไขหมวดหมู่แล้ว");
      } else {
        await api.post("/categories", payload);
        setNotice("เพิ่มหมวดหมู่แล้ว");
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ Backend",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    const action = category.is_active ? "ปิด" : "เปิด";
    const confirmed = window.confirm(
      `ต้องการ${action}ใช้งานหมวดหมู่ "${category.name}" หรือไม่?`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.patch(`/categories/${category.id}`, {
        is_active: !category.is_active,
      });

      setNotice(
        category.is_active
          ? "ปิดใช้งานหมวดหมู่แล้ว"
          : "เปิดใช้งานหมวดหมู่แล้ว",
      );

      await loadCategories();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "เปลี่ยนสถานะหมวดหมู่ไม่สำเร็จ",
      );
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div style={{ padding: 32, color: "#b91c1c" }}>
        {error || "หน้านี้อนุญาตเฉพาะ Admin"}
        <button
          type="button"
          className="admin-button admin-back-button"
          onClick={onBackDashboard}
        >
          กลับ Dashboard
        </button>
      </div>
    );
  }

  const visibleCategories = categories.filter(
    (category) => showInactive || category.is_active,
  );

  const activeCount = categories.filter(
    (category) => category.is_active,
  ).length;

  usePageTitle("ตั้งค่าระบบ");
  return (
    <div className="dashboard-shell">
      <AppSidebar
        user={user}
        variant="admin"
        activeAdminSection="settings"
        onBackDashboard={onBackDashboard}
        onShowUsers={onShowUsers}
        onShowSettings={() => {}}
        onLogout={onLogout}
        />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <b>ตั้งค่าระบบ</b>
          </div>
          <div className="topbar-actions">
            <span className="system-status">
              <span /> Admin Settings
            </span>
            <div className="topbar-avatar">
              {(user.full_name || "A").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div>
              <span className="page-eyebrow">ADMINISTRATION</span>
              <h1>ตั้งค่าระบบ</h1>
              <p>จัดการข้อมูลพื้นฐานและการตั้งค่าของ IT Service Desk</p>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="error-banner"
              style={{ marginBottom: 16 }}
            >
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 12,
                marginBottom: 16,
                color: "#166534",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
              }}
            >
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <article className="surface-card" style={{ padding: 20 }}>
              <FolderCog size={23} color="#2563eb" />
              <p style={{ color: "#64748b", margin: "12px 0 4px" }}>
                หมวดหมู่ทั้งหมด
              </p>
              <strong style={{ fontSize: 28 }}>{categories.length}</strong>
            </article>

            <article className="surface-card" style={{ padding: 20 }}>
              <CheckCircle2 size={23} color="#16a34a" />
              <p style={{ color: "#64748b", margin: "12px 0 4px" }}>
                หมวดหมู่ที่เปิดใช้งาน
              </p>
              <strong style={{ fontSize: 28 }}>{activeCount}</strong>
            </article>

            <button
              type="button"
              className="surface-card"
              onClick={onShowUsers}
              style={{
                padding: 20,
                textAlign: "left",
                cursor: onShowUsers ? "pointer" : "default",
                color: "inherit",
                border: "1px solid #e2e8f0",
              }}
              disabled={!onShowUsers}
            >
              <Users size={23} color="#7c3aed" />
              <p style={{ color: "#64748b", margin: "12px 0 4px" }}>
                การดูแลบัญชี
              </p>
              <strong>จัดการผู้ใช้งาน</strong>
            </button>
          </section>

          <section
            className="surface-card"
            style={{ padding: 22, marginBottom: 20 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Settings size={21} color="#2563eb" />
              <div>
                <h2 style={{ margin: 0 }}>หมวดหมู่ Ticket</h2>
                <p style={{ margin: "5px 0 0", color: "#64748b" }}>
                  เพิ่ม แก้ไข และเปิด/ปิดหมวดหมู่ที่ใช้ในการแจ้งปัญหา
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <label>
                  <span
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontWeight: 600,
                    }}
                  >
                    ชื่อหมวดหมู่ *
                  </span>
                  <input
                    className="admin-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="เช่น Hardware, Software, Network"
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  <span
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontWeight: 600,
                    }}
                  >
                    หมวดหมู่หลัก (ไม่บังคับ)
                  </span>
                  <select
                    className="admin-input"
                    value={parentId}
                    onChange={(event) => setParentId(event.target.value)}
                  >
                    <option value="">ไม่มีหมวดหมู่หลัก</option>
                    {categories
                      .filter(
                        (category) =>
                          category.is_active &&
                          category.id !== editingId,
                      )
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button"
                >
                  {saving ? (
                    <RefreshCw size={16} className="spin" />
                  ) : editingId !== null ? (
                    <Save size={16} />
                  ) : (
                    <Plus size={17} />
                  )}
                  {saving
                    ? "กำลังบันทึก..."
                    : editingId !== null
                      ? "บันทึกการแก้ไข"
                      : "เพิ่มหมวดหมู่"}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={resetForm}
                  >
                    <X size={16} />
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="surface-card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>รายการหมวดหมู่</h2>
                <p style={{ color: "#64748b", margin: "5px 0 0" }}>
                  {visibleCategories.length} รายการ
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => setShowInactive(event.target.checked)}
                  />
                  แสดงรายการที่ปิดใช้งาน
                </label>

                <button
                  type="button"
                  className="admin-button"
                  onClick={loadCategories}
                  disabled={loading}
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "spin" : ""}
                  />
                  รีเฟรช
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "#64748b" }}>กำลังโหลดหมวดหมู่...</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ชื่อหมวดหมู่</th>
                      <th>หมวดหมู่หลัก</th>
                      <th>สถานะ</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCategories.map((category) => {
                      const parent = categories.find(
                        (item) => item.id === category.parent_id,
                      );

                      return (
                        <tr key={category.id}>
                          <td>{category.id}</td>
                          <td>
                            <strong>{category.name}</strong>
                          </td>
                          <td>{parent?.name || "-"}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "4px 9px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                color: category.is_active
                                  ? "#166534"
                                  : "#64748b",
                                background: category.is_active
                                  ? "#dcfce7"
                                  : "#f1f5f9",
                              }}
                            >
                              {category.is_active
                                ? "เปิดใช้งาน"
                                : "ปิดใช้งาน"}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <button
                                type="button"
                                className="admin-button"
                                onClick={() => startEdit(category)}
                              >
                                <Save size={14} />
                                แก้ไข
                              </button>
                              <button
                                type="button"
                                className={`admin-button ${
                                  category.is_active
                                    ? "admin-button-danger"
                                    : "admin-button-success"
                                }`}
                                onClick={() => toggleCategory(category)}
                              >
                                {category.is_active ? (
                                  <ToggleLeft size={16} />
                                ) : (
                                  <ToggleRight size={16} />
                                )}
                                {category.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {visibleCategories.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 28, textAlign: "center" }}>
                          ยังไม่มีหมวดหมู่ที่ตรงกับเงื่อนไข
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="surface-card"
            style={{ padding: 20, marginTop: 20 }}
          >
            <h2 style={{ marginTop: 0 }}>การตั้งค่าอื่น ๆ</h2>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              การตั้งค่า Workflow, สิทธิ์ตามสถานะ Ticket และค่าทั่วไป
              จะเพิ่มเมื่อมี API และฐานข้อมูลรองรับ เพื่อให้บันทึกการตั้งค่าได้จริง
            </p>
          </section>

          
          {/* Ticket Workflow */}
          <section
            className="surface-card"
            style={{ padding: 22, marginTop: 20 }}
          >
            <h2 style={{ marginTop: 0 }}>Ticket Workflow</h2>
            <p style={{ color: "#64748b" }}>
              จัดการชื่อ ลำดับ และการเปิดใช้งานสถานะ Ticket
            </p>

            {workflowLoading ? (
              <p>กำลังโหลด Workflow...</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>รหัสสถานะ</th>
                      <th>ชื่อแสดงผล</th>
                      <th>ลำดับ</th>
                      <th>สถานะสิ้นสุด</th>
                      <th>เปิดใช้งาน</th>
                      <th>บันทึก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsData.statuses.map((item) => (
                      <tr key={item.status_code}>
                        <td><strong>{item.status_code}</strong></td>
                        <td>
                          <input
                            className="admin-input"
                            value={item.status_name}
                            onChange={(event) =>
                              setSettingsData((prev) => ({
                                ...prev,
                                statuses: prev.statuses.map((s) =>
                                  s.status_code === item.status_code
                                    ? { ...s, status_name: event.target.value }
                                    : s,
                                ),
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="admin-input admin-sort-order"
                            value={item.sort_order}
                            onChange={(event) =>
                              setSettingsData((prev) => ({
                                ...prev,
                                statuses: prev.statuses.map((s) =>
                                  s.status_code === item.status_code
                                    ? { ...s, sort_order: event.target.value }
                                    : s,
                                ),
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.is_terminal}
                            onChange={(event) =>
                              setSettingsData((prev) => ({
                                ...prev,
                                statuses: prev.statuses.map((s) =>
                                  s.status_code === item.status_code
                                    ? { ...s, is_terminal: event.target.checked }
                                    : s,
                                ),
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            onChange={(event) =>
                              setSettingsData((prev) => ({
                                ...prev,
                                statuses: prev.statuses.map((s) =>
                                  s.status_code === item.status_code
                                    ? { ...s, is_active: event.target.checked }
                                    : s,
                                ),
                              }))
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={
                              savingKey === `status:${item.status_code}`
                            }
                            onClick={() => saveStatus(item)}
                          >
                            <Save size={15} />
                            บันทึก
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Status permissions */}
          <section
            className="surface-card"
            style={{ padding: 22, marginTop: 20 }}
          >
            <h2 style={{ marginTop: 0 }}>สิทธิ์การเปลี่ยนสถานะ Ticket</h2>
            <p style={{ color: "#64748b" }}>
              เปิดหรือปิดสิทธิ์ของแต่ละ Role สำหรับกฎ Workflow ที่มีอยู่
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>จากสถานะ</th>
                    <th>ไปสถานะ</th>
                    <th>Role</th>
                    <th>อนุญาต</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsData.transitions.map((item) => (
                    <tr
                      key={`${item.from_status}-${item.to_status}-${item.role}`}
                    >
                      <td>{item.from_status}</td>
                      <td>{item.to_status}</td>
                      <td>{item.role}</td>
                      <td>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            disabled={
                              savingKey === [
                                item.from_status,
                                item.to_status,
                                item.role,
                              ].join(":")
                            }
                            onChange={(event) =>
                              saveTransition(item, event.target.checked)
                            }
                          />
                          {item.is_active ? "อนุญาต" : "ไม่อนุญาต"}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ color: "#64748b", fontSize: 13 }}>
              หน้านี้แก้ไขกฎที่มีอยู่แล้ว ยังไม่รองรับการเพิ่มคู่สถานะใหม่
              หรือเพิ่ม Role ใหม่ในกฎโดยตรง
            </p>
          </section>

          {/* General Settings */}
          <section
            className="surface-card"
            style={{ padding: 22, marginTop: 20 }}
          >
            <h2 style={{ marginTop: 0 }}>General Settings</h2>
            <p style={{ color: "#64748b" }}>
              แก้ไขค่าทั่วไปที่จัดเก็บใน PostgreSQL
            </p>

            {settingsData.settings.map((item) => (
              <div
                key={item.setting_key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(150px, 1fr) minmax(180px, 2fr) auto",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <label>
                  <strong>{item.description || item.setting_key}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {item.setting_key}
                  </div>
                </label>

                <input
                  className="admin-input"
                  value={generalValues[item.setting_key] ?? ""}
                  onChange={(event) =>
                    setGeneralValues((prev) => ({
                      ...prev,
                      [item.setting_key]: event.target.value,
                    }))
                  }
                />

                <button
                  type="button"
                  className="primary-button"
                  disabled={savingKey === item.setting_key}
                  onClick={() => saveGeneralSetting(item)}
                >
                  <Save size={15} />
                  บันทึก
                </button>
              </div>
            ))}
          </section>


          <footer className="dashboard-footer">
            <span>OSX IT Service Desk</span>
            <span>Administration</span>
          </footer>
        </div>
      </main>
    </div>
  );
}