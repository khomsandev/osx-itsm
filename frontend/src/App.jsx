import { useEffect, useState } from "react";
import { Headset, ShieldCheck } from "lucide-react";
import api from "./api/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChangePassword from "./pages/ChangePassword";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setChecking(false);
      return;
    }
    api.get("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => sessionStorage.removeItem("access_token"))
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    sessionStorage.removeItem("access_token");
    setUser(null);
  }

  if (checking) {
    return (
      <main className="app-loading">
        <div className="loading-mark"><Headset size={30} /></div>
        <p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>
        <span className="loading-line" />
      </main>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.must_change_password) {
    return (
      <ChangePassword
        user={user}
        onPasswordChanged={setUser}
        onLogout={logout}
      />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}
