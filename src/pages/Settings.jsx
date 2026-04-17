import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

// ── Utility: Generate 1–2 letter initials from a full name ──────────────────
const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "A";

// ── Icon: Eye / Eye-off toggle for password visibility ──────────────────────
const EyeIcon = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--text-muted)" aria-hidden="true">
    {open ? (
      // Eye open — password is visible
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4zM2.458 10C3.732 6.943 6.523 5 10 5c3.477 0 6.268 1.943 7.542 5-1.274 3.057-4.065 5-7.542 5-3.477 0-6.268-1.943-7.542-5z" />
    ) : (
      // Eye closed — password is hidden
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 6.943 15.477 5 12 5c-1.274 0-2.496.273-3.596.758L3.707 2.293zM10 7a3 3 0 012.83 3.994l-3.824-3.824A2.977 2.977 0 0110 7zm-4.828 1.172A9.966 9.966 0 000.458 10c1.274 3.057 4.065 5 7.542 5a9.966 9.966 0 004.37-1L9.828 11.464A3 3 0 015.172 8.172z" clipRule="evenodd" />
    )}
  </svg>
);

// ── Alert: Inline success / error feedback banner ───────────────────────────
// Renders nothing when msg is null; green for success, red for error
const Alert = ({ msg }) => {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "10px 12px", borderRadius: "6px", marginTop: "12px",
      background: ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      fontSize: "12px", color: ok ? "#10b981" : "var(--danger)",
    }}>
      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {ok ? (
          // Checkmark icon for success
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        ) : (
          // Exclamation icon for error
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        )}
      </svg>
      {msg.text}
    </div>
  );
};

// ── Shared inline styles used across multiple form sections ─────────────────
const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "1px solid var(--border)", borderRadius: "6px",
  background: "var(--bg)", color: "var(--text)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontSize: "12px", fontWeight: "500",
  color: "var(--text-muted)", marginBottom: "6px",
};

const sectionHeaderStyle = {
  fontSize: "13px", fontWeight: "600", color: "var(--text)",
  marginBottom: "16px", paddingBottom: "12px",
  borderBottom: "1px solid var(--border)",
};

// ── Main Settings Component ──────────────────────────────────────────────────
const Settings = () => {
  // Admin data fetched from the server (used for avatar display)
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Profile section state ──────────────────────────────────────────────
  const [profileForm, setProfileForm]       = useState({ name: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg]         = useState(null);

  // ── Password section state ─────────────────────────────────────────────
  const [passwordForm, setPasswordForm]       = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg]         = useState(null);
  // Tracks individual show/hide toggle per password field
  const [showPasswords, setShowPasswords]     = useState({ current: false, new: false, confirm: false });

  // ── Danger Zone section state ──────────────────────────────────────────
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false); // controls confirm modal visibility
  const [logoutAllMsg, setLogoutAllMsg]         = useState(null);

  // Get logout function from AuthContext to clear local session after logout-all
  const { logout } = useAuth();

  // Fetch admin profile once on mount
  useEffect(() => { fetchAdminProfile(); }, []);

  // ── GET /api/admin/profile ─────────────────────────────────────────────
  // Loads admin name + email to pre-fill the profile form and avatar
  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const res  = await api.get("/admin/profile");
      const data = res.data.data;
      setAdmin(data);
      setProfileForm({ name: data.name || "", email: data.email || "" });
    } catch {
      // Fallback to a safe default if the profile fetch fails
      setAdmin({ name: "Admin", email: "" });
      setProfileForm({ name: "Admin", email: "" });
    } finally {
      setLoading(false);
    }
  };

  // ── PATCH /api/admin/profile ───────────────────────────────────────────
  // Saves updated name and email; also updates the local admin display state
  const handleProfileSave = async () => {
    // Basic client-side validation before hitting the API
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileMsg({ type: "error", text: "Name and email are required." });
      return;
    }
    try {
      setProfileLoading(true);
      setProfileMsg(null);
      await api.patch("/admin/profile", {
        name:  profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      // Reflect changes in the avatar row without a full refetch
      setAdmin((prev) => ({ ...prev, ...profileForm }));
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── PATCH /api/admin/change-password ──────────────────────────────────
  // Backend (changePassword controller) expects { currentPassword, newPassword }
  // confirmPassword is validated client-side only — not sent to the API
  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Client-side validation: all fields required
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "All password fields are required." });
      return;
    }
    // Minimum length check
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    // Confirm passwords must match
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordMsg(null);
      await api.patch("/admin/change-password", { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      // Clear the form on success to prevent accidental resubmission
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── POST /api/admin/logout-all ─────────────────────────────────────────
  // Backend clears all stored refresh tokens for this admin account.
  // After success: also clears localStorage + React auth state via logout(),
  // then redirects to /login so the current session is also terminated.
  const handleLogoutAllSessions = async () => {
    try {
      setLogoutAllLoading(true);
      setLogoutAllMsg(null);
      await api.post("/admin/logout-all");
      setConfirmLogoutAll(false);
      // Clear local auth state (adminToken, adminRefreshToken, adminData in localStorage)
      logout();
      // Hard redirect to login — current access token is now invalid
      window.location.href = "/login";
    } catch (err) {
      setLogoutAllMsg({ type: "error", text: err.response?.data?.message || "Failed to logout all sessions." });
    } finally {
      setLogoutAllLoading(false);
    }
  };

  // ── Loading state — shown while fetching admin profile on mount ─────────
  if (loading) return (
    <Layout>
      <Topbar title="Settings" subtitle="Manage your admin account" />
      <div className="main-content">
        <div className="loading">Loading settings...</div>
      </div>
    </Layout>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <Layout>
      <Topbar title="Settings" subtitle="Manage your admin account" />
      <div className="main-content">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "860px" }}>

          {/* ── Section 1: Admin Profile ──────────────────────────────── */}
          <div className="card">
            <div style={sectionHeaderStyle}>Admin Profile</div>

            {/* Avatar row — shows initials, name, email, and role badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%",
                background: "var(--accent-light)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", fontWeight: "700", flexShrink: 0,
              }}>
                {getInitials(admin?.name)}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>
                  {admin?.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {admin?.email}
                </div>
                <span className="badge badge-purple" style={{ marginTop: "6px", display: "inline-block" }}>
                  Administrator
                </span>
              </div>
            </div>

            {/* Editable profile fields — name and email side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Success / error feedback */}
            <Alert msg={profileMsg} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                className="btn btn-primary"
                disabled={profileLoading}
                onClick={handleProfileSave}
              >
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* ── Section 2: Change Password ───────────────────────────── */}
          <div className="card">
            <div style={sectionHeaderStyle}>Change Password</div>

            {/* Three password fields rendered from a config array for DRYness */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              {[
                { key: "current", label: "Current Password", field: "currentPassword" },
                { key: "new",     label: "New Password",     field: "newPassword"     },
                { key: "confirm", label: "Confirm Password", field: "confirmPassword" },
              ].map(({ key, label, field }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ position: "relative" }}>
                    {/* Input type toggles between "password" and "text" based on showPasswords[key] */}
                    <input
                      style={{ ...inputStyle, paddingRight: "36px" }}
                      type={showPasswords[key] ? "text" : "password"}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••••"
                    />
                    {/* Toggle button to show/hide this specific password field */}
                    <button
                      onClick={() => setShowPasswords((p) => ({ ...p, [key]: !p[key] }))}
                      aria-label={showPasswords[key] ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute", right: "10px", top: "50%",
                        transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", padding: 0,
                      }}
                    >
                      <EyeIcon open={showPasswords[key]} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Hint text for minimum password length requirement */}
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
              Password must be at least 8 characters long.
            </div>

            {/* Success / error feedback */}
            <Alert msg={passwordMsg} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                className="btn btn-primary"
                disabled={passwordLoading}
                onClick={handlePasswordChange}
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>

          {/* ── Section 3: Danger Zone ────────────────────────────────── */}
          {/* Red top border signals a destructive / irreversible action area */}
          <div className="card" style={{ borderTop: "3px solid var(--danger)" }}>
            <div style={{ ...sectionHeaderStyle, color: "var(--danger)" }}>
              Danger Zone
            </div>

            {/* Logout All Sessions row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.04)",
            }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text)" }}>
                  Invalidate All Sessions
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                  Log out from all devices and invalidate all active refresh tokens.
                </div>
              </div>
              {/* Opens the confirmation modal before proceeding */}
              <button
                className="btn btn-danger"
                style={{ flexShrink: 0, marginLeft: "16px" }}
                disabled={logoutAllLoading}
                onClick={() => setConfirmLogoutAll(true)}
              >
                {logoutAllLoading ? "..." : "Logout All"}
              </button>
            </div>

            {/* Success / error feedback for logout-all */}
            <Alert msg={logoutAllMsg} />
          </div>

        </div>
      </div>

      {/* ── Confirmation Modal: Logout All Sessions ────────────────────────── */}
      {/* Shown only when confirmLogoutAll is true; requires explicit user approval */}
      {confirmLogoutAll && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px", margin: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Invalidate All Sessions
            </div>
            {/* Warning copy — makes the consequence clear before confirming */}
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              This will log you out from <strong>all devices</strong> and clear all refresh tokens.
              You will need to log in again.
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              {/* Cancel — dismisses modal without any action */}
              <button className="btn" onClick={() => setConfirmLogoutAll(false)}>
                Cancel
              </button>
              {/* Confirm — triggers the actual logout-all API call */}
              <button
                className="btn btn-danger"
                disabled={logoutAllLoading}
                onClick={handleLogoutAllSessions}
              >
                {logoutAllLoading ? "..." : "Yes, logout all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Settings;