import Swal from "sweetalert2";
import "./notifications.css";

// จัดลำดับการแจ้งเตือน ป้องกัน Popup แสดงทับกัน
let pending = Promise.resolve();

function enqueue(task) {
  const result = pending.then(task);
  pending = result.catch(() => {});
  return result;
}

// แปลงข้อความ Error จาก API ให้อยู่ในรูปแบบ String
export function messageText(value) {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map(item => messageText(item?.msg ?? item))
      .filter(Boolean)
      .join("\n");
  }

  if (value && typeof value === "object") {
    return messageText(
      value.detail ?? value.message ?? value.msg ?? ""
    );
  }

  return value == null ? "" : String(value);
}

// Default Configuration สำหรับ Popup
const dialog = Swal.mixin({
  confirmButtonText: "ตกลง",
  cancelButtonText: "ยกเลิก",
  confirmButtonColor: "#1758c8",
  cancelButtonColor: "#75839a",
  customClass: {
    popup: "osx-swal-popup",
  },
});

// Default Configuration สำหรับ Toast
const toast = dialog.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  showCloseButton: true,
  timer: 3500,
  timerProgressBar: true,
  didOpen: popup => {
    popup.addEventListener("mouseenter", Swal.stopTimer);
    popup.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

const notify = (icon, titleText, value, options = {}) =>
  enqueue(() =>
    dialog.fire({
      ...options,
      icon,
      titleText,
      text: messageText(value),
      html: undefined,
    })
  );

// Public Notification Service
export const notifications = {
  success: value =>
    enqueue(() =>
      toast.fire({
        icon: "success",
        titleText: messageText(value),
      })
    ),

  error: value =>
    notify("error", "เกิดข้อผิดพลาด", value),

  warning: value =>
    notify("warning", "กรุณาตรวจสอบ", value),

  info: value =>
    notify("info", "แจ้งให้ทราบ", value),

  confirm: (value, options = {}) =>
    enqueue(async () => {
      const result = await dialog.fire({
        icon: "question",
        titleText: "ยืนยันการดำเนินการ",
        showCancelButton: true,
        focusCancel: true,
        allowOutsideClick: false,
        ...options,
        text: messageText(value),
        html: undefined,
      });

      return result.isConfirmed;
    }),
};
