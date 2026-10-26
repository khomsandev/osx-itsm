import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileText,
  Paperclip,
  Send,
  Ticket,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import api from "../api/client";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".xlsx", ".txt"];

function getExtension(filename) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketCreate({ onCreated }) {
  const [categories, setCategories] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setError("โหลดหมวดหมู่ไม่สำเร็จ"));
  }, []);

  function handleFilesChange(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const nextFiles = [...files];
    for (const file of selected) {
      if (nextFiles.length >= MAX_FILES) {
        setError(`แนบไฟล์ได้ไม่เกิน ${MAX_FILES} ไฟล์ต่อ Ticket`);
        break;
      }
      const extension = getExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError(`ไฟล์ ${file.name} เป็นชนิดที่ไม่รองรับ`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`ไฟล์ ${file.name} มีขนาดเกิน 10 MB`);
        continue;
      }
      if (nextFiles.some((item) => item.name === file.name && item.size === file.size)) {
        continue;
      }
      nextFiles.push(file);
    }
    setFiles(nextFiles);
  }

  function removeFile(indexToRemove) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      // สร้าง Ticket ก่อน
      const response = await api.post("/tickets", {
        subject,
        description,
        category_id: Number(categoryId),
        priority,
      });

      const ticketId = response.data.id;

      // ส่งไฟล์แนบเมื่อผู้ใช้เลือกไฟล์
      if (files.length > 0) {
        const formData = new FormData();

        files.forEach((file) => {
          formData.append("files", file);
        });

        await api.post(
          `/tickets/${ticketId}/attachments`,
          formData
        );
      }

      onCreated(response.data);
    } catch (err) {
      console.error("Ticket upload error:", err.response?.data || err);

      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "บันทึก Ticket หรืออัปโหลดไฟล์ไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-page">
      <div className="form-page-heading">
        <div className="form-heading-icon"><Ticket size={22} /></div>
        <div>
          <span className="page-eyebrow">NEW REQUEST</span>
          <h2>เปิดใบงานแจ้งปัญหา IT</h2>
          <p>กรอกรายละเอียดเพื่อให้ทีม IT ตรวจสอบและดำเนินการ</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="error-banner">
          <AlertCircle size={17} /> {error}
        </div>
      )}

      <div className="form-grid">
        <label className="styled-field full-field">
          <span>หัวข้อปัญหา <i>*</i></span>
          <div className="field-with-icon">
            <FileText size={17} />
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              placeholder="เช่น ไม่สามารถใช้งานเครื่องพิมพ์ได้"
              required
            />
          </div>
        </label>

        <label className="styled-field full-field">
          <span>รายละเอียดปัญหา <i>*</i></span>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={10000}
            placeholder="อธิบายอาการปัญหา สิ่งที่พบ หรือขั้นตอนที่เกิดปัญหา..."
            required
          />
        </label>

        <label className="styled-field">
          <span>ประเภทปัญหา <i>*</i></span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        <label className="styled-field">
          <span>ระดับความสำคัญ</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="LOW">LOW — ต่ำ</option>
            <option value="MEDIUM">MEDIUM — ปกติ</option>
            <option value="HIGH">HIGH — สูง</option>
            <option value="CRITICAL">CRITICAL — เร่งด่วน</option>
          </select>
        </label>

        <div className="styled-field full-field">
          <span>ไฟล์แนบ (ไม่บังคับ)</span>
          <div className="attachment-picker">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xlsx,.txt"
              onChange={handleFilesChange}
              hidden
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || files.length >= MAX_FILES}
            >
              <Upload size={16} /> เลือกไฟล์
            </button>
            <span className="muted-empty">สูงสุด {MAX_FILES} ไฟล์, ไฟล์ละไม่เกิน 10 MB</span>
          </div>
          <p className="muted-empty">
            รองรับ JPG, PNG, PDF, DOC, DOCX, XLSX และ TXT
          </p>
          {files.length > 0 && (
            <ul className="selected-attachment-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`} className="selected-attachment-item">
                  <Paperclip size={16} />
                  <span>{file.name} <small>({formatBytes(file.size)})</small></span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`ลบไฟล์ ${file.name}`}
                    onClick={() => removeFile(index)}
                    disabled={saving}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-tip">
        <Wrench size={17} />
        <span>กรุณาระบุรายละเอียดให้ครบถ้วน และแนบภาพหรือเอกสารที่เกี่ยวข้องเพื่อช่วยให้ทีม IT แก้ไขปัญหาได้รวดเร็วขึ้น</span>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving} className="primary-button">
          <Send size={17} /> {saving ? "กำลังส่งใบงาน..." : "ส่งใบงานแจ้งซ่อม"}
        </button>
      </div>
    </form>
  );
}
