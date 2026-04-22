import { useTheme } from "../context/ThemeContext";
import { useLayout } from "../context/LayoutContext";
import { useRefresh } from "../context/RefreshContext";
import useWindowSize from "../hooks/useWindowSize";

const Topbar = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme();
  const { openSidebar } = useLayout();
  const { isMobile } = useWindowSize();
  
  // Get refresh state from context
  const { refreshing, lastUpdated, triggerRefresh } = useRefresh();

  const getSubtitle = () => {
    if (lastUpdated) return `Last updated ${lastUpdated.toLocaleTimeString()}`;
    return subtitle;
  };

  // Check if refresh is available (page registered a refresh function)
  const hasRefresh = triggerRefresh !== null;

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

        {/* Hamburger — only on mobile */}
        {isMobile && (
          <button
            onClick={openSidebar}
            style={{
              background: "none", border: "none",
              cursor: "pointer", padding: "4px",
              color: "var(--text)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        <div>
          <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "600", color: "var(--text)" }}>
            {title}
          </div>
          {getSubtitle() && !isMobile && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
              {getSubtitle()}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

        {/* Refresh button — automatically shown if page has refresh */}
        {hasRefresh && (
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="btn"
            style={{
              fontSize: "12px", padding: "6px 12px",
              opacity: refreshing ? 0.6 : 1,
              cursor: refreshing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            <svg
              width="13" height="13" viewBox="0 0 20 20" fill="currentColor"
              style={{
                animation: refreshing ? "spin 0.8s linear infinite" : "none",
              }}
            >
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {!isMobile && (refreshing ? "Refreshing..." : "Refresh")}
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          {theme === "light" ? (
            <>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              {!isMobile && "Dark"}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
              {!isMobile && "Light"}
            </>
          )}
        </button>

        <div style={{
          background: "var(--accent-light)",
          color: "var(--accent-text)",
          fontSize: "11px", fontWeight: "500",
          padding: "4px 10px", borderRadius: "20px",
        }}>
          Admin
        </div>
      </div>

      {/* Spin animation for refresh icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};

export default Topbar;