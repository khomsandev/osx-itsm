import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ให้ Browser/Axios จัดการ multipart boundary สำหรับ FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (config.data !== undefined) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

export default api;
