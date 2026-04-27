import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import useWindowSize from "../hooks/useWindowSize";
import { useRefresh } from "../context/RefreshContext";

const POLL_INTERVAL = 60000;

const CATEGORY_META = {
  "Bug Report":        { icon: "🐛", bg: "rgba(239,68,68,0.09)",   color: "#ef4444" },
  "Feature Request":   { icon: "✨", bg: "rgba(16,185,129,0.09)",  color: "#10b981" },
  "UI/UX Issue":       { icon: "🎨", bg: "rgba(139,92,246,0.09)",  color: "#8b5cf6" },
  "Transaction Issue": { icon: "💳", bg: "rgba(245,158,11,0.09)",  color: "#f59e0b" },
  "Security Concern":  { icon: "🔒", bg: "rgba(220,38,38,0.09)",   color: "#dc2626" },
  "Other":             { icon: "💬", bg: "rgba(100,116,139,0.09)", color: "#64748b" },
};

const Stars = ({ value }) => (
  <span className="text-[#f59e0b] tracking-[1px] text-[13px]">
    {"★".repeat(value || 0)}
    <span className="text-[var(--border)]">{"★".repeat(5 - (value || 0))}</span>
  </span>
);

const CategoryBadge = ({ cat, small }) => {
  const meta = CATEGORY_META[cat] || { icon: "💬", bg: "var(--bg)", color: "var(--text-muted)" };
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-[5px] font-medium whitespace-nowrap ${small ? "text-[10px] px-[7px] py-[2px]" : "text-[11px] px-[10px] py-[3px]"}`}
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.icon} {cat}
    </span>
  );
};

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
  const { isMobile, isTablet } = useWindowSize();
  const [user, setUser]           = useState(null);
  const [overview, setOverview]   = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm]     = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  // ── Notification panel ─────────────────────────────────────────────────────
  const [notifPanelOpen, setNotifPanelOpen]     = useState(false);
  const [templates, setTemplates]               = useState([]);
  const [templatesLoaded, setTemplatesLoaded]   = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCustomForm, setShowCustomForm]     = useState(false);
  const [customForm, setCustomForm]             = useState({ title: "", message: "" });
  const [customSaving, setCustomSaving]         = useState(false);
  const [notifSending, setNotifSending]         = useState(false);
  const [notifToast, setNotifToast]             = useState(null);

  const showNotifToast = (type, msg) => { setNotifToast({ type, msg }); setTimeout(() => setNotifToast(null), 3500); };

  // Inject dark-mode-aware scrollbar CSS once
  useEffect(() => {
    if (document.getElementById("notif-scroll-style")) return;
    const tag = document.createElement("style");
    tag.id = "notif-scroll-style";
    tag.textContent = `
      .notif-scroll::-webkit-scrollbar { width: 5px; }
      .notif-scroll::-webkit-scrollbar-track { background: transparent; }
      .notif-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      .notif-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
    `;
    document.head.appendChild(tag);
  }, []);

  // Write a sent notification into the shared localStorage history (same key as Notifications page)
  const pushToHistory = (notif, userName) => {
    try {
      const HISTORY_KEY = "walletcare_notif_history";
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const entry = {
        _id:     `h_${Date.now()}`,
        title:   notif.title,
        message: notif.message,
        filter:  `user:${userName}`,   // custom label so history shows who it went to
        sentAt:  new Date().toISOString(),
        result:  { sent: 1, failed: 0 },
      };
      localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, 50)));
    } catch { /* storage full — skip */ }
  };

  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    setTemplatesLoading(true);
    try {
      const res = await api.get("/admin/notification-templates");
      setTemplates(res.data.data || []);
      setTemplatesLoaded(true);
    } catch { showNotifToast("error", "Failed to load templates."); }
    finally { setTemplatesLoading(false); }
  }, [templatesLoaded]);

  const handleOpenNotifPanel = () => {
    setNotifPanelOpen((v) => { if (!v) loadTemplates(); return !v; });
  };

  const handleSaveCustom = async () => {
    if (!customForm.title.trim() || !customForm.message.trim()) return;
    setCustomSaving(true);
    try {
      const res = await api.post("/admin/notification-templates", {
        title: customForm.title.trim(), message: customForm.message.trim(), filter: "active",
      });
      const t = res.data.data;
      setTemplates((prev) => [t, ...prev]);
      setSelectedTemplate(t._id);
      setCustomForm({ title: "", message: "" });
      setShowCustomForm(false);
      showNotifToast("success", "Template saved. Select it and Send.");
    } catch (err) {
      showNotifToast("error", err.response?.data?.message || "Failed to save.");
    } finally { setCustomSaving(false); }
  };

  const handleSendNotif = async () => {
    const notif = templates.find((t) => t._id === selectedTemplate);
    if (!notif) return;
    setNotifSending(true);
    try {
      await api.post("/admin/notifications/send", { userId: id, title: notif.title, message: notif.message });
      pushToHistory(notif, user?.name || id);
      showNotifToast("success", `Sent "${notif.title}" to ${user?.name}.`);
      setSelectedTemplate(null);
    } catch (err) {
      showNotifToast("error", err.response?.data?.message || "Failed to send.");
    } finally { setNotifSending(false); }
  };

  const fetchAll = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const [userRes, overviewRes, feedbackRes] = await Promise.all([
        api.get(`/admin/users/${id}`),
        api.get(`/admin/users/${id}/overview`),
        api.get(`/admin/feedback`),
      ]);
      setUser(userRes.data.data);
      setOverview(overviewRes.data.data);
      setFeedbacks((feedbackRes.data.data || []).filter((f) => f.userId?._id === id));
      setError("");
    } catch {
      setError("Failed to load user data.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [id, handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, POLL_INTERVAL); return () => clearInterval(i); }, [fetchAll]);
  useEffect(() => { registerRefresh(fetchAll); }, [registerRefresh, fetchAll]);

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
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const formatDateShort = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (loading) return <Layout><Topbar title="User Detail" subtitle="View and manage user account" /><div className="main-content"><div className="loading">Loading user...</div></div></Layout>;
  if (error)   return <Layout><Topbar title="User Detail" subtitle="View and manage user account" /><div className="main-content"><div className="text-[var(--danger)]">{error}</div></div></Layout>;

  return (
    <Layout>
      <Topbar title="User Details" subtitle={user?.name} />
      <div className="main-content">

        <button className="btn text-xs mb-4" onClick={() => navigate("/users")}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Users
        </button>

        {/* Profile + Actions */}
        <div className="grid gap-[14px] mb-[14px]" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>

          {/* Profile Card */}
          <div className="card">
            <div className="flex items-center gap-[14px] mb-5">
              <div className="w-14 h-14 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-lg font-bold flex-shrink-0">
                {getInitials(user?.name)}
              </div>
              <div>
                <div className="text-base font-semibold text-[var(--text)]">{user?.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-[2px]">{user?.email}</div>
                <div className="flex gap-[6px] mt-[6px]">
                  {user?.isBanned ? <span className="badge badge-danger">Banned</span>
                    : user?.scheduledDeletionAt ? <span className="badge badge-warning">Scheduled Deletion</span>
                    : <span className="badge badge-success">Active</span>}
                  {user?.isPremium && <span className="badge badge-purple">Premium</span>}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-[14px]">
              {[
                { label: "User ID",        value: user?._id },
                { label: "Phone",          value: user?.phone || "—" },
                { label: "Account Type",   value: "User" },
                { label: "Verified",       value: user?.isEmailVerified ? "Yes" : "No" },
                { label: "Current Rating", value: user?.rating ? `${user.rating}/5 ★` : "Not rated", rating: true },
                { label: "Joined",         value: formatDate(user?.createdAt) },
                { label: "Last Updated",   value: formatDate(user?.updatedAt) },
                ...(user?.scheduledDeletionAt ? [{ label: "Deletes on", value: formatDate(user?.scheduledDeletionAt), danger: true }] : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  <span
                    className="text-xs font-medium max-w-[200px] text-right break-all"
                    style={{ color: item.danger ? "var(--danger)" : item.rating ? "#f59e0b" : "var(--text)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Card */}
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-[14px]">Admin Actions</div>
            <div className="flex flex-col gap-[10px]">

              {user?.isBanned ? (
                <div className="p-[14px] rounded-lg bg-[var(--success-light)] border border-[var(--success)]">
                  <div className="text-xs font-medium text-[var(--success-text)] mb-1">Unban User</div>
                  <div className="text-[11px] text-[var(--success-text)] opacity-80 mb-[10px]">Restore access to this user account</div>
                  <button className="btn btn-success text-xs" disabled={actionLoading === "unban"} onClick={() => setConfirm({ action: "unban" })}>
                    {actionLoading === "unban" ? "Processing..." : "Unban User"}
                  </button>
                </div>
              ) : (
                <div className="p-[14px] rounded-lg bg-[var(--danger-light)] border border-[var(--danger)]">
                  <div className="text-xs font-medium text-[var(--danger-text)] mb-1">Ban User</div>
                  <div className="text-[11px] text-[var(--danger-text)] opacity-80 mb-[10px]">Block this user from logging in</div>
                  <button className="btn btn-danger text-xs" disabled={actionLoading === "ban"} onClick={() => setConfirm({ action: "ban" })}>
                    {actionLoading === "ban" ? "Processing..." : "Ban User"}
                  </button>
                </div>
              )}

              <div className="p-[14px] rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="text-xs font-medium text-[var(--text)] mb-1">Force Logout</div>
                <div className="text-[11px] text-[var(--text-muted)] mb-[10px]">Invalidate all active sessions</div>
                <button className="btn text-xs" disabled={actionLoading === "logout"} onClick={() => setConfirm({ action: "logout" })}>
                  {actionLoading === "logout" ? "Processing..." : "Force Logout"}
                </button>
              </div>

              {/* ── Send Notification ───────────────────────────────────── */}
              <div className="p-[14px] rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-[var(--text)]">Send Notification</div>
                  {notifToast && (
                    <span className={`text-[10px] px-[6px] py-[1px] rounded-[4px] font-medium ${notifToast.type === "success" ? "bg-[var(--success-light)] text-[var(--success)]" : "bg-[var(--danger-light)] text-[var(--danger)]"}`}>
                      {notifToast.msg}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mb-[10px]">Send a direct notification to this user</div>

                <button className="btn text-xs flex items-center gap-[6px]" onClick={handleOpenNotifPanel}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                  </svg>
                  {notifPanelOpen ? "Hide" : "Open Notifications"}
                </button>

                {notifPanelOpen && (
                  <div className="mt-[12px] flex flex-col gap-[10px]">

                    {/* Template list — scrollable */}
                    <div>
                      <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.5px] mb-[6px]">Select Template</div>
                      {templatesLoading ? (
                        <div className="text-[11px] text-[var(--text-muted)] text-center py-4">Loading...</div>
                      ) : templates.length === 0 ? (
                        <div className="text-[11px] text-[var(--text-muted)] text-center py-4 bg-[var(--bg)] rounded-[7px] border border-dashed border-[var(--border)]">
                          No saved templates. Create a custom one below.
                        </div>
                      ) : (
                        <div
                          className="notif-scroll flex flex-col gap-[6px] overflow-y-auto pr-[2px]"
                          style={{ maxHeight: 200 }}
                        >
                          {templates.map((t) => (
                            <div
                              key={t._id}
                              onClick={() => setSelectedTemplate(t._id === selectedTemplate ? null : t._id)}
                              className={`flex items-start gap-2 p-[10px] rounded-[7px] border cursor-pointer transition-all ${
                                selectedTemplate === t._id
                                  ? "border-[var(--accent)] bg-[var(--accent-light)]"
                                  : "border-[var(--border)] hover:border-[var(--accent)]"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold text-[var(--text)] truncate">{t.title}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-[2px] line-clamp-1">{t.message}</div>
                              </div>
                              {selectedTemplate === t._id && (
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="var(--accent)" className="flex-shrink-0 mt-[2px]">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Send button */}
                    {selectedTemplate && (
                      <button className="btn btn-primary w-full text-xs" onClick={handleSendNotif} disabled={notifSending}>
                        {notifSending ? "Sending..." : `Send to ${user?.name}`}
                      </button>
                    )}

                    {/* Custom notification */}
                    <button
                      className="btn text-xs w-full flex items-center justify-center gap-[5px]"
                      onClick={() => setShowCustomForm((v) => !v)}
                    >
                      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      {showCustomForm ? "Cancel" : "Custom Notification"}
                    </button>

                    {showCustomForm && (
                      <div className="flex flex-col gap-[8px] pt-[8px] border-t border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-muted)]">This will be saved as a template and also appear in the Notifications page.</div>
                        <input
                          type="text"
                          value={customForm.title}
                          onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Title"
                          maxLength={100}
                          className="input w-full text-xs"
                          autoFocus
                        />
                        <textarea
                          value={customForm.message}
                          onChange={(e) => setCustomForm((f) => ({ ...f, message: e.target.value }))}
                          placeholder="Message..."
                          maxLength={255}
                          rows={3}
                          className="input w-full resize-none text-xs"
                        />
                        <button
                          className="btn btn-primary w-full text-xs"
                          onClick={handleSaveCustom}
                          disabled={customSaving || !customForm.title.trim() || !customForm.message.trim()}
                        >
                          {customSaving ? "Saving..." : "Save & Add to List"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {user?.scheduledDeletionAt && (
                <div className="p-[14px] rounded-lg bg-[var(--warning-light)] border border-[var(--warning)]">
                  <div className="text-xs font-medium text-[var(--warning-text)] mb-1">Restore Account</div>
                  <div className="text-[11px] text-[var(--warning-text)] opacity-80 mb-[10px]">Cancel scheduled deletion</div>
                  <button className="btn btn-success text-xs" disabled={actionLoading === "restore"} onClick={() => setConfirm({ action: "restore" })}>
                    {actionLoading === "restore" ? "Processing..." : "Restore Account"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* App Usage — 3 columns */}
        <div
          className="grid gap-[14px] mb-[14px]"
          style={{ gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr" }}
        >
          {/* Accounts */}
          <div className="card">
            <div className="flex items-center gap-2 mb-[14px]">
              <div className="w-7 h-7 rounded-[7px] bg-[var(--accent-light)] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent)">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" />
                </svg>
              </div>
              <div className="text-[13px] font-semibold text-[var(--text)]">Accounts</div>
            </div>
            <div className="text-[28px] font-bold text-[var(--text)] mb-1">{overview?.accounts?.total || 0}</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Total accounts</div>
            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
              {[
                { label: "Active", value: overview?.accounts?.active,       color: "var(--success)" },
                { label: "Frozen", value: overview?.accounts?.frozen,       color: "var(--warning)" },
                { label: "Closed", value: overview?.accounts?.closed,       color: "var(--danger)" },
                { label: "Cash",   value: overview?.accounts?.cashAccounts, color: "var(--text)" },
                { label: "Bank",   value: overview?.accounts?.bankAccounts, color: "var(--text)" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-2 mt-1">
                <div className="text-[11px] text-[var(--text-muted)] mb-1">Total Balance</div>
                <div className="text-base font-bold text-[var(--text)]">{formatCurrency(overview?.accounts?.totalBalance)}</div>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="card">
            <div className="flex items-center gap-2 mb-[14px]">
              <div className="w-7 h-7 rounded-[7px] bg-[var(--accent-light)] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent)">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-[13px] font-semibold text-[var(--text)]">Goals</div>
            </div>
            <div className="text-[28px] font-bold text-[var(--text)] mb-1">{overview?.goals?.total || 0}</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Total goals</div>
            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
              {[
                { label: "Active",    value: overview?.goals?.active,    color: "var(--success)" },
                { label: "Completed", value: overview?.goals?.completed, color: "var(--accent)" },
                { label: "Overdue",   value: overview?.goals?.overdue,   color: "var(--danger)" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-2 mt-1">
                <div className="text-[11px] text-[var(--text-muted)] mb-1">Target Amount</div>
                <div className="text-base font-bold text-[var(--text)]">{formatCurrency(overview?.goals?.totalTargetAmount)}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[6px] mb-1">Saved So Far</div>
                <div className="text-base font-bold text-[var(--success)]">{formatCurrency(overview?.goals?.totalCurrentAmount)}</div>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="card">
            <div className="flex items-center gap-2 mb-[14px]">
              <div className="w-7 h-7 rounded-[7px] bg-[var(--success-light)] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--success)">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-[13px] font-semibold text-[var(--text)]">Transactions</div>
            </div>
            <div className="text-[28px] font-bold text-[var(--text)] mb-1">{overview?.transactions?.total || 0}</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Total transactions</div>
            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)]">Top Category</span>
                <span className="text-xs font-semibold text-[var(--text)]">{overview?.transactions?.topCategory || "—"}</span>
              </div>
              <div className="border-t border-[var(--border)] pt-2 mt-1">
                <div className="text-[11px] text-[var(--text-muted)] mb-1">Total Income</div>
                <div className="text-base font-bold text-[var(--success)]">{formatCurrency(overview?.transactions?.totalIncome)}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[10px] mb-1">Total Expense</div>
                <div className="text-base font-bold text-[var(--danger)]">{formatCurrency(overview?.transactions?.totalExpense)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Table */}
        {feedbacks.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-[14px] border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--text)]">User Feedback History</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">All feedback submitted by this user</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Category</th><th>Description</th><th>Rating</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb._id}>
                      <td><CategoryBadge cat={fb.category} small /></td>
                      <td className="max-w-[300px]">
                        <div className="text-xs text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">{fb.description}</div>
                      </td>
                      <td>{fb.rating ? <Stars value={fb.rating} /> : <span className="text-[var(--text-muted)] text-xs">—</span>}</td>
                      <td className="text-[var(--text-muted)] text-xs whitespace-nowrap">{formatDateShort(fb.createdAt)}</td>
                      <td>
                        <button className="btn text-[11px] px-[10px] py-1" onClick={() => setSelectedFeedback(fb)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="card w-full max-w-[520px] max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-[18px] pb-[14px] border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text)]">Feedback Detail</div>
              <button onClick={() => setSelectedFeedback(null)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] text-xl leading-none">×</button>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <CategoryBadge cat={selectedFeedback.category} />
              {selectedFeedback.rating && <Stars value={selectedFeedback.rating} />}
              <div className="text-[11px] text-[var(--text-muted)] ml-auto">{formatDate(selectedFeedback.createdAt)}</div>
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.6px] uppercase mb-2">Description</div>
              <div className="text-[13px] text-[var(--text)] leading-[1.65] px-[14px] py-3 bg-[var(--bg)] border border-[var(--border)] rounded-[7px] whitespace-pre-wrap">
                {selectedFeedback.description}
              </div>
            </div>

            {selectedFeedback.screenshot && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.6px] uppercase mb-2">Screenshot</div>
                <a href={selectedFeedback.screenshot} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-[6px] text-xs text-[var(--accent)] no-underline px-3 py-[7px] border border-[var(--accent)] rounded-[6px] bg-[var(--accent-light)]">
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  View Screenshot
                </a>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button className="btn" onClick={() => setSelectedFeedback(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
          <div className="card w-full max-w-[360px] mx-4">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">
              Confirm {confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1)}
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              Are you sure you want to <strong>{confirm.action}</strong> user <strong>{user?.name}</strong>?
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={confirm.action === "ban" ? "btn btn-danger" : "btn btn-primary"} onClick={() => handleAction(confirm.action)}>
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