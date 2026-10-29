
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import api from "../api/client";
import usePageTitle from "../hooks/usePageTitle";

export default function ChangePassword({
  user,
  onPasswordChanged,
  onLogout,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  usePageTitle("เปลี่ยนรหัสผ่าน");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (newPassword.length > 128) {
      setError("รหัสผ่านใหม่ต้องไม่เกิน 128 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (currentPassword === newPassword) {
      setError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setMessage("เปลี่ยนรหัสผ่านสำเร็จ กำลังเข้าสู่ระบบ...");

      // ดึงข้อมูลผู้ใช้ใหม่หลังเปลี่ยนรหัสผ่านสำเร็จ
      const response = await api.get("/auth/me");

      onPasswordChanged(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-orb login-orb-blue" />
      <div className="login-orb login-orb-red" />

      <div className="login-layout">
        <section className="login-intro">
          <div className="brand-lockup">
            <div className="brand-icon">
              <KeyRound size={28} />
            </div>

            <div>
              <span className="brand-name">
                <b>OSX IT SERVICE</b>
              </span>
              <span className="brand-caption">
                PASSWORD SECURITY
              </span>
            </div>
          </div>

          <div className="intro-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              ACCOUNT SECURITY
            </span>

            <h1>
              ปกป้องบัญชีของคุณ
              <br />
              <span>ด้วยรหัสผ่านใหม่</span>
            </h1>

            <p>
              กรุณาเปลี่ยนรหัสผ่านก่อนเริ่มใช้งาน
              ระบบ IT Service Desk
            </p>
          </div>

          <div className="intro-features">
            <div className="intro-feature">
              <span className="feature-icon">
                <ShieldCheck size={19} />
              </span>
              <div>
                <b>เพิ่มความปลอดภัย</b>
                <small>ตั้งรหัสผ่านที่คาดเดาได้ยาก</small>
              </div>
            </div>
          </div>
        </section>

        <section className="login-card-wrap">
          <form onSubmit={handleSubmit} className="login-card">
            <div className="login-card-heading">
              <span className="card-kicker">
                CHANGE PASSWORD
              </span>

              <h2>เปลี่ยนรหัสผ่าน</h2>

              <p>
                ผู้ใช้งาน: {user?.username || ""}
              </p>
            </div>

            {error && (
              <div role="alert" className="login-error">
                <span className="error-mark">!</span>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div role="status" className="success-banner">
                {message}
              </div>
            )}

            <label className="field-label" htmlFor="currentPassword">
              รหัสผ่านปัจจุบัน
            </label>

            <div className="login-input-wrap">
              <LockKeyhole size={18} />
              <input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                required
                maxLength={128}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
              />
            </div>

            <label className="field-label password-label" htmlFor="newPassword">
              รหัสผ่านใหม่
            </label>

            <div className="login-input-wrap">
              <KeyRound size={18} />
              <input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                required
                minLength={8}
                maxLength={128}
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </div>

            <label
              className="field-label password-label"
              htmlFor="confirmPassword"
            >
              ยืนยันรหัสผ่านใหม่
            </label>

            <div className="login-input-wrap">
              <KeyRound size={18} />
              <input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
                minLength={8}
                maxLength={128}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() =>
                  setShowPasswords((value) => !value)
                }
                aria-label={
                  showPasswords
                    ? "ซ่อนรหัสผ่าน"
                    : "แสดงรหัสผ่าน"
                }
              >
                {showPasswords ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <p className="muted-text">
              รหัสผ่านใหม่ต้องมีความยาว 8–128 ตัวอักษร
            </p>

            <button
              disabled={loading}
              className="login-submit"
              type="submit"
            >
              <span>
                {loading
                  ? "กำลังเปลี่ยนรหัสผ่าน..."
                  : "ยืนยันเปลี่ยนรหัสผ่าน"}
              </span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onLogout}
              disabled={loading}
            >
              ออกจากระบบ
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
