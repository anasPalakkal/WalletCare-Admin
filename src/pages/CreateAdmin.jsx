import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";

const CreateAdmin = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (admin && admin.role !== "superadmin") navigate("/dashboard");
  }, [admin, navigate]);

  if (!admin || admin.role !== "superadmin") return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    else if (formData.name.trim().length > 50) newErrors.name = "Name must not exceed 50 characters";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const response = await api.post("/admin/create-admin", formData);
      const adminEmail = response.data?.data?.email || formData.email;
      setSuccess(`Admin created successfully: ${adminEmail}`);
      setFormData({ name: "", email: "", password: "" });
      setErrors({});
      setTimeout(() => navigate("/admin/manage"), 2000);
    } catch (err) {
      if (err.response?.data?.message) setError(err.response.data.message);
      else if (err.response?.status === 401) setError("Unauthorized. Please login again.");
      else if (err.response?.status === 403) setError("Access denied. Superadmin privileges required.");
      else setError("Failed to create admin. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Topbar title="Create Admin" subtitle="Add a new administrator to the system" />
      <div className="main-content">
        <div className="max-w-[500px] mx-auto">
          <div className="card">

            {success && (
              <div className="bg-[var(--success-light)] text-[var(--success-text)] border border-[var(--success)] rounded-[7px] px-3 py-[9px] text-xs mb-4">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-[var(--danger-light)] text-[var(--danger-text)] border border-[var(--danger)] rounded-[7px] px-3 py-[9px] text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="mb-[14px]">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter admin's full name"
                  style={{ borderColor: errors.name ? "var(--danger)" : undefined }}
                />
                {errors.name && (
                  <div className="text-[11px] text-[var(--danger)] mt-1">{errors.name}</div>
                )}
              </div>

              {/* Email */}
              <div className="mb-[14px]">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  style={{ borderColor: errors.email ? "var(--danger)" : undefined }}
                />
                {errors.email && (
                  <div className="text-[11px] text-[var(--danger)] mt-1">{errors.email}</div>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  style={{ borderColor: errors.password ? "var(--danger)" : undefined }}
                />
                {errors.password && (
                  <div className="text-[11px] text-[var(--danger)] mt-1">{errors.password}</div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 justify-center"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Admin"}
                </button>
                <button
                  type="button"
                  className="btn px-4"
                  onClick={() => navigate("/admin/manage")}
                  disabled={loading}
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