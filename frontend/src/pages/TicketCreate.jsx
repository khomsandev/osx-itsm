import { useEffect, useState } from "react";
import { AlertCircle, FileText, Send, Ticket, Wrench } from "lucide-react";
import api from "../api/client";

export default function TicketCreate({ onCreated }) {
  const [categories, setCategories] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => setError("โหลดหมวดหมู่ไม่สำเร็จ"));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await api.post("/tickets", { subject, description, category_id: Number(categoryId), priority });
      onCreated(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "บันทึก Ticket ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-page">
      <div className="form-page-heading"><div className="form-heading-icon"><Ticket size={22} /></div><div><span className="page-eyebrow">NEW REQUEST</span><h2>เปิดใบงานแจ้งปัญหา IT</h2><p>กรอกรายละเอียดเพื่อให้ทีม IT ตรวจสอบและดำเนินการ</p></div></div>
      {error && <div role="alert" className="error-banner"><AlertCircle size={17} />{error}</div>}
      <div className="form-grid">
        <label className="styled-field full-field"><span>หัวข้อปัญหา <i>*</i></span><div className="field-with-icon"><FileText size={17} /><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="เช่น ไม่สามารถใช้งานเครื่องพิมพ์ได้" required /></div></label>
        <label className="styled-field full-field"><span>รายละเอียดปัญหา <i>*</i></span><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={10000} placeholder="อธิบายอาการปัญหา สิ่งที่พบ หรือขั้นตอนที่เกิดปัญหา..." required /></label>
        <label className="styled-field"><span>ประเภทปัญหา <i>*</i></span><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required><option value="">เลือกหมวดหมู่</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="styled-field"><span>ระดับความสำคัญ</span><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="LOW">LOW — ต่ำ</option><option value="MEDIUM">MEDIUM — ปกติ</option><option value="HIGH">HIGH — สูง</option><option value="CRITICAL">CRITICAL — เร่งด่วน</option></select></label>
      </div>
      <div className="form-tip"><Wrench size={17} /><span>กรุณาระบุรายละเอียดให้ครบถ้วน เพื่อช่วยให้ทีม IT แก้ไขปัญหาได้รวดเร็วขึ้น</span></div>
      <div className="form-actions"><button type="submit" disabled={saving} className="primary-button"><Send size={17} />{saving ? "กำลังส่งใบงาน..." : "ส่งใบงานแจ้งซ่อม"}</button></div>
    </form>
  );
}
