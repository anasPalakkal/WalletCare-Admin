import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";

const formatCurrency = (amount) => {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [userRes, overviewRes] = await Promise.all([
        api.get(`/admin/users/${id}`),
        api.get(`/admin/users/${id}/overview`),
      ]);
      setUser(userRes.data.data);
      setOverview(overviewRes.data.data);
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
      await fetchAll();
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

        {/* Top — Profile + Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>

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

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              {[
                { label: "User ID",  value: user?._id },
                { label: "Phone",    value: user?.phone || "—" },
                { label: "Role",     value: user?.role },
                { label: "Verified", value: user?.isEmailVerified ? "Yes" : "No" },
                { label: "Joined",   value: formatDate(user?.createdAt) },
                { label: "Updated",  value: formatDate(user?.updatedAt) },
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
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{
                    fontSize: "12px", fontWeight: "500",
                    color: item.danger ? "var(--danger)" : "var(--text)",
                    maxWidth: "200px", textAlign: "right", wordBreak: "break-all",
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Card */}
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "14px" }}>
              Admin Actions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

              {user?.isBanned ? (
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--success-light)", border: "1px solid var(--success)" }}>
                  <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--success-text)", marginBottom: "4px" }}>Unban User</div>
                  <div style={{ fontSize: "11px", color: "var(--success-text)", marginBottom: "10px", opacity: 0.8 }}>Restore access to this user account</div>
                  <button className="btn btn-success" disabled={actionLoading === "unban"} onClick={() => setConfirm({ action: "unban" })} style={{ fontSize: "12px" }}>
                    {actionLoading === "unban" ? "Processing..." : "Unban User"}
                  </button>
                </div>
              ) : (
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
                  <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--danger-text)", marginBottom: "4px" }}>Ban User</div>
                  <div style={{ fontSize: "11px", color: "var(--danger-text)", marginBottom: "10px", opacity: 0.8 }}>Block this user from logging in</div>
                  <button className="btn btn-danger" disabled={actionLoading === "ban"} onClick={() => setConfirm({ action: "ban" })} style={{ fontSize: "12px" }}>
                    {actionLoading === "ban" ? "Processing..." : "Ban User"}
                  </button>
                </div>
              )}

              <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>Force Logout</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>Invalidate all active sessions</div>
                <button className="btn" disabled={actionLoading === "logout"} onClick={() => setConfirm({ action: "logout" })} style={{ fontSize: "12px" }}>
                  {actionLoading === "logout" ? "Processing..." : "Force Logout"}
                </button>
              </div>

              {user?.scheduledDeletionAt && (
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--warning-light)", border: "1px solid var(--warning)" }}>
                  <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--warning-text)", marginBottom: "4px" }}>Restore Account</div>
                  <div style={{ fontSize: "11px", color: "var(--warning-text)", marginBottom: "10px", opacity: 0.8 }}>Cancel scheduled deletion</div>
                  <button className="btn btn-success" disabled={actionLoading === "restore"} onClick={() => setConfirm({ action: "restore" })} style={{ fontSize: "12px" }}>
                    {actionLoading === "restore" ? "Processing..." : "Restore Account"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Bottom — App Usage */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>

          {/* Accounts */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent)">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>Accounts</div>
            </div>

            <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>
              {overview?.accounts?.total || 0}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Total accounts</div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Active",  value: overview?.accounts?.active,       color: "var(--success)" },
                { label: "Frozen",  value: overview?.accounts?.frozen,       color: "var(--warning)" },
                { label: "Closed",  value: overview?.accounts?.closed,       color: "var(--danger)"  },
                { label: "Cash",    value: overview?.accounts?.cashAccounts, color: "var(--text)"    },
                { label: "Bank",    value: overview?.accounts?.bankAccounts, color: "var(--text)"    },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: item.color }}>{item.value}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Balance</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
                  {formatCurrency(overview?.accounts?.totalBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--purple-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--purple)">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>Goals</div>
            </div>

            <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>
              {overview?.goals?.total || 0}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Total goals</div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Active",    value: overview?.goals?.active,    color: "var(--success)" },
                { label: "Completed", value: overview?.goals?.completed, color: "var(--accent)"  },
                { label: "Overdue",   value: overview?.goals?.overdue,   color: "var(--danger)"  },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: item.color }}>{item.value}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Target Amount</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
                  {formatCurrency(overview?.goals?.totalTargetAmount)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "4px" }}>Saved So Far</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--success)" }}>
                  {formatCurrency(overview?.goals?.totalCurrentAmount)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "4px" }}>Avg Completion</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--warning)" }}>
                  {overview?.goals?.avgCompletionRate || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--success)">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>Transactions</div>
            </div>

            <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>
              {overview?.transactions?.total || 0}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Total transactions</div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Top Category</span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>
                  {overview?.transactions?.topCategory || "—"}
                </span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Income</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--success)" }}>
                  {formatCurrency(overview?.transactions?.totalIncome)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", marginBottom: "4px" }}>Total Expense</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--danger)" }}>
                  {formatCurrency(overview?.transactions?.totalExpense)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", marginBottom: "4px" }}>Net Balance</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent)" }}>
                  {formatCurrency((overview?.transactions?.totalIncome || 0) - (overview?.transactions?.totalExpense || 0))}
                </div>
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
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
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