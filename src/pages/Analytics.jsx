import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import useWindowSize from "../hooks/useWindowSize";
import { useRefresh } from "../context/RefreshContext";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  LineElement, PointElement,
  Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend, Filler);

const formatMonthLabel = (id) => {
  if (!id) return "";
  const date = new Date(id.year, id.month - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// ── Stat chip ─────────────────────────────────────────────────
const StatChip = ({ label, value, sub, color, icon, onClick }) => (
  <div
    className="flex items-center gap-3 select-none"
    style={{
      padding: "10px 18px 10px 12px",
      borderRadius: "10px",
      border: `0.5px solid var(--border)`,
      background: "var(--card-bg)",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.15s, transform 0.12s",
    }}
    onClick={onClick}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
  >
    <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 500, color: color, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ── Adoption rate bar ─────────────────────────────────────────
const AdoptionBar = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between items-center mb-[5px]">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
    <div className="w-full h-[6px] rounded-full bg-[var(--border)]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  </div>
);

// ── Icons ─────────────────────────────────────────────────────
const Icon = {
  users:    (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.5"/><path d="M6 10l3 3 5-5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  active:   (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="4" fill={c}/><circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.5"/></svg>,
  premium:  (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.4l-4.8 2.5.9-5.4L2.2 7.7l5.4-.8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  banned:   (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  feedback: (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3V5z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  star:     (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 4.9 5.1.7-3.7 3.6.9 5.1L10 13.9l-4.3 2.4.9-5.1L2.9 7.6l5.1-.7z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  calendar: (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  tx:       (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M4 10h8M4 14h5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  income:   (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 14l4-4 3 3 5-6" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 8h3v3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  expense:  (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 8l4 4 3-3 5 6" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 14h3v-3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  goal:     (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke={c} strokeWidth="1.5"/><circle cx="10" cy="10" r="1" fill={c}/></svg>,
  done:     (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pct:      (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M5 15L15 5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx="6.5" cy="6.5" r="1.5" stroke={c} strokeWidth="1.3"/><circle cx="13.5" cy="13.5" r="1.5" stroke={c} strokeWidth="1.3"/></svg>,
  account:  (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="10" rx="2" stroke={c} strokeWidth="1.5"/><path d="M7 6V5a3 3 0 016 0v1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  cash:     (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="10" rx="1.5" stroke={c} strokeWidth="1.5"/><circle cx="10" cy="11" r="2" stroke={c} strokeWidth="1.3"/></svg>,
  bank:     (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 8l7-5 7 5H3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 8v7M10 8v7M15 8v7M3 15h14" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  funnel:   (c) => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 4h14l-5 7v5l-4-2V11L3 4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
};

// ── Section title ─────────────────────────────────────────────
const SectionTitle = ({ title, sub }) => (
  <div className="mb-[14px] mt-[6px]">
    <div className="text-[15px] font-semibold text-[var(--text)]">{title}</div>
    {sub && <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">{sub}</div>}
  </div>
);

const POLL_INTERVAL = 60000;

const Analytics = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useWindowSize();
  const [stats, setStats]                         = useState(null);
  const [userAnalytics, setUserAnalytics]         = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [txAnalytics, setTxAnalytics]             = useState(null);
  const [goalAnalytics, setGoalAnalytics]         = useState(null);
  const [accountAnalytics, setAccountAnalytics]   = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState("");
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  const fetchAll = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const [statsRes, userRes, feedbackRes, txRes, goalRes, accountRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/analytics/users?months=12"),
        api.get("/admin/analytics/feedback"),
        api.get("/admin/analytics/transactions"),
        api.get("/admin/analytics/goals"),
        api.get("/admin/analytics/accounts"),
      ]);
      setStats(statsRes.data.data);
      setUserAnalytics(userRes.data.data);
      setFeedbackAnalytics(feedbackRes.data.data);
      setTxAnalytics(txRes.data.data);
      setGoalAnalytics(goalRes.data.data);
      setAccountAnalytics(accountRes.data.data);
      setError("");
    } catch {
      setError("Failed to load analytics.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, POLL_INTERVAL); return () => clearInterval(i); }, [fetchAll]);
  useEffect(() => { registerRefresh(fetchAll); }, [registerRefresh, fetchAll]);

  // ── Chart options ─────────────────────────────────────────────
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, backgroundColor: "rgba(0,0,0,0.8)", titleColor: "#fff", bodyColor: "#fff", padding: 12, cornerRadius: 8, displayColors: true },
    },
    scales: {
      x: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { color: "rgba(107,114,128,0.1)" }, border: { display: false } },
      y: { ticks: { color: "#6b7280", font: { size: 11 }, precision: 0 }, grid: { color: "rgba(107,114,128,0.1)" }, border: { display: false }, beginAtZero: true },
    },
    interaction: { mode: "index", intersect: false },
    onHover: (e, els) => { e.native.target.style.cursor = els.length > 0 ? "pointer" : "default"; },
  };

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true, backgroundColor: "rgba(0,0,0,0.85)", titleColor: "#fff",
        bodyColor: "#fff", padding: 12, cornerRadius: 8, displayColors: false,
        callbacks: { label: (ctx) => `${ctx.parsed.y} new users` },
      },
    },
    scales: {
      x: { ticks: { color: "#6b7280", font: { size: 11 }, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
      y: { ticks: { color: "#6b7280", font: { size: 11 }, precision: 0 }, grid: { color: "rgba(107,114,128,0.08)" }, border: { display: false }, beginAtZero: true },
    },
    interaction: { mode: "index", intersect: false },
    onHover: (e, els) => { e.native.target.style.cursor = els.length > 0 ? "pointer" : "default"; },
  };

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, backgroundColor: "rgba(0,0,0,0.8)", titleColor: "#fff", bodyColor: "#fff", padding: 12, cornerRadius: 8, displayColors: true },
    },
    interaction: { mode: "point", intersect: true },
    onHover: (e, els) => { e.native.target.style.cursor = els.length > 0 ? "pointer" : "default"; },
    elements: { arc: { hoverOffset: 8, hoverBorderWidth: 2, hoverBorderColor: "#fff" } },
  };

  if (loading) return <Layout><Topbar title="Analytics" subtitle="Detailed system analytics" /><div className="main-content"><div className="loading">Loading analytics...</div></div></Layout>;
  if (error)   return <Layout><Topbar title="Analytics" subtitle="Detailed system analytics" /><div className="main-content"><div className="text-[var(--danger)]">{error}</div></div></Layout>;

  const premiumPercent = stats?.totalUsers ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0;
  const totalUsers     = stats?.totalUsers || 0;

  const col4       = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)";
  const col3       = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)";
  const colWide    = isMobile ? "1fr" : "2fr 1fr";
  const colWideRev = isMobile ? "1fr" : "1fr 2fr";

  const userGrowthColors       = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"];
  const feedbackCategoryColors = ["#16a34a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const categoryColors         = ["#ef4444", "#f59e0b", "#10b981", "#0d9488", "#8b5cf6", "#ec4899"];

  // ── Chart data ────────────────────────────────────────────────
  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.slice(-12).map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Users",
      data: userAnalytics?.userGrowth?.slice(-12).map((d) => d.count) || [],
      borderColor: "#16a34a",
      backgroundColor: "rgba(22,163,74,0.10)",
      pointBackgroundColor: "#16a34a",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
    }],
  };

  const premiumVsFreeData = {
    labels: ["Premium", "Free"],
    datasets: [{ data: [userAnalytics?.premiumVsFree?.premiumUsers || 0, userAnalytics?.premiumVsFree?.freeUsers || 0], backgroundColor: ["#8b5cf6", "#6b7280"], hoverBackgroundColor: ["#9333ea", "#4b5563"], borderWidth: 0 }],
  };

  const userStatusData = {
    labels: ["Not Banned", "Banned", "Scheduled for deletion"],
    datasets: [{ data: [totalUsers - (stats?.bannedUsers || 0) - (stats?.scheduledForDeletion || 0), stats?.bannedUsers || 0, stats?.scheduledForDeletion || 0], backgroundColor: ["#10b981", "#ef4444", "#f59e0b"], hoverBackgroundColor: ["#059669", "#dc2626", "#d97706"], borderWidth: 0 }],
  };

  const feedbackByCategoryData = {
    labels: feedbackAnalytics?.feedbackByCategory?.map((d) => d._id) || [],
    datasets: [{ label: "Feedback Count", data: feedbackAnalytics?.feedbackByCategory?.map((d) => d.count) || [], backgroundColor: feedbackCategoryColors, hoverBackgroundColor: feedbackCategoryColors.map((c) => c + "dd"), borderRadius: 6, barPercentage: 0.7 }],
  };

  // Transaction volume (count only)
  const monthlyVolumeData = {
    labels: txAnalytics?.monthlyVolume?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{ label: "Transactions", data: txAnalytics?.monthlyVolume?.map((d) => d.count) || [], backgroundColor: "#10b981", hoverBackgroundColor: "#059669", borderRadius: 6, barPercentage: 0.7 }],
  };

  // Top expense categories — by frequency (count), not rupee amount
  const topCategoriesData = {
    labels: txAnalytics?.topCategories?.slice(0, 5).map((d) => d._id) || [],
    datasets: [{ data: txAnalytics?.topCategories?.slice(0, 5).map((d) => d.count) || [], backgroundColor: categoryColors, hoverBackgroundColor: categoryColors.map((c) => c + "dd"), borderWidth: 0 }],
  };

  // Income vs Expense entry count split
  const incomeExpenseCountData = {
    labels: ["Income entries", "Expense entries"],
    datasets: [{ data: [txAnalytics?.incomeCount || 0, txAnalytics?.expenseCount || 0], backgroundColor: ["#10b981", "#ef4444"], hoverBackgroundColor: ["#059669", "#dc2626"], borderWidth: 0 }],
  };

  const goalStatusData = {
    labels: ["Active", "Completed", "Overdue"],
    datasets: [{ data: [goalAnalytics?.activeGoals || 0, goalAnalytics?.completedGoals || 0, goalAnalytics?.overdueGoals || 0], backgroundColor: ["#10b981", "#16a34a", "#ef4444"], hoverBackgroundColor: ["#059669", "#15803d", "#dc2626"], borderWidth: 0 }],
  };

  // Goals by category — count only
  const goalCategoryData = {
    labels: goalAnalytics?.goalsByCategory?.map((d) => d._id) || [],
    datasets: [{ label: "Goals", data: goalAnalytics?.goalsByCategory?.map((d) => d.count) || [], backgroundColor: "#8b5cf6", hoverBackgroundColor: "#7c3aed", borderRadius: 6, barPercentage: 0.7 }],
  };

  // Goals created per month trend
  const goalsPerMonthData = {
    labels: goalAnalytics?.goalsPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Goals",
      data: goalAnalytics?.goalsPerMonth?.map((d) => d.count) || [],
      borderColor: "#8b5cf6",
      backgroundColor: "rgba(139,92,246,0.10)",
      pointBackgroundColor: "#8b5cf6",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
    }],
  };

  const accountTypeData = {
    labels: ["Cash", "Bank"],
    datasets: [{ data: [accountAnalytics?.cashAccounts || 0, accountAnalytics?.bankAccounts || 0], backgroundColor: ["#f59e0b", "#0d9488"], hoverBackgroundColor: ["#d97706", "#0f766e"], borderWidth: 0 }],
  };

  // Accounts created per month trend
  const accountsPerMonthData = {
    labels: accountAnalytics?.accountsPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{ label: "New Accounts", data: accountAnalytics?.accountsPerMonth?.map((d) => d.count) || [], backgroundColor: "#0d9488", hoverBackgroundColor: "#0f766e", borderRadius: 6, barPercentage: 0.7 }],
  };

  // Adoption data
  const adoption = userAnalytics?.adoption || {};

  return (
    <Layout>
      <Topbar title="Analytics" subtitle="Deep dive into system metrics" />
      <div className="main-content">

        {/* ── Section 1: Users ── */}
        <SectionTitle title="Users" sub="User growth, demographics and status breakdown" />
        <div className="flex flex-wrap gap-[10px] mb-[14px]">
          <StatChip label="Total Users"        value={stats?.totalUsers}           sub="All time"                color="#16a34a" icon={Icon.users("#16a34a")}   onClick={() => navigate("/users")} />
          <StatChip label="New This Month"     value={stats?.newUsersThisMonth}    sub="Registered this month"   color="#10b981" icon={Icon.active("#10b981")}  onClick={() => navigate("/users?filter=thismonth")} />
          <StatChip label="Premium Users"      value={stats?.premiumUsers}         sub={`${premiumPercent}% of total`} color="#8b5cf6" icon={Icon.premium("#8b5cf6")} onClick={() => navigate("/users?filter=premium")} />
          <StatChip label="Banned Users"       value={stats?.bannedUsers}          sub="Suspended accounts"      color="#ef4444" icon={Icon.banned("#ef4444")}  onClick={() => navigate("/users?filter=banned")} />
          <StatChip label="Scheduled Deletion" value={stats?.scheduledForDeletion} sub="Pending account removal"  color="#f59e0b" icon={Icon.calendar("#f59e0b")} onClick={() => navigate("/users?filter=scheduled")} />
        </div>

        <div className="card mb-[14px]">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">User Growth</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">New registrations over the last 12 months</div>
          <div className="relative h-[220px]"><Line data={userGrowthData} options={lineChartOptions} /></div>
        </div>

        <div className="grid gap-[14px] mb-[14px]" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          {/* User Status */}
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">User Status Distribution</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Active, banned and scheduled for deletion</div>
            <div className="relative h-[160px] max-w-[260px] mx-auto"><Doughnut data={userStatusData} options={doughnutOptions} /></div>
            <div className="flex justify-around mt-4 pt-3 border-t border-[var(--border)]">
              <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Not Banned</div><div className="text-lg font-bold text-[#10b981]">{totalUsers - (stats?.bannedUsers || 0) - (stats?.scheduledForDeletion || 0)}</div></div>
              <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Banned</div><div className="text-lg font-bold text-[#ef4444]">{stats?.bannedUsers || 0}</div></div>
              <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Scheduled</div><div className="text-lg font-bold text-[#f59e0b]">{stats?.scheduledForDeletion || 0}</div></div>
            </div>
          </div>

          {/* Premium vs Free */}
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Premium vs Free</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">User subscription status</div>
            <div className="relative h-[160px] max-w-[260px] mx-auto"><Doughnut data={premiumVsFreeData} options={doughnutOptions} /></div>
            <div className="flex justify-around mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Premium</div><div className="text-lg font-bold text-[#8b5cf6]">{userAnalytics?.premiumVsFree?.premiumUsers || 0}</div></div>
              <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Free</div><div className="text-lg font-bold text-[#6b7280]">{userAnalytics?.premiumVsFree?.freeUsers || 0}</div></div>
            </div>
          </div>
        </div>

        {/* Feature Adoption Funnel */}
        <div className="card mb-5">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Feature Adoption</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[16px]">% of users actively using each core feature</div>
          <div className="flex flex-col gap-[14px]">
            <AdoptionBar label="Users who created at least 1 goal"        value={adoption.goalAdoptionRate    ?? 0} color="#8b5cf6" />
            <AdoptionBar label="Users who logged at least 1 transaction"  value={adoption.txAdoptionRate      ?? 0} color="#10b981" />
            <AdoptionBar label="Users with more than 1 account"           value={adoption.multiAccountRate    ?? 0} color="#0d9488" />
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
            Lower adoption rates indicate features that may need better onboarding or discoverability.
          </div>
        </div>

        {/* ── Section 2: Feedback ── */}
        <SectionTitle title="Feedback & Rating" sub="User feedback volume, categories and satisfaction ratings" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          <StatChip label="Total Feedback"   value={stats?.totalFeedbacks}                       sub="All time"             color="#f59e0b" icon={Icon.feedback("#f59e0b")} onClick={() => navigate("/feedback")} />
          <StatChip label="This Month"       value={feedbackAnalytics?.totalFeedbacksThisMonth}  sub="Current month"        color="#10b981" icon={Icon.calendar("#10b981")} onClick={() => navigate("/feedback")} />
          <StatChip label="Feedback Rating"  value={feedbackAnalytics?.avgRating ? `${feedbackAnalytics.avgRating.toFixed(1)} / 5` : "—"} sub="Feedback satisfaction" color="#8b5cf6" icon={Icon.star("#8b5cf6")} />
          <StatChip label="User Rating"      value={stats?.avgUserRating ? `${stats.avgUserRating.toFixed(1)} / 5` : "—"} sub="User given ratings"    color="#14b8a6" icon={Icon.star("#14b8a6")} />
        </div>
        <div className="card mb-5">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Feedback by Category</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Distribution across different categories</div>
          <div className="relative h-[220px]"><Bar data={feedbackByCategoryData} options={chartOptions} /></div>
        </div>

        {/* ── Section 3: Transactions ── */}
        <SectionTitle title="Transactions" sub="Transaction volume and category usage — activity counts, not amounts" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col3 }}>
          <StatChip label="Total Transactions" value={txAnalytics?.totalTransactions} sub="All time logged entries"  color="#10b981" icon={Icon.tx("#10b981")} />
          <StatChip label="Income Entries"     value={txAnalytics?.incomeCount}        sub="Income logs recorded"    color="#16a34a" icon={Icon.income("#16a34a")} />
          <StatChip label="Expense Entries"    value={txAnalytics?.expenseCount}       sub="Expense logs recorded"   color="#ef4444" icon={Icon.expense("#ef4444")} />
        </div>
        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWide }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Monthly Volume</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Transaction count per month</div>
            <div className="relative h-[200px]"><Bar data={monthlyVolumeData} options={chartOptions} /></div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Top Expense Categories</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">By log frequency — how often users log in each category</div>
            <div className="relative h-[150px]"><Doughnut data={topCategoriesData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-[6px] mt-3">
              {txAnalytics?.topCategories?.slice(0, 5).map((d, i) => (
                <div key={d._id} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: categoryColors[i] }} />
                    <span className="text-xs text-[var(--text-muted)]">{d._id}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)]">{d.count} entries</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Goals ── */}
        <SectionTitle title="Goals" sub="User goal creation, completion rates and category breakdown" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          <StatChip label="Total Goals"     value={goalAnalytics?.totalGoals}     sub="All time"       color="#8b5cf6" icon={Icon.goal("#8b5cf6")} />
          <StatChip label="Active Goals"    value={goalAnalytics?.activeGoals}    sub="In progress"    color="#16a34a" icon={Icon.active("#16a34a")} />
          <StatChip label="Completed Goals" value={goalAnalytics?.completedGoals} sub="Achieved"       color="#10b981" icon={Icon.done("#10b981")} />
          <StatChip label="Avg Completion"  value={`${goalAnalytics?.avgCompletionRate || 0}%`} sub="Across all goals" color="#f59e0b" icon={Icon.pct("#f59e0b")} />
        </div>

        {/* Goal creation trend — NEW */}
        <div className="card mb-[14px]">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Goal Creation Trend</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">New goals created per month — shows feature engagement over time</div>
          <div className="relative h-[180px]">
            <Line
              data={goalsPerMonthData}
              options={{
                ...lineChartOptions,
                plugins: {
                  ...lineChartOptions.plugins,
                  tooltip: {
                    ...lineChartOptions.plugins.tooltip,
                    callbacks: { label: (ctx) => `${ctx.parsed.y} new goals` },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWideRev }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Goal Status</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Active vs completed vs overdue</div>
            <div className="relative h-[150px]"><Doughnut data={goalStatusData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: "Active",    value: goalAnalytics?.activeGoals,    color: "#10b981" },
                { label: "Completed", value: goalAnalytics?.completedGoals, color: "#16a34a" },
                { label: "Overdue",   value: goalAnalytics?.overdueGoals,   color: "#ef4444" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: item.color }} />
                    <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Goals by Category</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Number of goals per category — what users are saving for</div>
            <div className="relative h-[200px]"><Bar data={goalCategoryData} options={chartOptions} /></div>
          </div>
        </div>

        {/* ── Section 5: Accounts ── */}
        <SectionTitle title="Accounts" sub="Account setup behaviour, types and status overview" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col3 }}>
          <StatChip label="Total Accounts"    value={accountAnalytics?.totalAccounts}      sub={`Avg ${accountAnalytics?.avgAccountsPerUser} per user`} color="#16a34a" icon={Icon.account("#16a34a")} />
          <StatChip label="Cash Accounts"     value={accountAnalytics?.cashAccounts}       sub="Wallet-type accounts"  color="#f59e0b" icon={Icon.cash("#f59e0b")} />
          <StatChip label="Bank Accounts"     value={accountAnalytics?.bankAccounts}       sub="Bank-linked accounts"  color="#8b5cf6" icon={Icon.bank("#8b5cf6")} />
        </div>
        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWideRev }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Account Types</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Cash vs bank — which type users prefer to set up</div>
            <div className="relative h-[150px] max-w-[220px] mx-auto"><Doughnut data={accountTypeData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: "Cash",  value: accountAnalytics?.cashAccounts, color: "#f59e0b" },
                { label: "Bank",  value: accountAnalytics?.bankAccounts, color: "#0d9488" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: item.color }} />
                    <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)]">{item.value} accounts</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Avg accounts per user</div>
              <div className="text-base font-bold text-[var(--text)]">{accountAnalytics?.avgAccountsPerUser ?? "—"}</div>
            </div>
          </div>

          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Account Status</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-4">Active, frozen and closed accounts</div>
            <div className="flex flex-col gap-3 mb-4">
              {[
                { label: "Active", value: accountAnalytics?.activeAccounts,  bg: "var(--success-light)", textColor: "var(--success-text)", hoverBg: "#bbf7d0" },
                { label: "Frozen", value: accountAnalytics?.frozenAccounts,  bg: "var(--warning-light)", textColor: "var(--warning-text)", hoverBg: "#fde68a" },
                { label: "Closed", value: accountAnalytics?.closedAccounts,  bg: "var(--danger-light)",  textColor: "var(--danger-text)",  hoverBg: "#fecaca" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center px-[14px] py-[10px] rounded-lg"
                  style={{ background: item.bg, transition: "background 0.15s, transform 0.12s", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = item.hoverBg; e.currentTarget.style.transform = "translateX(3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = item.bg; e.currentTarget.style.transform = "translateX(0)"; }}
                >
                  <span className="text-[13px] font-medium" style={{ color: item.textColor }}>{item.label}</span>
                  <span className="text-lg font-bold" style={{ color: item.textColor }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Accounts per month trend — NEW */}
            <div className="pt-3 border-t border-[var(--border)]">
              <div className="text-[12px] font-semibold text-[var(--text)] mb-[6px]">Account Creation Trend</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-[10px]">New accounts created per month</div>
              <div className="relative h-[100px]"><Bar data={accountsPerMonthData} options={chartOptions} /></div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Analytics;