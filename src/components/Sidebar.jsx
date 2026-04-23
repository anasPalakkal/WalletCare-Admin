import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/PanelLogo.jpeg";

const Sidebar = ({ isMobile, isOpen, onClose }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/login");
  };
  const handleCancelLogout = () => setShowLogoutModal(false);

  const navItems = [
    {
      label: "Dashboard", path: "/dashboard",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>,
    },
    {
      label: "Users", path: "/users",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zm-9.93-1a7 7 0 0114 0v1H3v-1z" /></svg>,
    },
    {
      label: "Feedbacks", path: "/feedback",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg>,
    },
    {
      label: "Analytics", path: "/analytics",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>,
    },
    {
      label: "Notifications", path: "/notifications",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" /></svg>,
    },
    {
      label: "Settings", path: "/settings",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
    },
  ];

  const superadminItems = [
    {
      label: "Manage Admins", path: "/admin/manage",
      icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zm-9.93-1a7 7 0 0114 0v1H3v-1z" /></svg>,
    },
  ];

  return (
    <>
      {/* ── Sidebar ── */}
      <aside
        className={[
          "w-[220px] bg-[var(--sidebar-bg)] border-r border-[var(--border)]",
          "flex flex-col h-screen flex-shrink-0",
          isMobile
            ? `fixed top-0 left-0 z-50 transition-transform duration-[250ms] ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : "sticky top-0",
        ].join(" ")}
      >
        {/* Logo + close button */}
        <div className="px-4 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src={logo} alt="GreenPouch Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-semibold text-sm text-[var(--text)]">
                <span className="text-green-500">Green</span>
                <span>Pouch</span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Admin Panel</div>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-[10px] py-3 overflow-y-auto">
          <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.8px] uppercase px-2 mb-[6px]">
            Main Menu
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={({ isActive }) =>
                [
                  "flex items-center gap-[10px] px-[10px] py-2 rounded-lg mb-[2px]",
                  "no-underline text-[13px] transition-all duration-150",
                  isActive
                    ? "font-medium text-[var(--accent)] bg-[var(--accent-light)]"
                    : "font-normal text-[var(--text-muted)] bg-transparent hover:bg-[var(--hover-bg)]",
                ].join(" ")
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {admin?.role === "superadmin" && (
            <>
              <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.8px] uppercase px-2 mt-4 mb-[6px]">
                Admin Management
              </div>
              {superadminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={isMobile ? onClose : undefined}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-[10px] px-[10px] py-2 rounded-lg mb-[2px]",
                      "no-underline text-[13px] transition-all duration-150",
                      isActive
                        ? "font-medium text-[var(--accent)] bg-[var(--accent-light)]"
                        : "font-normal text-[var(--text-muted)] bg-transparent hover:bg-[var(--hover-bg)]",
                    ].join(" ")
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Admin info + logout */}
        <div className="px-[10px] py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-[10px] py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[11px] font-semibold text-[var(--accent)] flex-shrink-0">
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--text)] whitespace-nowrap overflow-hidden text-ellipsis">
                {admin?.name || "Admin"}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap overflow-hidden text-ellipsis">
                {admin?.email || ""}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="btn w-full justify-center text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          onClick={handleCancelLogout}
        >
          <div
            className="card w-[90%] max-w-[400px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Confirm Sign Out</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Are you sure you want to sign out? You'll need to log in again to access the admin panel.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;