import { Monitor } from "lucide-react";
import "./assetSpecs.css";

const CATEGORIES = new Set([
    "เครื่องคอมพิวเตอร์ Notebook",
    "เครื่องคอมพิวเตอร์ Desktop",
    "Server และระบบประมวลผล",
]);

const FIELDS = [
    ["display", "หน้าจอ (Display)", '24 inch / FHD / IPS'],
    ["cpu", "CPU", "Intel Core i5-12500"],
    ["ram", "RAM", "16 GB DDR4 (2 x 8 GB)"],
    ["storage", "Storage", "512 GB NVMe SSD + 1 TB HDD"],
    ["operating_system", "ระบบปฏิบัติการ (OS)", "Windows 11 Pro 64-bit"],
    ["gpu", "GPU / Graphics", "Intel UHD Graphics"],
    ["hostname", "Computer Name / Hostname", "IT-PC-001"],
    ["form_factor", "Form Factor", "All-in-One / Tower / Rack 2U"],
];

export const supportsSpecs = category => CATEGORIES.has(category?.category_name?.trim());
export function cleanSpecs(value) {
    return Object.fromEntries(FIELDS.map(([key]) => [key, String(value?.[key] ?? "").trim()]).filter(([, text]) => text));
}

export default function AssetSpecs({ category, value = {}, onChange, readOnly = false, disabled = false }) {
    if (!supportsSpecs(category)) return null;
    return (
        <section className="full-field osx-specs">
            <header className="osx-specs-heading">
                <span className="osx-specs-icon"><Monitor size={20} /></span>
                <div><small>TECHNICAL SPECIFICATIONS</small><h3>รายละเอียดทางเทคนิค</h3><p>{readOnly ? "ข้อมูลสเปกของอุปกรณ์" : "ระบุข้อมูลเท่าที่ทราบ (ไม่บังคับ)"}</p></div>
            </header>
            <div className="osx-specs-grid">
                {FIELDS.map(([key, label, placeholder]) => readOnly ? (
                    <div className="osx-specs-datum" key={key}><span>{label}</span><strong>{value?.[key] || "ไม่ระบุ"}</strong></div>
                ) : (
                    <label className="styled-field" key={key}><span>{label}</span><input value={value?.[key] ?? ""} placeholder={placeholder} maxLength={500} disabled={disabled} onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>
                ))}
            </div>
        </section>
    );
}
