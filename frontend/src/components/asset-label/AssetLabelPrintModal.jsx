import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { Printer, X } from "lucide-react";

import { notifications } from "../../utils/notifications";

import AssetLabelPrint from "./AssetLabelPrint";

import {
    LABEL_SIZES,
    PRINT_MODES,
    DEFAULT_LABEL_CONFIG,
    MAX_COPIES,
    MAX_TOTAL_LABELS,
} from "./assetLabelConfig";

import "./assetLabel.css";

export default function AssetLabelPrintModal({
    assets = [],
    onClose,
}) {
    const printRef = useRef(null);

    const [config, setConfig] = useState({
        ...DEFAULT_LABEL_CONFIG,
    });

    const [printing, setPrinting] = useState(false);

    const size = LABEL_SIZES[config.size];

    const totalLabels =
        assets.length * Number(config.copies);

    const valid =
        assets.length > 0 &&
        assets.every(asset =>
            String(asset.asset_code || "").trim()
        ) &&
        Number.isInteger(Number(config.copies)) &&
        Number(config.copies) >= 1 &&
        Number(config.copies) <= MAX_COPIES &&
        totalLabels <= MAX_TOTAL_LABELS;

    function updateConfig(name, value) {
        setConfig(previous => ({
            ...previous,
            [name]: value,
        }));
    }

    const pageStyle =
        config.printMode === PRINT_MODES.A4
            ? `
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }
            `
            : `
                @page {
                    size: ${size.width}mm ${size.height}mm;
                    margin: 0;
                }
            `;

    const handlePrint = useReactToPrint({
        contentRef: printRef,

        documentTitle: "OSX-ITSM-Asset-Labels",

        pageStyle: `
            ${pageStyle}

            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                }
            }
        `,

        onAfterPrint: () => {
            setPrinting(false);
        },

        onPrintError: () => {
            setPrinting(false);

            void notifications.error(
                "ไม่สามารถเปิดหน้าต่างพิมพ์ได้"
            );
        },
    });

    async function submitPrint() {
        if (printing) return;

        if (!valid) {
            void notifications.warning(
                "กรุณาตรวจสอบรายการ Asset และจำนวนสำเนา"
            );
            return;
        }

        setPrinting(true);

        try {
            const confirmed = await notifications.confirm(
                `ต้องการพิมพ์สติกเกอร์ ${totalLabels} ดวงหรือไม่?`,
                {
                    titleText: "ยืนยันการพิมพ์",
                    confirmButtonText: "พิมพ์",
                    cancelButtonText: "ยกเลิก",
                }
            );

            if (!confirmed) {
                setPrinting(false);
                return;
            }

            handlePrint();

        } catch {
            setPrinting(false);

            void notifications.error(
                "ไม่สามารถเตรียมเอกสารสำหรับพิมพ์ได้"
            );
        }
    }

    return createPortal(
        <div className="osx-print-overlay">
            <section
                className="osx-print-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-print-title"
            >
                <div className="osx-print-header">
                    <h2 id="asset-print-title">
                        <Printer size={21} />
                        พิมพ์สติกเกอร์ทรัพย์สิน
                    </h2>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                        disabled={printing}
                        aria-label="ปิดหน้าต่าง"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="osx-print-settings">

                    <label>
                        ขนาดสติกเกอร์

                        <select
                            value={config.size}
                            disabled={printing}
                            onChange={event =>
                                updateConfig(
                                    "size",
                                    event.target.value
                                )
                            }
                        >
                            {Object.entries(LABEL_SIZES).map(
                                ([value, item]) => (
                                    <option
                                        key={value}
                                        value={value}
                                    >
                                        {item.name}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        ประเภทเครื่องพิมพ์

                        <select
                            value={config.printMode}
                            disabled={printing}
                            onChange={event =>
                                updateConfig(
                                    "printMode",
                                    event.target.value
                                )
                            }
                        >
                            <option value={PRINT_MODES.THERMAL}>
                                Label Printer
                            </option>

                            <option value={PRINT_MODES.A4}>
                                A4 Printer
                            </option>
                        </select>
                    </label>

                    <label>
                        จำนวนสำเนาต่อ Asset

                        <input
                            type="number"
                            min={1}
                            max={MAX_COPIES}
                            step={1}
                            value={config.copies}
                            disabled={printing}
                            onChange={event =>
                                updateConfig(
                                    "copies",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <div className="osx-print-options">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.showAssetName}
                                disabled={printing}
                                onChange={event =>
                                    updateConfig(
                                        "showAssetName",
                                        event.target.checked
                                    )
                                }
                            />
                            แสดงชื่อทรัพย์สิน
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={config.showBrandModel}
                                disabled={printing}
                                onChange={event =>
                                    updateConfig(
                                        "showBrandModel",
                                        event.target.checked
                                    )
                                }
                            />
                            แสดงยี่ห้อ / รุ่น
                        </label>
                    </div>
                </div>

                <div className="osx-print-summary">
                    Asset {assets.length} รายการ
                    {" | "}
                    สติกเกอร์ {totalLabels} ดวง
                </div>

                <div className="osx-print-preview">
                    {valid ? (
                        <AssetLabelPrint
                            assets={assets}
                            config={config}
                            printRef={printRef}
                        />
                    ) : (
                        <p>
                            กรุณาตรวจสอบข้อมูลและจำนวนสำเนา
                        </p>
                    )}
                </div>

                <div className="osx-print-footer">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                        disabled={printing}
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={submitPrint}
                        disabled={printing || !valid}
                    >
                        <Printer size={17} />

                        {printing
                            ? "กำลังเตรียมพิมพ์..."
                            : `พิมพ์ ${totalLabels} ดวง`}
                    </button>
                </div>
            </section>
        </div>,
        document.body
    );
}
