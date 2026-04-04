import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
    },
    {
      label: "Users",
      path: "/users",
      icon: (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zm-9.93-1a7 7 0 0114 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      label: "Feedback",
      path: "/feedback",
      icon: (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
  ];

  return (
    <aside style={{
      width: "220px",
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0,
    }}>

      <div style={{
        padding: "20px 16px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "var(--accent)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
              <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 11H9V9h2v4zm0-6H9V5h2v2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text)" }}>
              WalletCare
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              Admin Panel
            </div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{
          fontSize: "10px", fontWeight: "600",
          color: "var(--text-muted)", letterSpacing: "0.8px",
          textTransform: "uppercase", padding: "0 8px",
          marginBottom: "6px",
        }}>
          Main Menu
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "8px",
              marginBottom: "2px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: isActive ? "500" : "400",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              background: isActive ? "var(--accent-light)" : "transparent",
              transition: "all 0.15s",
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: "12px 10px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: "8px", padding: "8px 10px",
          marginBottom: "4px",
        }}>
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "50%",
            background: "var(--accent-light)",
            display: "flex", alignItems: "center",
            justifyContent: "center",
            fontSize: "11px", fontWeight: "600",
            color: "var(--accent)",
            flexShrink: 0,
          }}>
            {admin?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: "12px", fontWeight: "500",
              color: "var(--text)",
              whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {admin?.name || "Admin"}
            </div>
            <div style={{
              fontSize: "10px", color: "var(--text-muted)",
              whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {admin?.email || ""}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn"
          style={{ width: "100%", justifyContent: "center", fontSize: "12px" }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Sign out
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;