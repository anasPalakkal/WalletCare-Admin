import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";

const POLL_INTERVAL = 60000;

// ─── NotifyComposeForm ────────────────────────────────────────────────────────
// Floating card — rendered in a portal-like fixed overlay so it never
// stretches the table row it belongs to
const NotifyComposeForm = ({ target, adminName, onSend, onCancel, templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm]       = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const remaining = 255 - form.message.length;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // When a template is selected, pre-fill the form
  const handleSelectTemplate = (t) => {
    if (selectedTemplate === t._id) {
      // Deselect — clear form
      setSelectedTemplate(null);
      setForm({ title: "", message: "" });
    } else {
      setSelectedTemplate(t._id);
      setForm({ title: t.title, message: t.message });
    }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) { setError("Title and message are required."); return; }
    setLoading(true); setError("");
    try {
      await onSend(form.title.trim(), form.message.trim());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send.");
      setLoading(false);
    }
  };

  return (
    // Fixed overlay — form floats over the page, never affects table layout
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[150]"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-[380px] mx-4"
        style={{ border: "1.5px solid #f59e0b" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-[14px]">
          <div>
            <div className="text-[13px] font-semibold text-[var(--text)]">
              {target === "all" ? "📢 Broadcast to All Admins" : `🔔 Notify ${adminName}`}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">
              {target === "all" ? "Sends to all admins except you" : `Direct message to ${adminName}`}
            </div>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)] text-base">×</button>
        </div>

        {/* Saved templates picker */}
        {templates.length > 0 && (
          <div className="mb-[12px]">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.5px] mb-[6px]">Use Saved Template</div>
            <div
              className="notif-scroll flex flex-col gap-[5px] overflow-y-auto"
              style={{ maxHeight: 130 }}
            >
              {templates.map((t) => (
                <div
                  key={t._id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`flex items-start gap-2 px-[10px] py-[8px] rounded-[7px] border cursor-pointer transition-all ${
                    selectedTemplate === t._id
                      ? "border-[#f59e0b] bg-[rgba(245,158,11,0.08)]"
                      : "border-[var(--border)] hover:border-[#f59e0b]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[var(--text)] truncate">{t.title}</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-[1px]">{t.message}</div>
                  </div>
                  {selectedTemplate === t._id && (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="#f59e0b" className="flex-shrink-0 mt-[2px]">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-[6px]">Or write a custom message below</div>
            <div className="border-b border-[var(--border)] mt-[8px]" />
          </div>
        )}

        {error && <div className="text-[11px] text-[var(--danger)] bg-[var(--danger-light)] px-2 py-[6px] rounded-[5px] mb-[10px]">{error}</div>}

        <div className="flex flex-col gap-[10px]">
          <input
            type="text" value={form.title} onChange={set("title")}
            placeholder="Title" maxLength={100} className="input w-full text-xs"
            autoFocus={templates.length === 0}
          />
          <div>
            <textarea
              value={form.message} onChange={set("message")}
              placeholder="Message..." maxLength={255} rows={3}
              className="input w-full resize-none text-xs"
            />
            <div className={`text-[10px] text-right mt-[3px] ${remaining < 30 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
              {remaining} chars left
            </div>
          </div>
          <div className="flex gap-2 pt-[2px]">
            <button className="btn text-xs flex-1" onClick={onCancel} disabled={loading}>Cancel</button>
            <button
              className="btn text-xs flex-1 font-semibold"
              style={{ background: "#f59e0b", color: "#fff", border: "none" }}
              onClick={handleSend}
              disabled={loading || !form.title.trim() || !form.message.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ManageAdmins ─────────────────────────────────────────────────────────────
const ManageAdmins = () => {
  const { admin } = useAuth();
  const navigate  = useNavigate();
  const [admins, setAdmins]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm]             = useState(null);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  // ── Notification state ─────────────────────────────────────────────────────
  const [notifyTarget, setNotifyTarget]   = useState(null); // adminId | "all" | null
  const [notifToast, setNotifToast]       = useState(null);
  const [templates, setTemplates]         = useState([]);

  const showNotifToast = (type, msg) => {
    setNotifToast({ type, msg });
    setTimeout(() => setNotifToast(null), 3500);
  };

  // Load saved notification templates for the picker
  useEffect(() => {
    api.get("/admin/notification-templates")
      .then((res) => setTemplates(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSendToAdmin = async (adminId, title, message) => {
    await api.post("/admin/notifications/admin/send", { adminId, title, message });
    showNotifToast("success", "Notification sent.");
    setNotifyTarget(null);
  };

  // Broadcast excludes self by filtering on the backend — but backend includes all admins+superadmins.
  // We pass excludeId so the backend (or we filter client-side on result) skips the sender.
  // Since the backend broadcastAdmins doesn't support excludeId, we send to all and that's
  // acceptable — superadmin sending to all admins is an intentional broadcast.
  // Fix #4: superadmin who clicks "Notify All" should NOT receive their own broadcast.
  // We handle this by calling individual send for each admin except self.
  const handleBroadcastAdmins = async (title, message) => {
    // Send individually to all admins/superadmins except self
    const targets = admins.filter((a) => a._id !== admin.id);
    if (targets.length === 0) {
      showNotifToast("error", "No other admins to notify.");
      setNotifyTarget(null);
      return;
    }
    await Promise.allSettled(
      targets.map((a) =>
        api.post("/admin/notifications/admin/send", { adminId: a._id, title, message })
      )
    );
    showNotifToast("success", `Sent to ${targets.length} admin${targets.length !== 1 ? "s" : ""}.`);
    setNotifyTarget(null);
  };

  useEffect(() => {
    if (admin && admin.role !== "superadmin") navigate("/dashboard");
  }, [admin, navigate]);

  const fetchAdmins = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res = await api.get("/admin/admins");
      setAdmins(res.data.data);
      setError("");
    } catch {
      setError("Failed to load admins.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => {
    if (admin?.role === "superadmin") {
      fetchAdmins();
      const i = setInterval(fetchAdmins, POLL_INTERVAL);
      return () => clearInterval(i);
    }
  }, [fetchAdmins, admin]);

  useEffect(() => { registerRefresh(fetchAdmins); }, [registerRefresh, fetchAdmins]);

  const handleDemote = async (adminId) => {
    setActionLoading(adminId + "demote");
    try {
      await api.patch(`/admin/demote/${adminId}`);
      await fetchAdmins();
      setConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to demote admin.");
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (adminId) => {
    setActionLoading(adminId + "delete");
    try {
      await api.delete(`/admin/delete-admin/${adminId}`);
      await fetchAdmins();
      setConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete admin.");
    } finally { setActionLoading(null); }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "A";

  const AdminAvatar = ({ name, isSuperadmin, isOnline }) => (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      <div
        className="flex items-center justify-center text-[11px] font-semibold text-white"
        style={{ width: "34px", height: "34px", borderRadius: "50%", background: isSuperadmin ? "#7c3aed" : "#16a34a" }}
      >
        {getInitials(name)}
      </div>
      <span
        title={isOnline ? "Online" : "Offline"}
        style={{
          position: "absolute", bottom: "0px", right: "0px",
          width: "9px", height: "9px", borderRadius: "50%",
          background: isOnline ? "#10b981" : "#9ca3af",
          border: "2px solid var(--card-bg)",
          boxShadow: isOnline ? "0 0 0 2px rgba(16,185,129,0.25)" : "none",
          animation: isOnline ? "pulse-dot 2s infinite" : "none",
        }}
      />
    </div>
  );

  if (!admin || admin.role !== "superadmin") return null;

  if (loading) return (
    <Layout>
      <Topbar title="Manage Admins" subtitle="View and manage administrators" />
      <div className="main-content"><div className="loading">Loading admins...</div></div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar title="Manage Admins" subtitle="View and manage administrators" />
      <div className="main-content"><div className="text-[var(--danger)]">{error}</div></div>
    </Layout>
  );

  // Admins only (exclude self) for individual notify — includes other superadmins
  const otherAdmins = admins.filter((a) => a._id !== admin.id);

  return (
    <Layout>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50%       { box-shadow: 0 0 0 3px rgba(16,185,129,0); }
        }
        @keyframes bell-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%       { box-shadow: 0 0 0 4px rgba(245,158,11,0); }
        }
      `}</style>

      <Topbar title="Manage Admins" subtitle="View and manage administrators" />
      <div className="main-content">

        {/* Toast */}
        {notifToast && (
          <div
            className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-[8px] text-[13px] font-medium shadow-lg ${
              notifToast.type === "success" ? "bg-[var(--success)] text-white" : "bg-[var(--danger)] text-white"
            }`}
            style={{ maxWidth: 340 }}
          >
            {notifToast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)] m-0">Administrators</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-0">
              Total: {admins.length} admin{admins.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Broadcast to all admins */}
            {otherAdmins.length > 0 && (
              <button
                className="btn flex items-center gap-[6px] text-xs"
                style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                onClick={() => setNotifyTarget(notifyTarget === "all" ? null : "all")}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                </svg>
                Notify All Admins
              </button>
            )}
            <button className="btn btn-primary flex items-center gap-[6px]" onClick={() => navigate("/admin/create")}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Admin
            </button>
          </div>
        </div>

        {/* Broadcast-all compose form — fixed modal */}
        {notifyTarget === "all" && (
          <NotifyComposeForm
            target="all"
            adminName=""
            onSend={handleBroadcastAdmins}
            onCancel={() => setNotifyTarget(null)}
            templates={templates}
          />
        )}

        {/* Individual admin notify — fixed modal, never inside table row */}
        {notifyTarget && notifyTarget !== "all" && (() => {
          const targetAdmin = admins.find((a) => a._id === notifyTarget);
          return targetAdmin ? (
            <NotifyComposeForm
              target={targetAdmin._id}
              adminName={targetAdmin.name}
              onSend={(title, message) => handleSendToAdmin(targetAdmin._id, title, message)}
              onCancel={() => setNotifyTarget(null)}
              templates={templates}
            />
          ) : null;
        })()}

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-[var(--text-muted)] p-[30px]">No admins found</td>
                  </tr>
                ) : (
                  admins.map((adminUser) => {
                    const isSuperadmin = adminUser.role === "superadmin";
                    const isSelf       = adminUser._id === admin.id;
                    const isNotifyOpen = notifyTarget === adminUser._id;

                    return (
                      <tr key={adminUser._id}>

                        {/* Admin — avatar + name */}
                        <td>
                          <div className="flex items-center gap-[10px]">
                            <AdminAvatar name={adminUser.name} isSuperadmin={isSuperadmin} isOnline={adminUser.isOnline} />
                            <div className="font-medium text-[13px] text-[var(--text)]">
                              {adminUser.name}
                              {isSelf && <span className="text-[10px] text-[var(--text-muted)] ml-[6px]">(You)</span>}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="text-[var(--text-muted)] text-xs">{adminUser.email}</td>

                        {/* Role */}
                        <td>
                          {isSuperadmin
                            ? <span className="badge font-semibold text-white" style={{ background: "#7c3aed" }}>Superadmin</span>
                            : <span className="badge font-semibold text-white" style={{ background: "#16a34a" }}>Admin</span>
                          }
                        </td>

                        {/* Joined */}
                        <td className="text-[var(--text-muted)] text-xs">{formatDate(adminUser.createdAt)}</td>

                        {/* Actions — buttons only, form opens as fixed modal above */}
                        <td>
                          <div className="flex gap-[6px] flex-wrap">
                            {/* Notify — all non-self admins including other superadmins */}
                            {!isSelf && (
                              <button
                                className="btn flex items-center gap-[5px]"
                                style={{ fontSize: "11px", padding: "4px 10px", borderColor: "#f59e0b", color: "#f59e0b" }}
                                onClick={() => setNotifyTarget(isNotifyOpen ? null : adminUser._id)}
                                title="Send notification"
                              >
                                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                                </svg>
                                Notify
                              </button>
                            )}
                            {/* Demote / Delete — only for non-superadmin, non-self */}
                            {!isSuperadmin && !isSelf && (
                              <>
                                <button
                                  className="btn btn-warning"
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                  disabled={actionLoading === adminUser._id + "demote"}
                                  onClick={() => setConfirm({ action: "demote", admin: adminUser })}
                                >
                                  {actionLoading === adminUser._id + "demote" ? "..." : "Demote"}
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                  disabled={actionLoading === adminUser._id + "delete"}
                                  onClick={() => setConfirm({ action: "delete", admin: adminUser })}
                                >
                                  {actionLoading === adminUser._id + "delete" ? "..." : "Delete"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
          <div className="card w-full max-w-[400px] mx-4">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">
              Confirm {confirm.action === "demote" ? "Demotion" : "Deletion"}
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              {confirm.action === "demote" ? (
                <>Are you sure you want to <strong>demote</strong> <strong>{confirm.admin.name}</strong> to a regular user?<br /><br />They will lose admin panel access but keep their account and wallet.</>
              ) : (
                <>Are you sure you want to <strong>permanently delete</strong> <strong>{confirm.admin.name}</strong>?<br /><br />This will delete their account, wallet, goals, and all transactions. This action cannot be undone.</>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className={confirm.action === "delete" ? "btn btn-danger" : "btn btn-warning"}
                onClick={() => confirm.action === "demote" ? handleDemote(confirm.admin._id) : handleDelete(confirm.admin._id)}
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

export default ManageAdmins;