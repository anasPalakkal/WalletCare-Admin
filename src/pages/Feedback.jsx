import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";

const CATEGORIES = ["Bug Report","Feature Request","UI/UX Issue","Transaction Issue","Security Concern","Other"];

const CATEGORY_META = {
  "Bug Report":        { icon: "🐛", bg: "rgba(239,68,68,0.09)",   color: "#ef4444" },
  "Feature Request":   { icon: "✨", bg: "rgba(16,185,129,0.09)",  color: "#10b981" },
  "UI/UX Issue":       { icon: "🎨", bg: "rgba(139,92,246,0.09)",  color: "#8b5cf6" },
  "Transaction Issue": { icon: "💳", bg: "rgba(245,158,11,0.09)",  color: "#f59e0b" },
  "Security Concern":  { icon: "🔒", bg: "rgba(220,38,38,0.09)",   color: "#dc2626" },
  "Other":             { icon: "💬", bg: "rgba(100,116,139,0.09)", color: "#64748b" },
};

const RATING_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent" };

const formatDate     = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [filterCat, setFilterCat]         = useState("all");
  const [filterRating, setFilterRating]   = useState("all");
  const [currentPage, setCurrentPage]     = useState(1);
  const perPage = 10;
  const [detail, setDetail]               = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  const fetchFeedbacks = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res  = await api.get("/admin/feedback");
      const real = (res.data.data || []).filter((f) => {
        const u = f.userId;
        return u && !u.isBanned && u.isEmailVerified;
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

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);
  useEffect(() => { registerRefresh(fetchFeedbacks); }, [registerRefresh, fetchFeedbacks]);
  useEffect(() => { setCurrentPage(1); }, [search, filterCat, filterRating]);

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

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.filter((f) => f.rating).length || 0).toFixed(1)
    : "—";

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = feedbacks.filter((f) => f.category === c).length;
    return acc;
  }, {});

  const filtered = feedbacks.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch = f.userId?.name?.toLowerCase().includes(q) || f.userId?.email?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q);
    const matchCat    = filterCat    === "all" || f.category === filterCat;
    const matchRating = filterRating === "all" || String(f.rating) === filterRating;
    return matchSearch && matchCat && matchRating;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const selectStyle = "px-[10px] py-[7px] border border-[var(--border)] rounded-[6px] bg-[var(--bg)] text-[var(--text)] text-xs outline-none cursor-pointer";

  if (loading) return <Layout><Topbar title="Feedback" subtitle="All user submitted feedback" /><div className="main-content"><div className="loading">Loading feedback...</div></div></Layout>;
  if (error)   return <Layout><Topbar title="Feedback" subtitle="All user submitted feedback" /><div className="main-content"><div className="text-[var(--danger)]">{error}</div></div></Layout>;

  return (
    <Layout>
      <Topbar title="Feedback" subtitle="Verified user feedback only" />
      <div className="main-content">

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-[10px] mb-5">
          {/* ✅ Total card: #4f46e5 → #16a34a */}
          <div className="card" style={{ borderTop: "3px solid #16a34a" }}>
            <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">Total</div>
            <div className="text-[22px] font-bold text-[var(--text)]">{feedbacks.length}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #f59e0b" }}>
            <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">Avg Rating</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold text-[var(--text)]">{avgRating}</span>
              <span className="text-[13px] text-[#f59e0b]">★</span>
            </div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #ef4444" }}>
            <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">Bug Reports</div>
            <div className="text-[22px] font-bold text-[var(--text)]">{catCounts["Bug Report"]}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #10b981" }}>
            <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">Feature Requests</div>
            <div className="text-[22px] font-bold text-[var(--text)]">{catCounts["Feature Request"]}</div>
          </div>
          <div className="card" style={{ borderTop: "3px solid #dc2626" }}>
            <div className="text-[11px] text-[var(--text-muted)] mb-[6px]">Security</div>
            <div className="text-[22px] font-bold text-[var(--text)]">{catCounts["Security Concern"]}</div>
          </div>
        </div>

        {/* Table card */}
        <div className="card p-0 overflow-hidden">

          {/* Filters */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-[10px] flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--text-muted)">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input type="text" placeholder="Search user, email, description..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-none outline-none bg-transparent text-[13px] text-[var(--text)] flex-1 p-0" />
              {search && <button onClick={() => setSearch("")} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] text-base leading-none">×</button>}
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className={selectStyle}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.icon} {c}</option>)}
            </select>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className={selectStyle}>
              <option value="all">All Ratings</option>
              {[5,4,3,2,1].map((r) => <option key={r} value={r}>{"★".repeat(r)} {RATING_LABELS[r]}</option>)}
            </select>
            <div className="text-xs text-[var(--text-muted)] ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>User</th><th>Category</th><th>Description</th><th>Rating</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-[var(--text-muted)] p-9">No feedback found</td></tr>
                ) : paginated.map((fb) => (
                  <tr key={fb._id}>
                    <td>
                      <div className="flex items-center gap-[9px]">
                        <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-[10px] font-semibold">
                          {fb.userId?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[var(--text)]">{fb.userId?.name || "Unknown"}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{fb.userId?.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td><CategoryBadge cat={fb.category} small /></td>
                    <td className="max-w-[240px]">
                      <div className="text-xs text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">{fb.description}</div>
                    </td>
                    <td>{fb.rating ? <Stars value={fb.rating} /> : <span className="text-[var(--text-muted)] text-xs">—</span>}</td>
                    <td className="text-[var(--text-muted)] text-xs whitespace-nowrap">{formatDate(fb.createdAt)}</td>
                    <td>
                      <div className="flex gap-[6px]">
                        <button className="btn text-[11px] px-[10px] py-1" onClick={() => openDetail(fb)}>View</button>
                        <button className="btn btn-danger text-[11px] px-[10px] py-1" onClick={() => setConfirmDelete(fb)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)]">
                  Showing {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
                </div>
                <div className="flex gap-1">
                  <button className="btn text-xs px-[10px] py-1" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                    .map((p, idx) =>
                      p === "..." ? <span key={idx} className="px-[6px] py-1 text-xs text-[var(--text-muted)]">...</span>
                        : <button key={p} className="btn text-xs px-[10px] py-1" style={{ background: currentPage === p ? "var(--accent)" : "", color: currentPage === p ? "white" : "", borderColor: currentPage === p ? "var(--accent)" : "" }} onClick={() => setCurrentPage(p)}>{p}</button>
                    )}
                  <button className="btn text-xs px-[10px] py-1" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="card w-full max-w-[520px] max-h-[85vh] overflow-auto relative">
            <div className="flex items-center justify-between mb-[18px] pb-[14px] border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text)]">Feedback Detail</div>
              <button onClick={() => setDetail(null)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] text-xl leading-none">×</button>
            </div>
            {detailLoading ? (
              <div className="text-center text-[var(--text-muted)] text-[13px] py-5">Loading...</div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-[14px] py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg mb-4">
                  <div className="w-[38px] h-[38px] rounded-full flex-shrink-0 bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-[13px] font-bold">
                    {detail.userId?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--text)]">{detail.userId?.name || "Unknown User"}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{detail.userId?.email || "—"}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[11px] text-[var(--text-muted)]">Submitted</div>
                    <div className="text-[11px] text-[var(--text)]">{formatDateTime(detail.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <CategoryBadge cat={detail.category} />
                  {detail.rating && (
                    <div className="flex items-center gap-[6px]">
                      <Stars value={detail.rating} />
                      <span className="text-xs text-[var(--text-muted)]">— {RATING_LABELS[detail.rating]}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.6px] uppercase mb-2">Description</div>
                  <div className="text-[13px] text-[var(--text)] leading-[1.65] px-[14px] py-3 bg-[var(--bg)] border border-[var(--border)] rounded-[7px] whitespace-pre-wrap">
                    {detail.description}
                  </div>
                </div>

                {detail.screenshot && (
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.6px] uppercase mb-2">Screenshot</div>
                    <a href={detail.screenshot} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-[6px] text-xs text-[var(--accent)] no-underline px-3 py-[7px] border border-[var(--accent)] rounded-[6px] bg-[var(--accent-light)]">
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      View Screenshot
                    </a>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <button className="btn" onClick={() => setDetail(null)}>Close</button>
                  <button className="btn btn-danger" onClick={() => { setConfirmDelete(detail); setDetail(null); }}>Delete Feedback</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="card w-full max-w-[360px]">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">Delete Feedback</div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              Are you sure you want to permanently delete this feedback from{" "}
              <strong>{confirmDelete.userId?.name || "this user"}</strong>? This action cannot be undone.
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirmDelete(null)} disabled={deleteLoading}>Cancel</button>
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