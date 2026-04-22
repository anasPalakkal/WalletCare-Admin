import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import useWindowSize from "../hooks/useWindowSize";
import { useRefresh } from "../context/RefreshContext";

const POLL_INTERVAL = 60000;

const Users = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const { isMobile, isTablet } = useWindowSize();
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  // Handle URL filter parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'active', 'banned', 'scheduled', 'premium'].includes(filterParam)) {
      setFilter(filterParam);
    }
  }, [searchParams]);

  // Set filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'active', 'banned', 'scheduled', 'premium'].includes(filterParam)) {
      setFilter(filterParam);
    }
  }, [location]);

  const fetchUsers = useCallback(async () => {
    handleRefreshStart(); // ← Instead of setRefreshing(true)
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
      setError("");
    } catch (err) {
      setError("Failed to load users.");
    } finally {
      handleRefreshEnd(); // ← Instead of setRefreshing(false) + setLastUpdated
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);
  
  useEffect(() => {
    registerRefresh(fetchUsers);
  }, [registerRefresh, fetchUsers]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const handleAction = async (action, userId) => {
    setActionLoading(userId + action);
    try {
      if (action === "ban") await api.patch(`/admin/users/${userId}/ban`);
      if (action === "unban") await api.patch(`/admin/users/${userId}/unban`);
      if (action === "logout") await api.post(`/admin/users/${userId}/logout`);
      if (action === "restore") await api.patch(`/admin/users/${userId}/restore`);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return matchSearch;
    if (filter === "active") return matchSearch && !u.isBanned && !u.scheduledDeletionAt;
    if (filter === "banned") return matchSearch && u.isBanned;
    if (filter === "scheduled") return matchSearch && u.scheduledDeletionAt;
    if (filter === "premium") return matchSearch && u.isPremium;
    return matchSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const counts = {
    all: users.length,
    active: users.filter((u) => !u.isBanned && !u.scheduledDeletionAt).length,
    banned: users.filter((u) => u.isBanned).length,
    scheduled: users.filter((u) => u.scheduledDeletionAt).length,
    premium: users.filter((u) => u.isPremium).length,
  };

  const filterTabs = [
    { key: "all", label: "All", color: "#4f46e5" },
    { key: "active", label: "Active", color: "#10b981" },
    { key: "banned", label: "Banned", color: "#ef4444" },
    { key: "scheduled", label: "Scheduled Deletion", color: "#14b8a6" },
    { key: "premium", label: "Premium", color: "#8b5cf6" },
  ];

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (loading) return (
    <Layout>
      <Topbar title="Users" subtitle="Manage all user accounts" />
      <div className="main-content">
        <div className="loading">Loading users...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar title="Users" subtitle="Manage all user accounts" />
      <div className="main-content">
        <div style={{ color: "var(--danger)" }}>{error}</div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Topbar title="Users" subtitle="Manage all user accounts" />
      <div className="main-content">

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : isTablet ? "repeat(3, minmax(0,1fr))" : "repeat(5, minmax(0,1fr))",
          gap: "10px", marginBottom: "20px",
        }}>
          {filterTabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="card"
              style={{
                cursor: "pointer",
                borderTop: `3px solid ${tab.color}`,
                opacity: filter === tab.key ? 1 : 0.7,
                outline: filter === tab.key ? `2px solid ${tab.color}` : "none",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{tab.label}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{counts[tab.key]}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--text-muted)">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: "13px", color: "var(--text)", flex: 1, padding: 0,
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px" }}>×</button>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No users found</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: "var(--accent-light)", color: "var(--accent)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", fontWeight: "600", flexShrink: 0,
                          }}>
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "500", fontSize: "13px", color: "var(--text)" }}>{user.name}</div>
                            {user.scheduledDeletionAt && (
                              <div style={{ fontSize: "10px", color: "var(--danger)" }}>Deletes {formatDate(user.scheduledDeletionAt)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{user.email}</td>
                      <td>
                        {user.isBanned ? (
                          <span className="badge badge-danger">Banned</span>
                        ) : user.scheduledDeletionAt ? (
                          <span className="badge badge-warning">Scheduled</span>
                        ) : (
                          <span className="badge badge-success">Active</span>
                        )}
                      </td>
                      <td>
                        {user.isPremium ? (
                          <span className="badge badge-purple">Premium</span>
                        ) : (
                          <span className="badge" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Free</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(user.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button className="btn" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => navigate(`/users/${user._id}`)}>View</button>
                          {user.isBanned ? (
                            <button className="btn btn-success" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={actionLoading === user._id + "unban"} onClick={() => setConfirm({ action: "unban", user })}>
                              {actionLoading === user._id + "unban" ? "..." : "Unban"}
                            </button>
                          ) : (
                            <button className="btn btn-danger" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={actionLoading === user._id + "ban"} onClick={() => setConfirm({ action: "ban", user })}>
                              {actionLoading === user._id + "ban" ? "..." : "Ban"}
                            </button>
                          )}
                          <button className="btn" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={actionLoading === user._id + "logout"} onClick={() => setConfirm({ action: "logout", user })}>
                            {actionLoading === user._id + "logout" ? "..." : "Logout"}
                          </button>
                          {user.scheduledDeletionAt && (
                            <button className="btn btn-success" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={actionLoading === user._id + "restore"} onClick={() => setConfirm({ action: "restore", user })}>
                              {actionLoading === user._id + "restore" ? "..." : "Restore"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Showing {((currentPage - 1) * usersPerPage) + 1}–{Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={idx} style={{ padding: "4px 6px", fontSize: "12px", color: "var(--text-muted)" }}>...</span>
                      ) : (
                        <button key={p} className="btn" style={{ fontSize: "12px", padding: "4px 10px", background: currentPage === p ? "var(--accent)" : "", color: currentPage === p ? "white" : "", borderColor: currentPage === p ? "var(--accent)" : "" }} onClick={() => setCurrentPage(p)}>
                          {p}
                        </button>
                      )
                    )}
                  <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }} disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px", margin: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Confirm {confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1)}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Are you sure you want to <strong>{confirm.action}</strong> user <strong>{confirm.user.name}</strong>?
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={confirm.action === "ban" ? "btn btn-danger" : "btn btn-primary"} onClick={() => handleAction(confirm.action, confirm.user._id)}>
                Yes, {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Users;