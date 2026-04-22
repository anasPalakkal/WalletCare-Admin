import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useCallback } from "react";
import { useRefresh } from "../context/RefreshContext";

/* ─────────────────────────────────────────────────────────────
   Admin Feedback Page
   Routes consumed:
     GET    /admin/feedback        — all feedback (populated with user name/email)
     GET    /admin/feedback/:id    — single feedback detail
     DELETE /admin/feedback/:id    — delete feedback
   ───────────────────────────────────────────────────────────── */

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "UI/UX Issue",
  "Transaction Issue",
  "Security Concern",
  "Other",
];

const CATEGORY_META = {
  "Bug Report":        { icon: "🐛", bg: "rgba(239,68,68,0.09)",   color: "#ef4444" },
  "Feature Request":   { icon: "✨", bg: "rgba(16,185,129,0.09)",  color: "#10b981" },
  "UI/UX Issue":       { icon: "🎨", bg: "rgba(139,92,246,0.09)",  color: "#8b5cf6" },
  "Transaction Issue": { icon: "💳", bg: "rgba(245,158,11,0.09)",  color: "#f59e0b" },
  "Security Concern":  { icon: "🔒", bg: "rgba(220,38,38,0.09)",   color: "#dc2626" },
  "Other":             { icon: "💬", bg: "rgba(100,116,139,0.09)", color: "#64748b" },
};

const RATING_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent" };

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const Stars = ({ value }) => (
  <span style={{ color: "#f59e0b", letterSpacing: "1px", fontSize: "13px" }}>
    {"★".repeat(value || 0)}
    <span style={{ color: "var(--border)" }}>{"★".repeat(5 - (value || 0))}</span>
  </span>
);

const CategoryBadge = ({ cat, small }) => {
  const meta = CATEGORY_META[cat] || { icon: "💬", bg: "var(--bg)", color: "var(--text-muted)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: "5px", fontSize: small ? "10px" : "11px",
      fontWeight: "500", background: meta.bg, color: meta.color,
      whiteSpace: "nowrap",
    }}>
      {meta.icon} {cat}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
const AdminFeedback = () => {
  const [feedbacks, setFeedbacks]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  const [search, setSearch]           = useState("");
  const [filterCat, setFilterCat]     = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [detail, setDetail]           = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  /* ── fetch all — only real verified non-banned users ── */
  const fetchFeedbacks = useCallback(async () => {
  handleRefreshStart();
  try {
    if (!lastUpdatedRef.current) setLoading(true);
    const res = await api.get("/admin/feedback");
    const real = (res.data.data || []).filter((f) => {
      const u = f.userId;
      if (!u) return false;
      if (u.isBanned) return false;
      if (!u.isEmailVerified) return false;
      return true;
    });
    setFeedbacks(real);
    setError("");
  } catch {
    setError("Failed to load feedback.");
  } finally {
    handleRefreshEnd();
    setLoading(false);
  }
}, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

useEffect(() => {
  fetchFeedbacks();
}, [fetchFeedbacks]);

useEffect(() => {
  registerRefresh(fetchFeedbacks);
}, [registerRefresh, fetchFeedbacks]);

useEffect(() => { setCurrentPage(1); }, [search, filterCat, filterRating]);

  /* ── open detail ── */
  const openDetail = async (fb) => {
    setDetail({ ...fb, _loading: true });
    try {
      setDetailLoading(true);
      const res = await api.get(`/admin/feedback/${fb._id}`);
      setDetail(res.data.data);
    } catch {
      setDetail(fb);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/feedback/${confirmDelete._id}`);
      setFeedbacks((prev) => prev.filter((f) => f._id !== confirmDelete._id));
      if (detail?._id === confirmDelete._id) setDetail(null);
      setConfirmDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── stats ── */
  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.filter(f => f.rating).length || 0).toFixed(1)
    : "—";

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = feedbacks.filter((f) => f.category === c).length;
    return acc;
  }, {});

  /* ── filter + paginate ── */
  const filtered = feedbacks.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      f.userId?.name?.toLowerCase().includes(q) ||
      f.userId?.email?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q);
    const matchCat    = filterCat    === "all" || f.category === filterCat;
    const matchRating = filterRating === "all" || String(f.rating) === filterRating;
    return matchSearch && matchCat && matchRating;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  /* ── shared styles ── */
  const labelStyle = { fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "4px", display: "block" };
  const selectStyle = {
    padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "6px",
    background: "var(--bg)", color: "var(--text)", fontSize: "12px", outline: "none", cursor: "pointer",
  };

  /* ── loading / error states ── */
  if (loading) return (
    <Layout>
      <Topbar title="Feedback" subtitle="All user submitted feedback" />
      <div className="main-content"><div className="loading">Loading feedback...</div></div>
    </Layout>
  );
  if (error) return (
    <Layout>
      <Topbar title="Feedback" subtitle="All user submitted feedback" />
      <div className="main-content"><div style={{ color: "var(--danger)" }}>{error}</div></div>
    </Layout>
  );

  /* ════════════════════════════════════════════ */
  return (
    <Layout>
      <Topbar title="Feedback" subtitle="Verified user feedback only" />
      <div className="main-content">

        {/* ── Stats Row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: "10px", marginBottom: "20px",
        }}>
          <div className="card" style={{ borderTop: "3px solid #4f46e5" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Total</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{feedbacks.length}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #f59e0b" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Avg Rating</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{avgRating}</span>
              <span style={{ fontSize: "13px", color: "#f59e0b" }}>★</span>
            </div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #ef4444" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Bug Reports</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{catCounts["Bug Report"]}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #10b981" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Feature Requests</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{catCounts["Feature Request"]}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #dc2626" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Security</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>{catCounts["Security Concern"]}</div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>

          {/* Filters bar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "180px" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--text-muted)">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search user, email, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none", outline: "none", background: "transparent",
                  fontSize: "13px", color: "var(--text)", flex: 1, padding: 0,
                }}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px", lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>

            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={selectStyle}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c]?.icon} {c}</option>
              ))}
            </select>

            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} style={selectStyle}>
              <option value="all">All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{"★".repeat(r)} {RATING_LABELS[r]}</option>
              ))}
            </select>

            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Rating</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "36px" }}>
                      No feedback found
                    </td>
                  </tr>
                ) : paginated.map((fb) => (
                  <tr key={fb._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                          background: "var(--accent-light)", color: "var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "10px", fontWeight: "600",
                        }}>
                          {fb.userId?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--text)" }}>
                            {fb.userId?.name || "Unknown"}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {fb.userId?.email || "—"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td><CategoryBadge cat={fb.category} small /></td>

                    <td style={{ maxWidth: "240px" }}>
                      <div style={{
                        fontSize: "12px", color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {fb.description}
                      </div>
                    </td>

                    <td>
                      {fb.rating
                        ? <Stars value={fb.rating} />
                        : <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>}
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {formatDate(fb.createdAt)}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn"
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                          onClick={() => openDetail(fb)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                          onClick={() => setConfirmDelete(fb)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderTop: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Showing {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }}
                    disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    Prev
                  </button>
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
                        <button key={p} className="btn" style={{
                          fontSize: "12px", padding: "4px 10px",
                          background: currentPage === p ? "var(--accent)" : "",
                          color: currentPage === p ? "white" : "",
                          borderColor: currentPage === p ? "var(--accent)" : "",
                        }} onClick={() => setCurrentPage(p)}>{p}</button>
                      )
                    )}
                  <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }}
                    disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════ DETAIL MODAL ════════ */}
      {detail && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: "16px",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "auto", position: "relative" }}>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>
                Feedback Detail
              </div>
              <button onClick={() => setDetail(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "20px", lineHeight: 1,
              }}>×</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "20px" }}>
                Loading...
              </div>
            ) : (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "var(--bg)",
                  border: "1px solid var(--border)", borderRadius: "8px",
                  marginBottom: "16px",
                }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                    background: "var(--accent-light)", color: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: "700",
                  }}>
                    {detail.userId?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                      {detail.userId?.name || "Unknown User"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {detail.userId?.email || "—"}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Submitted</div>
                    <div style={{ fontSize: "11px", color: "var(--text)" }}>{formatDateTime(detail.createdAt)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <CategoryBadge cat={detail.category} />
                  {detail.rating && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Stars value={detail.rating} />
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        — {RATING_LABELS[detail.rating]}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Description
                  </div>
                  <div style={{
                    fontSize: "13px", color: "var(--text)", lineHeight: "1.65",
                    padding: "12px 14px",
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: "7px", whiteSpace: "pre-wrap",
                  }}>
                    {detail.description}
                  </div>
                </div>

                {detail.screenshot && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px" }}>
                      Screenshot
                    </div>
                    <a href={detail.screenshot} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        fontSize: "12px", color: "var(--accent)", textDecoration: "none",
                        padding: "7px 12px", border: "1px solid var(--accent)",
                        borderRadius: "6px", background: "var(--accent-light)",
                      }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                      </svg>
                      View Screenshot
                    </a>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  <button className="btn" onClick={() => setDetail(null)}>Close</button>
                  <button
                    className="btn btn-danger"
                    onClick={() => { setConfirmDelete(detail); setDetail(null); }}
                  >
                    Delete Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 110, padding: "16px",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Delete Feedback
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Are you sure you want to permanently delete this feedback from{" "}
              <strong>{confirmDelete.userId?.name || "this user"}</strong>? This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirmDelete(null)} disabled={deleteLoading}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default AdminFeedback;