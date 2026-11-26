import { useEffect, useState } from "react";
import { Wrench, Archive, History, CheckCircle2, Clock, ShieldCheck, RefreshCw, AlertCircle, CalendarDays } from "lucide-react";
import "./assetLifecycle.css";
import api from "../../api/client";
import { notifications } from "../../utils/notifications";

export default function AssetLifecycle({ asset, user, onRefresh }) {
    const [history, setHistory] = useState([]);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const [description, setDescription] = useState("");
    const [note, setNote] = useState("");
    const [cost, setCost] = useState("0");
    const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Bangkok"}));
    const [reason, setReason] = useState("");
    const individual = asset.tracking_type === "INDIVIDUAL";
    const manager = ["IT_MANAGER", "ADMIN"].includes(user?.role);
    const open = history.filter(row => !row.completed_at);
    const canRepair = ready && individual && open.length === 0 && ["AVAILABLE", "ASSIGNED", "IN_USE"].includes(asset.status);
    const canDispose = ready && manager && (
        ["AVAILABLE", "INACTIVE"].includes(asset.status) && open.length === 0 ||
        individual && asset.status === "UNDER_REPAIR" && open.length === 1
    ) && (individual || asset.quantity_on_hand === 0);

    useEffect(() => {
        let active = true;
        api.get(`/assets/${asset.id}/maintenance`).then(({data}) => {
            if (active) { setHistory(data); setReady(true); }
        }).catch(err => {
            if (active) void notifications.error(err.response?.data?.detail || "โหลดประวัติการซ่อมไม่สำเร็จ");
        });
        return () => { active = false; };
    }, [asset.id, revision]);

    async function run(path, payload, prompt) {
        if (busy) return;
        setBusy(true);
        try {
            if (!await notifications.confirm(prompt)) return;
            await api.post(`/assets/${asset.id}/${path}`, payload);
            setDescription(""); setNote(""); setReason(""); setCost("0");
            setReady(false);
            setRevision(n => n + 1);
            void notifications.success("บันทึกรายการสำเร็จ");
            try { await onRefresh(asset.id); }
            catch { void notifications.warning("บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาเปิดรายละเอียดใหม่"); }
        } catch (err) {
            void notifications.error(err.response?.data?.detail || "ไม่สามารถบันทึกรายการได้");
        } finally { setBusy(false); }
    }

    const statusLabels = { AVAILABLE: "พร้อมใช้งาน", ASSIGNED: "เบิกจ่ายแล้ว", IN_USE: "กำลังใช้งาน", UNDER_REPAIR: "อยู่ระหว่างซ่อม", DISPOSED: "ตัดจำหน่ายแล้ว", INACTIVE: "ไม่ใช้งาน" };
    const formatDate = value => value ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "-";
    const formatCost = value => value == null ? "-" : Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <section className="full-field asset-life">
            <header className="asset-life-header">
                <div className="section-heading-icon"><Wrench size={19}/></div>
                <div className="asset-life-heading">
                    <span className="asset-life-kicker">ASSET LIFECYCLE</span>
                    <h2>ส่งซ่อม / ตัดจำหน่าย</h2>
                    <p>จัดการสถานะและติดตามประวัติทรัพย์สิน</p>
                </div>
                <span className="asset-life-badge" data-status={asset.status}>{statusLabels[asset.status] || asset.status}</span>
            </header>
            {!ready && (
                <div className="asset-life-notice" role="status">
                    <AlertCircle size={17}/><span>ประวัติการซ่อมยังไม่พร้อม</span>
                    <button type="button" className="secondary-button" disabled={busy} onClick={() => setRevision(n => n + 1)}><RefreshCw size={14}/> โหลดใหม่</button>
                </div>
            )}
            <div className="asset-life-content">
                {canRepair && (
                    <article className="asset-life-card">
                        <div className="asset-life-card-heading"><span className="asset-life-icon"><Wrench size={18}/></span><div><h3>ส่งซ่อมทรัพย์สิน</h3><p>บันทึกอาการเสียและรายละเอียดการส่งซ่อม</p></div></div>
                        <div className="form-grid">
                            <label className="styled-field full-field"><span>อาการเสีย / รายละเอียด <i>*</i></span><textarea rows={3} placeholder="ระบุอาการเสียที่พบ..." value={description} onChange={e => setDescription(e.target.value)} disabled={busy}/></label>
                            <label className="styled-field"><span>วันที่ส่งซ่อม <i>*</i></span><input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={busy}/></label>
                            <label className="styled-field"><span>ค่าใช้จ่ายประมาณการ (บาท)</span><input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} disabled={busy}/></label>
                            <label className="styled-field full-field"><span>ร้านซ่อม / เลขอ้างอิง / หมายเหตุ</span><textarea rows={2} placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)" value={note} onChange={e => setNote(e.target.value)} disabled={busy}/></label>
                        </div>
                        <div className="asset-life-actions"><button type="button" className="primary-button" disabled={busy || description.trim().length < 3 || !date || !cost.trim() || !Number.isFinite(Number(cost)) || Number(cost)<0} onClick={() => run("maintenance", {maintenance_type:"REPAIR", description:description.trim(), maintenance_date:date, maintenance_cost:cost, note:note.trim() || null}, "ยืนยันส่งซ่อมทรัพย์สิน? รายการผู้ถือครองเดิมจะยังคงอยู่")}><Wrench size={15}/> บันทึกส่งซ่อม</button></div>
                    </article>
                )}
                {individual && asset.status === "UNDER_REPAIR" && open.length === 1 && ready && (
                    <article className="asset-life-card asset-life-repair">
                        <div className="asset-life-card-heading"><span className="asset-life-icon"><Clock size={18}/></span><div><h3>อยู่ระหว่างซ่อม</h3><p>รายการซ่อม #{open[0].id}</p></div></div>
                        <p className="asset-life-text">{open[0].description}</p>
                        <dl className="asset-life-meta"><div><dt>วันที่ส่งซ่อม</dt><dd>{open[0].maintenance_date || "-"}</dd></div><div><dt>ค่าใช้จ่ายที่บันทึก (บาท)</dt><dd>{formatCost(open[0].maintenance_cost)}</dd></div></dl>
                        {open[0].note && <p className="asset-life-text">{open[0].note}</p>}
                        <div className="asset-life-actions"><button type="button" className="primary-button" disabled={busy} onClick={() => run(`maintenance/${open[0].id}/complete`, undefined, "ยืนยันซ่อมสำเร็จและรับคืนทรัพย์สิน?")}><CheckCircle2 size={16}/> ซ่อมสำเร็จ / รับคืน</button></div>
                    </article>
                )}
                {canDispose && (
                    <article className="asset-life-card asset-life-danger">
                        <div className="asset-life-card-heading"><span className="asset-life-icon"><Archive size={18}/></span><div><h3>ตัดจำหน่ายทรัพย์สิน</h3><p>สำหรับ IT Manager / Admin</p></div></div>
                        <div className="asset-life-notice"><ShieldCheck size={17}/><span>ดำเนินการเมื่อได้รับอนุมัติและตรวจสอบการส่งมอบจริงแล้ว ระบบจะเก็บประวัติเดิมทั้งหมด</span></div>
                        <label className="styled-field"><span>เหตุผล / เลขเอกสารอนุมัติ <i>*</i></span><textarea rows={3} maxLength={2000} placeholder="เช่น ซ่อมไม่ได้ / ไม่คุ้มค่าซ่อม พร้อมเลขเอกสารอนุมัติ" value={reason} onChange={e => setReason(e.target.value)} disabled={busy}/></label>
                        <div className="asset-life-actions"><button type="button" className="secondary-button asset-life-dispose-button" disabled={busy || reason.trim().length < 3} onClick={() => run("dispose", {disposal_note:reason.trim()}, "ยืนยันตัดจำหน่าย? ไม่สามารถเบิกจ่ายได้อีก และรายการซ่อม/ผู้ถือครองที่เกี่ยวข้องจะถูกปิดตามเงื่อนไข")}><Archive size={15}/> ตัดจำหน่าย</button></div>
                    </article>
                )}
                {asset.status === "DISPOSED" && (
                    <article className="asset-life-card asset-life-danger">
                        <div className="asset-life-card-heading"><span className="asset-life-icon"><Archive size={18}/></span><div><h3>ข้อมูลการตัดจำหน่าย</h3><p>ไม่สามารถนำกลับมาเบิกจ่ายได้</p></div></div>
                        <dl className="asset-life-meta"><div><dt>วันที่</dt><dd>{formatDate(asset.disposed_at)}</dd></div><div><dt>ผู้ดำเนินการ ID</dt><dd>{asset.disposed_by ?? "-"}</dd></div></dl>
                        <p className="asset-life-text">เหตุผล: {asset.disposal_note || "-"}</p>
                    </article>
                )}
                <article className="asset-life-card">
                    <div className="asset-life-card-heading"><span className="asset-life-icon"><History size={18}/></span><div><h3>ประวัติการซ่อม</h3><p>Maintenance history</p></div><span className="asset-life-count">{history.length} รายการ</span></div>
                    {ready && !history.length && <div className="asset-life-empty"><History size={25}/><span>ไม่มีประวัติการซ่อม</span></div>}
                    <ol className="asset-life-timeline">
                        {history.map(row => <li key={row.id} className="asset-life-event">
                            <span className="asset-life-event-icon" data-complete={Boolean(row.completed_at)}>{row.completed_at ? <CheckCircle2 size={15}/> : <Clock size={15}/>}</span>
                            <div className="asset-life-event-body">
                                <div className="asset-life-event-heading"><strong>รายการซ่อม #{row.id}</strong><span className="asset-life-badge" data-status={row.completed_at ? "CLOSED" : "UNDER_REPAIR"}>{row.completed_at ? "ปิดรายการ" : "กำลังดำเนินการ"}</span></div>
                                <p className="asset-life-event-date"><CalendarDays size={13}/> {row.maintenance_date || "-"}</p>
                                <p className="asset-life-text">{row.description}</p>
                                <dl className="asset-life-meta"><div><dt>ค่าใช้จ่ายที่บันทึก (บาท)</dt><dd>{formatCost(row.maintenance_cost)}</dd></div><div><dt>ผู้บันทึก ID</dt><dd>{row.performed_by ?? "-"}</dd></div></dl>
                                {row.note && <p className="asset-life-text">{row.note}</p>}
                                {row.completed_at && <p className="asset-life-event-date">ปิดรายการ: {formatDate(row.completed_at)}</p>}
                            </div>
                        </li>)}
                    </ol>
                </article>
            </div>
        </section>
    );
}
