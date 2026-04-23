import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "A";

const EyeIcon = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--text-muted)">
    {open ? (
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4zM2.458 10C3.732 6.943 6.523 5 10 5c3.477 0 6.268 1.943 7.542 5-1.274 3.057-4.065 5-7.542 5-3.477 0-6.268-1.943-7.542-5z" />
    ) : (
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 6.943 15.477 5 12 5c-1.274 0-2.496.273-3.596.758L3.707 2.293zM10 7a3 3 0 012.83 3.994l-3.824-3.824A2.977 2.977 0 0110 7zm-4.828 1.172A9.966 9.966 0 000.458 10c1.274 3.057 4.065 5 7.542 5a9.966 9.966 0 004.37-1L9.828 11.464A3 3 0 015.172 8.172z" clipRule="evenodd" />
    )}
  </svg>
);

const Alert = ({ msg }) => {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div
      className="flex items-center gap-2 px-3 py-[10px] rounded-[6px] mt-3 text-xs"
      style={{
        background: ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
        border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
        color: ok ? "#10b981" : "var(--danger)",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
        {ok ? (
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        )}
      </svg>
      {msg.text}
    </div>
  );
};

const Settings = () => {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm]       = useState({ name: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg]         = useState(null);

  const [passwordForm, setPasswordForm]       = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg]         = useState(null);
  const [showPasswords, setShowPasswords]     = useState({ current: false, new: false, confirm: false });

  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [logoutAllMsg, setLogoutAllMsg]         = useState(null);

  const { logout } = useAuth();

  useEffect(() => { fetchAdminProfile(); }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const res  = await api.get("/admin/profile");
      const data = res.data.data;
      setAdmin(data);
      setProfileForm({ name: data.name || "", email: data.email || "" });
    } catch {
      setAdmin({ name: "Admin", email: "" });
      setProfileForm({ name: "Admin", email: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileMsg({ type: "error", text: "Name and email are required." });
      return;
    }
    try {
      setProfileLoading(true);
      setProfileMsg(null);
      await api.patch("/admin/profile", { name: profileForm.name.trim(), email: profileForm.email.trim() });
      setAdmin((prev) => ({ ...prev, ...profileForm }));
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "All password fields are required." }); return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters." }); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." }); return;
    }
    try {
      setPasswordLoading(true);
      setPasswordMsg(null);
      await api.patch("/admin/change-password", { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      setLogoutAllLoading(true);
      setLogoutAllMsg(null);
      await api.post("/admin/logout-all");
      setConfirmLogoutAll(false);
      logout();
      window.location.href = "/login";
    } catch (err) {
      setLogoutAllMsg({ type: "error", text: err.response?.data?.message || "Failed to logout all sessions." });
    } finally {
      setLogoutAllLoading(false);
    }
  };

  if (loading) return (
    <Layout>
      <Topbar title="Settings" subtitle="Manage your admin account" />
      <div className="main-content"><div className="loading">Loading settings...</div></div>
    </Layout>
  );

  return (
    <Layout>
      <Topbar title="Settings" subtitle="Manage your admin account" />
      <div className="main-content">
        <div className="flex flex-col gap-4 max-w-[860px]">

          {/* ── Profile Section ── */}
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4 pb-3 border-b border-[var(--border)]">
              Admin Profile
            </div>

            {/* Avatar row */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-[52px] h-[52px] rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-lg font-bold flex-shrink-0">
                {getInitials(admin?.name)}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--text)]">{admin?.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-[2px]">{admin?.email}</div>
                <span className="badge badge-purple mt-[6px] inline-block">Administrator</span>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-[14px]">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <Alert msg={profileMsg} />

            <div className="flex justify-end mt-4">
              <button className="btn btn-primary" disabled={profileLoading} onClick={handleProfileSave}>
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* ── Change Password ── */}
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4 pb-3 border-b border-[var(--border)]">
              Change Password
            </div>

            <div className="grid grid-cols-3 gap-[14px]">
              {[
                { key: "current", label: "Current Password", field: "currentPassword" },
                { key: "new",     label: "New Password",     field: "newPassword" },
                { key: "confirm", label: "Confirm Password", field: "confirmPassword" },
              ].map(({ key, label, field }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-[6px]">{label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[key] ? "text" : "password"}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••••"
                      style={{ paddingRight: "36px" }}
                    />
                    <button
                      onClick={() => setShowPasswords((p) => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer flex items-center p-0"
                    >
                      <EyeIcon open={showPasswords[key]} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-[var(--text-muted)] mt-2">
              Password must be at least 8 characters long.
            </div>

            <Alert msg={passwordMsg} />

            <div className="flex justify-end mt-4">
              <button className="btn btn-primary" disabled={passwordLoading} onClick={handlePasswordChange}>
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div className="card" style={{ borderTop: "3px solid var(--danger)" }}>
            <div className="text-[13px] font-semibold text-[var(--danger)] mb-4 pb-3 border-b border-[var(--border)]">
              Danger Zone
            </div>

            <div className="flex items-center justify-between px-4 py-[14px] border border-[var(--border)] rounded-lg" style={{ background: "rgba(239,68,68,0.04)" }}>
              <div>
                <div className="text-[13px] font-medium text-[var(--text)]">Invalidate All Sessions</div>
                <div className="text-xs text-[var(--text-muted)] mt-[3px]">
                  Log out from all devices and invalidate all active refresh tokens.
                </div>
              </div>
              <button
                className="btn btn-danger flex-shrink-0 ml-4"
                disabled={logoutAllLoading}
                onClick={() => setConfirmLogoutAll(true)}
              >
                {logoutAllLoading ? "..." : "Logout All"}
              </button>
            </div>

            <Alert msg={logoutAllMsg} />
          </div>

        </div>
      </div>

      {/* Confirm Modal */}
      {confirmLogoutAll && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
          <div className="card w-full max-w-[360px] mx-4">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">Invalidate All Sessions</div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              This will log you out from <strong>all devices</strong> and clear all refresh tokens. You will need to log in again.
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirmLogoutAll(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={logoutAllLoading} onClick={handleLogoutAllSessions}>
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