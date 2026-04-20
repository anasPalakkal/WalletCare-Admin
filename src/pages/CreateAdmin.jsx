import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";

const CreateAdmin = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Redirect if not superadmin
  useEffect(() => {
    if (admin && admin.role !== "superadmin") {
      navigate("/dashboard");
    }
  }, [admin, navigate]);

  if (!admin || admin.role !== "superadmin") {
    return null;
  }

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name must not exceed 50 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
    setSuccess("");
    setError("");
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await api.post("/admin/create-admin", formData);

      // Backend returns: { success: true, message: "...", data: adminData }
      const adminEmail = response.data?.data?.email || formData.email;
      setSuccess(`Admin created successfully: ${adminEmail}`);
      setFormData({ name: "", email: "", password: "" });
      setErrors({});

      setTimeout(() => {
        navigate("/admin/manage");
      }, 2000);
    } catch (err) {
      console.error("Create admin error:", err);
      console.error("Error response:", err.response?.data); // ← See the actual error

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setError("Unauthorized. Please login again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Superadmin privileges required.");
      } else {
        setError("Failed to create admin. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Topbar
        title="Create Admin"
        subtitle="Add a new administrator to the system"
      />
      <div className="main-content">
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="card">
            {/* Success Message */}
            {success && (
              <div style={{
                background: "var(--success-light)",
                color: "var(--success-text)",
                border: "1px solid var(--success)",
                borderRadius: "7px",
                padding: "9px 12px",
                fontSize: "12px",
                marginBottom: "16px",
              }}>
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: "var(--danger-light)",
                color: "var(--danger-text)",
                border: "1px solid var(--danger)",
                borderRadius: "7px",
                padding: "9px 12px",
                fontSize: "12px",
                marginBottom: "16px",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name Field */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter admin's full name"
                  style={{
                    borderColor: errors.name ? "var(--danger)" : undefined,
                  }}
                />
                {errors.name && (
                  <div style={{
                    fontSize: "11px",
                    color: "var(--danger)",
                    marginTop: "4px",
                  }}>
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  style={{
                    borderColor: errors.email ? "var(--danger)" : undefined,
                  }}
                />
                {errors.email && (
                  <div style={{
                    fontSize: "11px",
                    color: "var(--danger)",
                    marginTop: "4px",
                  }}>
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}>
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  style={{
                    borderColor: errors.password ? "var(--danger)" : undefined,
                  }}
                />
                {errors.password && (
                  <div style={{
                    fontSize: "11px",
                    color: "var(--danger)",
                    marginTop: "4px",
                  }}>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {loading ? "Creating..." : "Create Admin"}
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate("/admin/manage")}
                  disabled={loading}
                  style={{ paddingLeft: "16px", paddingRight: "16px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAdmin;