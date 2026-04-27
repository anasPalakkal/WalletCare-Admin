import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLayout } from "../context/LayoutContext";
import { useRefresh } from "../context/RefreshContext";
import { useAuth } from "../context/AuthContext";
import useWindowSize from "../hooks/useWindowSize";
import api from "../api/axios";

// ─── constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL    = 30000; // poll for new admin notifications every 30s
const NOTIF_FETCH_LIMIT = 20;

const formatTime = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// ─── AdminNotificationDropdown ────────────────────────────────────────────────
const AdminNotificationDropdown = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(`/notifications?category=SYSTEM&limit=${NOTIF_FETCH_LIMIT}`);
      setNotifications(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all", { category: "SYSTEM" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silent */ }
    finally { setMarkingAll(false); }
  };

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <div
      ref={dropdownRef}
      className="card p-0 overflow-hidden"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 340,
        maxHeight: 480,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[12px] border-b border-[var(--border)] flex-shrink-0">
        <div>
          <div className="text-[13px] font-semibold text-[var(--text)]">Admin Notifications</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-[1px]">
            {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              className="text-[11px] text-[var(--accent)] bg-transparent border-none cursor-pointer"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? "..." : "Mark all read"}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)] text-base"
          >×</button>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ overflowY: "auto", flex: 1 }} className="notif-scroll">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-[12px] text-[var(--text-muted)]">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-4">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--text-muted)">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>
            <div className="text-[12px] text-[var(--text-muted)] text-center">No notifications yet</div>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`flex items-start gap-3 px-4 py-[12px] border-b border-[var(--border)] last:border-0 transition-colors ${
                  n.isRead ? "opacity-60" : "cursor-pointer hover:bg-[var(--bg)]"
                }`}
              >
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-[4px]">
                  {n.isRead ? (
                    <div className="w-[8px] h-[8px] rounded-full" style={{ background: "var(--border)" }} />
                  ) : (
                    <div
                      className="w-[8px] h-[8px] rounded-full"
                      style={{
                        background: "#f59e0b",
                        boxShadow: "0 0 0 2px rgba(245,158,11,0.25)",
                        animation: "bell-badge-pulse 2s infinite",
                      }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{n.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-[3px] leading-[1.5]">{n.message}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-[5px]">{formatTime(n.createdAt)}</div>
                </div>

                {/* Mark read hint */}
                {!n.isRead && (
                  <div className="flex-shrink-0 mt-[3px]">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="#f59e0b">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ title, subtitle }) => {
  const { theme, toggleTheme }  = useTheme();
  const { openSidebar }         = useLayout();
  const { isMobile }            = useWindowSize();
  const { refreshing, lastUpdated, triggerRefresh } = useRefresh();
  const { admin }               = useAuth();

  const [bellOpen, setBellOpen]         = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [bellBlink, setBellBlink]       = useState(false);
  const prevUnreadRef                   = useRef(0);
  const bellRef                         = useRef(null);

  const hasRefresh = triggerRefresh !== null;

  const getSubtitle = () => {
    if (lastUpdated) return `Last updated ${lastUpdated.toLocaleTimeString()}`;
    return subtitle;
  };

  // ── Poll for unread SYSTEM notifications (admin receives from superadmin) ──
  const pollUnread = useCallback(async () => {
    if (!admin) return;
    try {
      const res = await api.get(`/notifications?category=SYSTEM&limit=1`);
      const count = res.data?.unreadCount ?? 0;
      if (count > prevUnreadRef.current) {
        // New notification arrived — trigger amber blink
        setBellBlink(true);
        setTimeout(() => setBellBlink(false), 4000);
      }
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch { /* silent */ }
  }, [admin]);

  useEffect(() => {
    pollUnread();
    const interval = setInterval(pollUnread, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollUnread]);

  // When dropdown closes, re-poll so badge reflects marked-as-read
  const handleBellClose = () => {
    setBellOpen(false);
    pollUnread();
  };

  // Inject scrollbar + bell animation styles once
  useEffect(() => {
    if (document.getElementById("notif-scroll-style")) return;
    const tag = document.createElement("style");
    tag.id = "notif-scroll-style";
    tag.textContent = `
      .notif-scroll::-webkit-scrollbar { width: 5px; }
      .notif-scroll::-webkit-scrollbar-track { background: transparent; }
      .notif-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      .notif-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
      @keyframes bell-badge-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
        50%       { box-shadow: 0 0 0 4px rgba(245,158,11,0); }
      }
      @keyframes bell-blink {
        0%, 100% { color: var(--text); }
        25%, 75%  { color: #f59e0b; }
        50%       { color: #fbbf24; }
      }
    `;
    document.head.appendChild(tag);
  }, []);

  return (
    <header style={{
      background: "var(--sidebar-bg)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isMobile && (
          <button
            onClick={openSidebar}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text)", display: "flex", alignItems: "center" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div>
          <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "600", color: "var(--text)" }}>{title}</div>
          {getSubtitle() && !isMobile && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>{getSubtitle()}</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

        {/* Refresh */}
        {hasRefresh && (
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="btn"
            style={{ fontSize: "12px", padding: "6px 12px", opacity: refreshing ? 0.6 : 1, cursor: refreshing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {!isMobile && (refreshing ? "Refreshing..." : "Refresh")}
          </button>
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="btn" style={{ fontSize: "12px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "5px" }}>
          {theme === "light" ? (
            <><svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>{!isMobile && "Dark"}</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>{!isMobile && "Light"}</>
          )}
        </button>

        {/* ── Notification Bell ── */}
        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="btn"
            style={{
              fontSize: "12px", padding: "6px 10px",
              display: "flex", alignItems: "center", gap: "5px",
              position: "relative",
              animation: bellBlink ? "bell-blink 0.6s ease-in-out 6" : "none",
              color: bellBlink ? "#f59e0b" : undefined,
            }}
            title="Admin notifications"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "2px", right: "2px",
                  minWidth: "16px", height: "16px",
                  borderRadius: "99px",
                  background: "#f59e0b",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  lineHeight: 1,
                  animation: "bell-badge-pulse 2s infinite",
                  border: "2px solid var(--sidebar-bg)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && <AdminNotificationDropdown onClose={handleBellClose} />}
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};

export default Topbar;