import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Headset, LockKeyhole, ShieldCheck, UserRound, Wrench } from "lucide-react";
import api from "../api/client";
import logo from "../assets/logo.png";
import usePageTitle from "../hooks/usePageTitle";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { username, password });
      sessionStorage.setItem("access_token", response.data.access_token);
      const userResponse = await api.get("/auth/me");
      onLogin(userResponse.data);
    } catch (err) {
      sessionStorage.removeItem("access_token");
      setError(err.response?.data?.detail || "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  usePageTitle("");

  return (
    <main className="login-shell">
      <div className="login-orb login-orb-blue" />
      <div className="login-orb login-orb-red" />
      <div className="login-layout">
        <section className="login-intro">
          <div className="brand-lockup">
            <div className="brand-icon"><img src={logo} alt="Company Logo" /></div>
            <div><span className="brand-name"><b>OSX IT SERVICE</b></span><span className="brand-caption">SERVICE DESK PORTAL</span></div>
          </div>
          <div className="intro-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> IT SUPPORT WORKSPACE</span>
            <h1>เทคโนโลยีที่พร้อม<br /><span>ดูแลทุกการทำงาน</span></h1>
            <p>แจ้งปัญหา ติดตามสถานะ และประสานงานกับทีม IT ได้จากศูนย์กลางเดียว</p>
          </div>
          <div className="intro-features">
            <div className="intro-feature"><span className="feature-icon"><Wrench size={19} /></span><div><b>แจ้งปัญหาได้ง่าย</b><small>สร้าง Ticket และติดตามงานได้ในที่เดียว</small></div></div>
            <div className="intro-feature"><span className="feature-icon feature-icon-red"><ShieldCheck size={19} /></span><div><b>จัดการอย่างเป็นระบบ</b><small>ตรวจสอบความคืบหน้าได้ทุกขั้นตอน</small></div></div>
          </div>
          <div className="login-footer-note">IT SERVICE DESK <span>•</span> INTERNAL PORTAL</div>
        </section>

        <section className="login-card-wrap">
          <form onSubmit={handleSubmit} className="login-card">
            <div className="mobile-brand-icon"><Headset size={25} /></div>
            <div className="login-card-heading">
              <span className="card-kicker">WELCOME BACK</span>
              <h2>เข้าสู่ระบบ</h2>
              <p>กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ</p>
            </div>

            {error && <div role="alert" className="login-error"><span className="error-mark">!</span><span>{error}</span></div>}

            <label className="field-label" htmlFor="username">Username</label>
            <div className="login-input-wrap">
              <UserRound size={18} />
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="กรอกชื่อผู้ใช้งาน" required />
            </div>

            <label className="field-label password-label" htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <LockKeyhole size={18} />
              <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required />
              <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            <button disabled={loading} className="login-submit" type="submit">
              <span>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</span><ArrowRight size={18} />
            </button>
            <div className="secure-note"><ShieldCheck size={15} /> ระบบสำหรับผู้ใช้งานภายในองค์กร</div>
          </form>
          <p className="login-copyright">© {new Date().getFullYear()} IT Service Desk · All rights reserved</p>
        </section>
      </div>
    </main>
  );
}
