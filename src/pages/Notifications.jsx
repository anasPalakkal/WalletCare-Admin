import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";

// ─── constants ────────────────────────────────────────────────────────────────

export const FILTERS = [
  { key: "active",           label: "All Active Users",         icon: "👥" },
  { key: "premium",          label: "Premium Users Only",       icon: "⭐" },
  { key: "free",             label: "Free Users Only",          icon: "🆓" },
  { key: "verified",         label: "Verified Only",            icon: "✅" },
  { key: "all",              label: "All Users (incl. banned)", icon: "🌐" },
  { key: "banned",           label: "Banned Users",             icon: "🚫" },
  { key: "pending_deletion", label: "Pending Deletion",         icon: "🗑️"  },
];

const HISTORY_KEY = "walletcare_notif_history";
const MAX_HISTORY = 50;

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch { /* storage full — silently skip */ }
}

// ─── scrollbar style (dark-mode aware) injected once ─────────────────────────
const SCROLL_STYLE = `
  .notif-scroll::-webkit-scrollbar { width: 5px; }
  .notif-scroll::-webkit-scrollbar-track { background: transparent; }
  .notif-scroll::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 99px;
  }
  .notif-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-[8px] text-[13px] font-medium shadow-lg ${
        toast.type === "success" ? "bg-[var(--success)] text-white" : "bg-[var(--danger)] text-white"
      }`}
      style={{ maxWidth: 360 }}
    >
      {toast.msg}
    </div>
  );
};

// ─── CreateTemplateForm ───────────────────────────────────────────────────────
const CreateTemplateForm = ({ onCreated, onCancel, defaultFilter = "active" }) => {
  const [form, setForm]       = useState({ title: "", message: "", filter: defaultFilter });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const remaining = 255 - form.message.length;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) { setError("Title and message are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await api.post("/admin/notification-templates", {
        title: form.title.trim(), message: form.message.trim(), filter: form.filter,
      });
      onCreated(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save template.");
    } finally { setLoading(false); }
  };

  return (
    <div className="card border border-[var(--accent)] mt-[14px]">
      <div className="flex items-center justify-between mb-[14px]">
        <div className="text-[13px] font-semibold text-[var(--text)]">New Notification Template</div>
        <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors bg-transparent border-none cursor-pointer text-base">×</button>
      </div>
      {error && <div className="text-[12px] text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[6px] mb-3">{error}</div>}
      <div className="flex flex-col gap-[12px]">
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.5px] uppercase block mb-[6px]">Title <span className="text-[var(--danger)]">*</span></label>
          <input type="text" value={form.title} onChange={set("title")} placeholder="e.g. Special Offer for Premium Users" maxLength={100} className="input w-full" autoFocus />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.5px] uppercase block mb-[6px]">Message <span className="text-[var(--danger)]">*</span></label>
          <textarea value={form.message} onChange={set("message")} placeholder="Write your notification message..." maxLength={255} rows={3} className="input w-full resize-none" style={{ lineHeight: "1.55" }} />
          <div className={`text-[11px] mt-[4px] text-right ${remaining < 30 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>{remaining} chars left</div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.5px] uppercase block mb-[6px]">Default Target Audience</label>
          <select value={form.filter} onChange={set("filter")} className="input w-full">
            {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-[4px]">
          <button className="btn flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={loading || !form.title.trim() || !form.message.trim()}>
            {loading ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── TemplateCard ─────────────────────────────────────────────────────────────
const TemplateCard = ({ template, selected, onSelect, onDelete }) => {
  const filterMeta = FILTERS.find((f) => f.key === template.filter);
  return (
    <div onClick={onSelect} className={`group flex items-start gap-3 p-[13px] rounded-lg border cursor-pointer transition-all ${selected ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-[var(--surface,var(--bg))] hover:border-[var(--accent)]"}`}>
      <div className="w-8 h-8 rounded-[8px] bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 mt-[1px]">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent)">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text)] truncate">{template.title}</div>
        <div className="text-[11px] text-[var(--text-muted)] mt-[3px] line-clamp-2 leading-[1.5]">{template.message}</div>
        <div className="flex items-center gap-[6px] mt-[6px] flex-wrap">
          <span className="text-[10px] px-[6px] py-[2px] rounded-[4px] bg-[var(--accent-light)] text-[var(--accent)] font-medium">{filterMeta?.icon} {filterMeta?.label}</span>
          {template.broadcastCount > 0 && <span className="text-[10px] px-[6px] py-[2px] rounded-[4px] bg-[var(--success-light)] text-[var(--success)] font-medium">Sent {template.broadcastCount}×</span>}
          <span className="text-[10px] text-[var(--text-muted)]">{formatDate(template.createdAt)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        {selected && (
          <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--accent)">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(template._id); }}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger-light)]"
          title="Delete"
        >
          <svg width="10" height="10" viewBox="0 0 20 20" fill="var(--danger)">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── HistoryRow ───────────────────────────────────────────────────────────────
const HistoryRow = ({ item }) => {
  const filterMeta = FILTERS.find((f) => f.key === item.filter);
  return (
    <div className="flex items-start gap-3 py-[10px] border-b border-[var(--border)] last:border-0">
      <div className="w-7 h-7 rounded-[7px] bg-[var(--success-light)] flex items-center justify-center flex-shrink-0 mt-[1px]">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="var(--success)">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[var(--text)] truncate">{item.title}</div>
        <div className="text-[11px] text-[var(--text-muted)] mt-[2px] line-clamp-1">{item.message}</div>
        <div className="flex items-center gap-[6px] mt-[5px] flex-wrap">
          <span className="text-[10px] px-[6px] py-[1px] rounded-[4px] bg-[var(--success-light)] text-[var(--success)] font-medium">{item.result?.sent ?? "?"} delivered</span>
          {item.result?.failed > 0 && <span className="text-[10px] px-[6px] py-[1px] rounded-[4px] bg-[var(--danger-light)] text-[var(--danger)] font-medium">{item.result.failed} failed</span>}
          <span className="text-[10px] text-[var(--text-muted)]">{filterMeta?.icon} {filterMeta?.label}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{formatDate(item.sentAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── QuickInlineForm ──────────────────────────────────────────────────────────
// Renders OUTSIDE the scroll container so it's never clipped
const QuickInlineForm = ({ segment, onSend, onClose }) => {
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await onSend(segment, title, message);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-[10px] rounded-[8px] border border-[var(--accent)] overflow-hidden">
      <div className="flex items-center px-3 py-[8px] border-b border-[var(--border)]" style={{ background: "var(--accent-light)" }}>
        <span className="text-[12px] font-semibold text-[var(--accent)] flex-1">{segment.icon} Sending to {segment.label}</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)] text-base leading-none">×</button>
      </div>
      <div className="px-3 py-3 flex flex-col gap-[8px]" style={{ background: "var(--bg)" }}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input w-full text-xs" maxLength={100} autoFocus />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message..." className="input w-full resize-none text-xs" rows={2} maxLength={255} />
        <div className="flex gap-2">
          <button className="btn text-xs flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary text-xs flex-1" onClick={handleSend} disabled={loading || !title.trim() || !message.trim()}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── QuickSegmentRow ──────────────────────────────────────────────────────────
const QuickSegmentRow = ({ segment, openKey, setOpenKey, onFilterClick, isFilterActive, templateCount }) => {
  const isOpen = openKey === segment.key;
  return (
    <div className={`rounded-[8px] border overflow-hidden transition-colors ${isOpen ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
      <div className="flex items-center">
        <button
          onClick={onFilterClick}
          className={`flex-1 flex items-center gap-2 px-3 py-[9px] bg-transparent border-none cursor-pointer text-left transition-colors ${isFilterActive ? "bg-[var(--accent-light)]" : "hover:bg-[var(--bg)]"}`}
        >
          <span className="text-[13px]">{segment.icon}</span>
          <span className="text-[12px] text-[var(--text)] font-medium">{segment.label}</span>
          {templateCount > 0 && (
            <span className="text-[10px] px-[5px] py-[1px] rounded-[4px] bg-[var(--accent-light)] text-[var(--accent)] font-medium ml-auto">{templateCount}</span>
          )}
        </button>
        <button
          onClick={() => setOpenKey(isOpen ? null : segment.key)}
          className={`px-3 py-[9px] border-none border-l border-[var(--border)] cursor-pointer transition-colors flex-shrink-0 ${isOpen ? "bg-[var(--accent-light)] text-[var(--accent)]" : "bg-transparent text-[var(--accent)] hover:bg-[var(--accent-light)]"}`}
          title="Quick send"
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Notifications (main page) ────────────────────────────────────────────────
const Notifications = () => {
  const [templates, setTemplates]               = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selected, setSelected]                 = useState(null);
  const [showCreate, setShowCreate]             = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);
  const [quickOpenKey, setQuickOpenKey]           = useState(null); // which quick-row form is open
  // History loaded from localStorage so it survives navigation
  const [history, setHistory]                   = useState(() => loadHistory());
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const [toast, setToast]                       = useState(null);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd } = useRefresh();

  // Inject scrollbar CSS once
  useEffect(() => {
    if (document.getElementById("notif-scroll-style")) return;
    const tag = document.createElement("style");
    tag.id = "notif-scroll-style";
    tag.textContent = SCROLL_STYLE;
    document.head.appendChild(tag);
  }, []);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  // Persist history to localStorage whenever it changes
  useEffect(() => { saveHistory(history); }, [history]);

  const pushHistory = (item) =>
    setHistory((prev) => {
      const next = [item, ...prev];
      saveHistory(next);
      return next;
    });

  const fetchTemplates = useCallback(async () => {
    handleRefreshStart();
    try {
      const res = await api.get("/admin/notification-templates");
      setTemplates(res.data.data || []);
    } catch { /* silent */ } finally {
      setTemplatesLoading(false);
      handleRefreshEnd();
    }
  }, [handleRefreshStart, handleRefreshEnd]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { registerRefresh(fetchTemplates); }, [registerRefresh, fetchTemplates]);

  const handleCreated = (t) => {
    setTemplates((prev) => [t, ...prev]);
    setSelected(t._id);
    setShowCreate(false);
    showToast("success", "Template saved.");
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/notification-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      if (selected === id) setSelected(null);
      showToast("success", "Template deleted.");
    } catch { showToast("error", "Delete failed."); }
  };

  const selectedTemplate   = templates.find((t) => t._id === selected);
  const selectedFilterMeta = selectedTemplate ? FILTERS.find((f) => f.key === selectedTemplate.filter) : null;
  const filteredTemplates  = activeQuickFilter ? templates.filter((t) => t.filter === activeQuickFilter) : templates;

  // ── Broadcast via saved template ───────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!selectedTemplate) return;
    setBroadcastLoading(true); setBroadcastConfirm(false);
    try {
      const res    = await api.post(`/admin/notification-templates/${selectedTemplate._id}/broadcast`);
      const result = res.data.data;
      setTemplates((prev) => prev.map((t) =>
        t._id === selectedTemplate._id
          ? { ...t, broadcastCount: (t.broadcastCount || 0) + 1, lastBroadcastAt: new Date().toISOString(), lastBroadcastResult: result }
          : t
      ));
      pushHistory({ _id: `h_${Date.now()}`, title: selectedTemplate.title, message: selectedTemplate.message, filter: selectedTemplate.filter, sentAt: new Date().toISOString(), result });
      showToast("success", `Sent to ${result.sent ?? "?"} users (${result.failed ?? 0} failed).`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Broadcast failed.");
    } finally { setBroadcastLoading(false); }
  };

  // ── Quick broadcast — filter as query param (backend reads req.query.filter) ─
  // Also saves to templates so it appears in the Saved Templates list
  const handleQuickBroadcast = async (seg, title, message) => {
    try {
      // 1. Send the broadcast
      const res    = await api.post(`/admin/notifications/broadcast?filter=${seg.key}`, { message: message.trim(), title: title.trim() });
      const result = res.data?.data || res.data;

      // 2. Save as a template so it appears in the Saved Templates list
      try {
        const tmplRes = await api.post("/admin/notification-templates", {
          title: title.trim(), message: message.trim(), filter: seg.key,
        });
        const newTemplate = { ...tmplRes.data.data, broadcastCount: 1, lastBroadcastAt: new Date().toISOString() };
        setTemplates((prev) => [newTemplate, ...prev]);
      } catch { /* template save failed — broadcast already went out, don't block */ }

      // 3. Push to history
      pushHistory({ _id: `h_${Date.now()}`, title: title.trim(), message: message.trim(), filter: seg.key, sentAt: new Date().toISOString(), result });
      showToast("success", `Sent to ${result.sent ?? "?"} users in "${seg.label}".`);
    } catch (err) { showToast("error", err.response?.data?.message || "Failed."); }
  };

  return (
    <Layout>
      <Topbar title="Notifications" subtitle="Send and manage user notifications" />
      <div className="main-content">
        <Toast toast={toast} />

        {/* ── ROW 1: Broadcast + Quick Broadcast ── */}
        <div className="grid gap-[14px] mb-[14px]" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* Send Broadcast */}
          <div className="card">
            <div className="flex items-center gap-2 mb-[14px]">
              <div className="w-8 h-8 rounded-[8px] bg-[var(--accent-light)] flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--accent)">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Send Broadcast</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[1px]">Select a saved template then send</div>
              </div>
            </div>

            {!selectedTemplate ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-[8px] border border-dashed border-[var(--border)]" style={{ background: "var(--bg)" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--text-muted)">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                </svg>
                <div className="text-[12px] text-[var(--text-muted)] text-center">Select a template from the list below to send</div>
              </div>
            ) : (
              <div>
                <div className="p-3 rounded-[8px] border border-[var(--border)] mb-3" style={{ background: "var(--bg)" }}>
                  <div className="text-[12px] font-semibold text-[var(--text)] mb-1">{selectedTemplate.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] leading-[1.5] mb-2">{selectedTemplate.message}</div>
                  <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[var(--accent-light)] text-[var(--accent)] font-medium">{selectedFilterMeta?.icon} {selectedFilterMeta?.label}</span>
                  {selectedTemplate.lastBroadcastAt && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-2">Last sent: {formatDate(selectedTemplate.lastBroadcastAt)} · {selectedTemplate.broadcastCount}× total</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn text-xs flex-1" onClick={() => setSelected(null)}>Deselect</button>
                  <button className="btn btn-primary text-xs flex-1" onClick={() => setBroadcastConfirm(true)} disabled={broadcastLoading}>
                    {broadcastLoading ? "Sending..." : "Send Broadcast"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Broadcast — 5 segments, open form renders BELOW scroll so never clipped */}
          <div className="card flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center gap-2 mb-[14px] flex-shrink-0">
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="#f59e0b">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Quick Broadcast</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[1px]">Tap label to filter saved · ✈ to quick-send</div>
              </div>
            </div>

            {/* Scroll container only holds the segment label rows — no forms */}
            <div className="notif-scroll flex flex-col gap-[7px] overflow-y-auto flex-shrink-0" style={{ maxHeight: 200 }}>
              {FILTERS.filter((f) => !["verified", "pending_deletion"].includes(f.key)).map((seg) => (
                <QuickSegmentRow
                  key={seg.key}
                  segment={seg}
                  openKey={quickOpenKey}
                  setOpenKey={setQuickOpenKey}
                  onSend={handleQuickBroadcast}
                  onFilterClick={() => setActiveQuickFilter(activeQuickFilter === seg.key ? null : seg.key)}
                  isFilterActive={activeQuickFilter === seg.key}
                  templateCount={templates.filter((t) => t.filter === seg.key).length}
                />
              ))}
            </div>

            {/* Active quick-send form renders here — outside scroll, always fully visible */}
            {quickOpenKey && (() => {
              const seg = FILTERS.find((f) => f.key === quickOpenKey);
              return seg ? (
                <QuickInlineForm
                  key={quickOpenKey}
                  segment={seg}
                  onSend={handleQuickBroadcast}
                  onClose={() => setQuickOpenKey(null)}
                />
              ) : null;
            })()}
          </div>
        </div>

        {/* ── ROW 2: Saved Templates + Broadcast History ── */}
        <div className="grid gap-[14px]" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* Saved Templates */}
          <div className="card p-0 overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
            <div className="px-4 py-[14px] border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Saved Templates</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[1px]">
                  {activeQuickFilter
                    ? `${filteredTemplates.length} · ${FILTERS.find((f) => f.key === activeQuickFilter)?.label}`
                    : `${templates.length} templates total`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeQuickFilter && (
                  <button className="text-[11px] text-[var(--accent)] bg-transparent border-none cursor-pointer" onClick={() => setActiveQuickFilter(null)}>Clear</button>
                )}
                <button className="btn btn-primary text-xs flex items-center gap-[5px]" onClick={() => setShowCreate((v) => !v)}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {showCreate ? "Cancel" : "New"}
                </button>
              </div>
            </div>

            {showCreate && (
              <div className="px-4 flex-shrink-0">
                <CreateTemplateForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} defaultFilter={activeQuickFilter || "active"} />
              </div>
            )}

            <div className="notif-scroll flex-1 overflow-y-auto">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-12 text-[12px] text-[var(--text-muted)]">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 px-6">
                  <div className="text-[13px] font-semibold text-[var(--text)] text-center">{activeQuickFilter ? "No templates for this segment" : "No templates yet"}</div>
                  <div className="text-[12px] text-[var(--text-muted)] text-center">Click "New" to create a reusable notification template</div>
                </div>
              ) : (
                <div className="flex flex-col gap-[8px] p-4">
                  {filteredTemplates.map((t) => (
                    <div key={t._id} className="group">
                      <TemplateCard template={t} selected={selected === t._id} onSelect={() => setSelected(t._id === selected ? null : t._id)} onDelete={handleDelete} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Broadcast History */}
          <div className="card p-0 overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
            <div className="px-4 py-[14px] border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Broadcast History</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-[1px]">{history.length} broadcasts saved</div>
              </div>
              {history.length > 0 && (
                <button
                  className="text-[11px] text-[var(--danger)] bg-transparent border-none cursor-pointer"
                  onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="notif-scroll flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 px-6">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="var(--text-muted)">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div className="text-[12px] text-[var(--text-muted)] text-center">No broadcast history yet</div>
                </div>
              ) : (
                <div className="px-4 py-2">
                  {history.map((item) => <HistoryRow key={item._id} item={item} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Broadcast Modal */}
        {broadcastConfirm && selectedTemplate && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
            <div className="card w-full max-w-[400px] mx-4">
              <div className="text-[15px] font-semibold text-[var(--text)] mb-2">Confirm Broadcast</div>
              <div className="text-[13px] text-[var(--text-muted)] mb-2 leading-[1.6]">
                You are about to send <strong>"{selectedTemplate.title}"</strong> to <strong>{selectedFilterMeta?.label}</strong>. This cannot be undone.
              </div>
              <div className="text-[12px] text-[var(--text-muted)] mb-5 px-3 py-2 rounded-[7px] border border-[var(--border)]" style={{ background: "var(--bg)" }}>{selectedTemplate.message}</div>
              <div className="flex gap-2 justify-end">
                <button className="btn" onClick={() => setBroadcastConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleBroadcast} disabled={broadcastLoading}>{broadcastLoading ? "Sending..." : "Yes, Send"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;