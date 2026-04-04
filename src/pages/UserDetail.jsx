import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data.data);
    } catch (err) {
      setError("Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === "ban")     await api.patch(`/admin/users/${id}/ban`);
      if (action === "unban")   await api.patch(`/admin/users/${id}/unban`);
      if (action === "logout")  await api.post(`/admin/users/${id}/logout`);
      if (action === "restore") await api.patch(`/admin/users/${id}/restore`);
      await fetchUser();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (loading) return (
    <Layout>
      <Topbar title="User Detail" subtitle="View and manage user account" />
      <div className="main-content">
        <div className="loading">Loading user...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar title="User Detail" subtitle="View and manage user account" />
      <div className="main-content">
        <div style={{ color: "var(--danger)" }}>{error}</div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Topbar title="User Detail" subtitle="View and manage user account" />
      <div className="main-content">

        {/* Back button */}
        <button
          className="btn"
          onClick={() => navigate("/users")}
          style={{ marginBottom: "16px", fontSize: "12px" }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Users
        </button>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}>

          {/* Left — User Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Profile Card */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "var(--accent-light)", color: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: "700", flexShrink: 0,
                }}>
                  {getInitials(user?.name)}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {user?.email}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    {user?.isBanned ? (
                      <span className="badge badge-danger">Banned</span>
                    ) : user?.scheduledDeletionAt ? (
                      <span className="badge badge-warning">Scheduled Deletion</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                    {user?.isPremium && (
                      <span className="badge badge-purple">Premium</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Table */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                {[
                  { label: "User ID",   value: user?._id },
                  { label: "Phone",     value: user?.phone || "—" },
                  { label: "Role",      value: user?.role },
                  { label: "Verified",  value: user?.isEmailVerified ? "Yes" : "No" },
                  { label: "Joined",    value: formatDate(user?.createdAt) },
                  { label: "Updated",   value: formatDate(user?.updatedAt) },
                  ...(user?.scheduledDeletionAt ? [{
                    label: "Deletes on",
                    value: formatDate(user?.scheduledDeletionAt),
                    danger: true,
                  }] : []),
                ].map((item) => (
                  <div key={item.label} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: "12px", fontWeight: "500",
                      color: item.danger ? "var(--danger)" : "var(--text)",
                      maxWidth: "200px", textAlign: "right",
                      wordBreak: "break-all",
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right — Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Actions Card */}
            <div className="card">
              <div style={{
                fontSize: "13px", fontWeight: "600",
                color: "var(--text)", marginBottom: "14px"
              }}>
                Admin Actions
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

                {/* Ban / Unban */}
                {user?.isBanned ? (
                  <div style={{
                    padding: "12px 14px", borderRadius: "8px",
                    background: "var(--success-light)",
                    border: "1px solid var(--success)",
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--success-text)", marginBottom: "4px" }}>
                      Unban User
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--success-text)", marginBottom: "10px", opacity: 0.8 }}>
                      Restore access to this user account
                    </div>
                    <button
                      className="btn btn-success"
                      disabled={actionLoading === "unban"}
                      onClick={() => setConfirm({ action: "unban" })}
                      style={{ fontSize: "12px" }}
                    >
                      {actionLoading === "unban" ? "Processing..." : "Unban User"}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: "12px 14px", borderRadius: "8px",
                    background: "var(--danger-light)",
                    border: "1px solid var(--danger)",
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--danger-text)", marginBottom: "4px" }}>
                      Ban User
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--danger-text)", marginBottom: "10px", opacity: 0.8 }}>
                      Block this user from logging in
                    </div>
                    <button
                      className="btn btn-danger"
                      disabled={actionLoading === "ban"}
                      onClick={() => setConfirm({ action: "ban" })}
                      style={{ fontSize: "12px" }}
                    >
                      {actionLoading === "ban" ? "Processing..." : "Ban User"}
                    </button>
                  </div>
                )}

                {/* Force Logout */}
                <div style={{
                  padding: "12px 14px", borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>
                    Force Logout
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                    Invalidate all active sessions for this user
                  </div>
                  <button
                    className="btn"
                    disabled={actionLoading === "logout"}
                    onClick={() => setConfirm({ action: "logout" })}
                    style={{ fontSize: "12px" }}
                  >
                    {actionLoading === "logout" ? "Processing..." : "Force Logout"}
                  </button>
                </div>

                {/* Restore — only if scheduled for deletion */}
                {user?.scheduledDeletionAt && (
                  <div style={{
                    padding: "12px 14px", borderRadius: "8px",
                    background: "var(--warning-light)",
                    border: "1px solid var(--warning)",
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--warning-text)", marginBottom: "4px" }}>
                      Restore Account
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--warning-text)", marginBottom: "10px", opacity: 0.8 }}>
                      Cancel scheduled deletion for this user
                    </div>
                    <button
                      className="btn btn-success"
                      disabled={actionLoading === "restore"}
                      onClick={() => setConfirm({ action: "restore" })}
                      style={{ fontSize: "12px" }}
                    >
                      {actionLoading === "restore" ? "Processing..." : "Restore Account"}
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Coming Soon — Analytics */}
            <div className="card" style={{ textAlign: "center", padding: "30px" }}>
              <svg width="32" height="32" viewBox="0 0 20 20" fill="var(--text-muted)" style={{ marginBottom: "8px" }}>
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
              <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>
                User Analytics
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Transaction stats, account info and spending trends coming soon
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px", margin: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Confirm {confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1)}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Are you sure you want to <strong>{confirm.action}</strong> user <strong>{user?.name}</strong>?
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={confirm.action === "ban" ? "btn btn-danger" : "btn btn-primary"}
                onClick={() => handleAction(confirm.action)}
              >
                Yes, {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default UserDetail;