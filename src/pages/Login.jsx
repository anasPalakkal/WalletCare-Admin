import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import logo from "../assets/PanelLogo.png";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = res.data;
      if (user.role !== "admin" && user.role !== "superadmin") {  // Both allowed
        setError("Access denied. Admins only.");
        return;
      }
      login(accessToken, refreshToken, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)"
    }}>
      <div style={{ width: "100%", maxWidth: "380px", padding: "0 16px" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "60px", height: "42px",
            display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 12px",
          }}>
            <img src={logo} alt="GreenPouch Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text)" }}>
            <span style={{ color: "#22c55e" }}>Green</span>
            <span>Pouch</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            Admin Panel — sign in to continue
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: "14px" }}>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: "500",
                color: "var(--text-muted)", marginBottom: "6px"
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: "500",
                color: "var(--text-muted)", marginBottom: "6px"
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: "var(--danger-light)", color: "var(--danger-text)",
                border: "1px solid var(--danger)", borderRadius: "7px",
                padding: "9px 12px", fontSize: "12px", marginBottom: "16px"
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
          GreenPouch Admin v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;