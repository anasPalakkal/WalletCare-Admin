import { useEffect, useState, useCallback } from "react";
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
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm]           = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const usersPerPage = 10;
  const { isMobile, isTablet } = useWindowSize();
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  useEffect(() => {
    const p = searchParams.get("filter");
    if (p && ["all","active","banned","scheduled","premium"].includes(p)) setFilter(p);
  }, [searchParams]);

  useEffect(() => {
    const p = searchParams.get("filter");
    if (p && ["all","active","banned","scheduled","premium"].includes(p)) setFilter(p);
  }, [location]);

  const fetchUsers = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
      setError("");
    } catch {
      setError("Failed to load users.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => { registerRefresh(fetchUsers); }, [registerRefresh, fetchUsers]);
  useEffect(() => { fetchUsers(); const i = setInterval(fetchUsers, POLL_INTERVAL); return () => clearInterval(i); }, [fetchUsers]);
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const handleAction = async (action, userId) => {
    setActionLoading(userId + action);
    try {
      if (action === "ban")     await api.patch(`/admin/users/${userId}/ban`);
      if (action === "unban")   await api.patch(`/admin/users/${userId}/unban`);
      if (action === "logout")  await api.post(`/admin/users/${userId}/logout`);
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
    const m = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    if (filter === "all")       return m;
    if (filter === "active")    return m && !u.isBanned && !u.scheduledDeletionAt;
    if (filter === "banned")    return m && u.isBanned;
    if (filter === "scheduled") return m && u.scheduledDeletionAt;
    if (filter === "premium")   return m && u.isPremium;
    return m;
  });

  const totalPages    = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const counts = {
    all:       users.length,
    active:    users.filter((u) => !u.isBanned && !u.scheduledDeletionAt).length,
    banned:    users.filter((u) => u.isBanned).length,
    scheduled: users.filter((u) => u.scheduledDeletionAt).length,
    premium:   users.filter((u) => u.isPremium).length,
  };

  // ✅ "All" tab: #4f46e5 → #16a34a
  const filterTabs = [
    { key: "all",       label: "All",               color: "#16a34a" },
    { key: "active",    label: "Active",             color: "#10b981" },
    { key: "banned",    label: "Banned",             color: "#ef4444" },
    { key: "scheduled", label: "Scheduled Deletion", color: "#14b8a6" },
    { key: "premium",   label: "Premium",            color: "#8b5cf6" },
  ];

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (loading) return <Layout><Topbar title="Users" subtitle="Manage all user accounts" /><div className="main-content"><div className="loading">Loading users...</div></div></Layout>;
  if (error)   return <Layout><Topbar title="Users" subtitle="Manage all user accounts" /><div className="main-content"><div className="text-[var(--danger)]">{error}</div></div></Layout>;

  return (
    <Layout>
      <Topbar title="Users" subtitle="Manage all user accounts" />
      <div className="main-content">

        {/* Filter tabs */}
        <div
          className="grid gap-[10px] mb-5"
          style={{ gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : isTablet ? "repeat(3,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))" }}
        >
          {filterTabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="card cursor-pointer"
              style={{
                borderTop: `3px solid ${tab.color}`,
                opacity: filter === tab.key ? 1 : 0.7,
                outline: filter === tab.key ? `2px solid ${tab.color}` : "none",
              }}
            >
              <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">{tab.label}</div>
              <div className="text-[22px] font-bold text-[var(--text)]">{counts[tab.key]}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="card p-0 overflow-hidden">

          {/* Search bar */}
          <div className="px-4 py-[14px] border-b border-[var(--border)] flex items-center gap-[10px]">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--text-muted)">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none outline-none bg-transparent text-[13px] text-[var(--text)] flex-1 p-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] text-base">×</button>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Email</th><th>Status</th><th>Plan</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-[var(--text-muted)] p-[30px]">No users found</td></tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="flex items-center gap-[10px]">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="font-medium text-[13px] text-[var(--text)]">{user.name}</div>
                            {user.scheduledDeletionAt && (
                              <div className="text-[10px] text-[var(--danger)]">Deletes {formatDate(user.scheduledDeletionAt)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-[var(--text-muted)] text-xs">{user.email}</td>
                      <td>
                        {user.isBanned ? <span className="badge badge-danger">Banned</span>
                          : user.scheduledDeletionAt ? <span className="badge badge-warning">Scheduled</span>
                          : <span className="badge badge-success">Active</span>}
                      </td>
                      <td>
                        {user.isPremium
                          ? <span className="badge badge-purple">Premium</span>
                          : <span className="badge" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Free</span>}
                      </td>
                      <td className="text-[var(--text-muted)] text-xs">{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="flex gap-[6px] flex-wrap">
                          <button
                            className="btn"
                            style={{ fontSize: "11px", padding: "4px 10px" }}
                            onClick={() => navigate(`/users/${user._id}`)}
                          >
                            View
                          </button>
                          {user.isBanned ? (
                            <button
                              className="btn btn-success"
                              style={{ fontSize: "11px", padding: "4px 10px" }}
                              disabled={actionLoading === user._id + "unban"}
                              onClick={() => setConfirm({ action: "unban", user })}
                            >
                              {actionLoading === user._id + "unban" ? "..." : "Unban"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: "11px", padding: "4px 10px" }}
                              disabled={actionLoading === user._id + "ban"}
                              onClick={() => setConfirm({ action: "ban", user })}
                            >
                              {actionLoading === user._id + "ban" ? "..." : "Ban"}
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ fontSize: "11px", padding: "4px 10px" }}
                            disabled={actionLoading === user._id + "logout"}
                            onClick={() => setConfirm({ action: "logout", user })}
                          >
                            {actionLoading === user._id + "logout" ? "..." : "Logout"}
                          </button>
                          {user.scheduledDeletionAt && (
                            <button
                              className="btn btn-success"
                              style={{ fontSize: "11px", padding: "4px 10px" }}
                              disabled={actionLoading === user._id + "restore"}
                              onClick={() => setConfirm({ action: "restore", user })}
                            >
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)]">
                  Showing {((currentPage - 1) * usersPerPage) + 1}–{Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn"
                    style={{ fontSize: "12px", padding: "4px 10px" }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={idx} style={{ padding: "4px 6px", fontSize: "12px", color: "var(--text-muted)" }}>...</span>
                      ) : (
                        <button
                          key={p}
                          className="btn"
                          style={{
                            fontSize: "12px", padding: "4px 10px",
                            background: currentPage === p ? "var(--accent)" : "",
                            color: currentPage === p ? "white" : "",
                            borderColor: currentPage === p ? "var(--accent)" : "",
                          }}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    className="btn"
                    style={{ fontSize: "12px", padding: "4px 10px" }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
          <div className="card w-full max-w-[360px] mx-4">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">
              Confirm {confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1)}
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              Are you sure you want to <strong>{confirm.action}</strong> user <strong>{confirm.user.name}</strong>?
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className={confirm.action === "ban" ? "btn btn-danger" : "btn btn-primary"}
                onClick={() => handleAction(confirm.action, confirm.user._id)}
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

export default Users;