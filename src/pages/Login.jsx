import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

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
      const { accessToken, user } = res.data;
      if (user.role !== "admin") {
        setError("Access denied. Admins only.");
        return;
      }
      login(accessToken, user);
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
            width: "44px", height: "44px", background: "var(--accent)",
            borderRadius: "12px", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 12px"
          }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="white">
              <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 11H9V9h2v4zm0-6H9V5h2v2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text)" }}>
            WalletCare
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
                placeholder="admin@walletcare.com"
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
          WalletCare Admin v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;