import { useEffect, useState, useCallback } from "react";
import useWindowSize from "../hooks/useWindowSize";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  LineElement, PointElement,
  Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  LineElement, PointElement,
  Tooltip, Legend, Filler
);

const formatMonthLabel = (id) => {
  if (!id) return "";
  const date = new Date(id.year, id.month - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// ── Compact card — chart on top, stat row below ───────────────
const CompactCard = ({ title, accent, stats, chart, children }) => (
  <div className="card" style={{ borderTop: `2px solid ${accent}`, minWidth: 0 }}>
    <div className="text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-[0.5px]">
      {title}
    </div>
    <div className="relative h-[110px] mb-3">
      {chart}
    </div>
    <div className="grid grid-cols-3 gap-1">
      {stats}
    </div>
    {children}
  </div>
);

// ── Compact stat pill ─────────────────────────────────────────
const CompactStat = ({ label, value, color }) => (
  <div
    className="flex flex-col items-center justify-center rounded-md py-[6px] px-1 bg-[var(--bg)] border border-[var(--border)]"
    style={{ transition: "transform 0.12s, border-color 0.15s", cursor: "default" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color || "var(--accent)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
  >
    <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.4px] text-center leading-tight mb-[2px]">
      {label}
    </div>
    <div
      className="text-[13px] font-bold leading-tight text-center truncate w-full text-center"
      style={{ color: color || "var(--text)" }}
    >
      {value ?? "—"}
    </div>
  </div>
);

// ── Adoption mini-bar ─────────────────────────────────────────
const MiniAdoptionBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-[var(--text-muted)] w-[90px] flex-shrink-0 truncate">{label}</span>
    <div className="flex-1 h-[5px] rounded-full bg-[var(--border)]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
    <span className="text-[10px] font-bold w-[32px] text-right" style={{ color }}>{value}%</span>
  </div>
);

// ── Chart options ─────────────────────────────────────────────
const miniBarOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: "rgba(0,0,0,0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
    },
  },
  scales: {
    x: {
      ticks: { color: "#6b7280", font: { size: 9 }, maxRotation: 0 },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: { color: "#6b7280", font: { size: 9 }, maxTicksLimit: 4, precision: 0 },
      grid: { color: "rgba(107,114,128,0.08)" },
      border: { display: false },
    },
  },
  interaction: { mode: "index", intersect: false },
  onHover: (event, activeElements) => {
    event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
  },
};

const miniLineOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: "rgba(0,0,0,0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
      cornerRadius: 6,
      displayColors: false,
    },
  },
  scales: {
    x: {
      ticks: { color: "#6b7280", font: { size: 9 }, maxRotation: 0 },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: { color: "#6b7280", font: { size: 9 }, maxTicksLimit: 4, precision: 0 },
      grid: { color: "rgba(107,114,128,0.08)" },
      border: { display: false },
    },
  },
  interaction: { mode: "index", intersect: false },
  onHover: (event, activeElements) => {
    event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
  },
};

const miniDoughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: "rgba(0,0,0,0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
      callbacks: {
        label: function (context) {
          let label = context.label || "";
          if (label) label += ": ";
          if (context.parsed !== null) label += context.parsed.toLocaleString();
          return label;
        },
      },
    },
  },
  interaction: { mode: "point", intersect: true },
  onHover: (event, activeElements) => {
    event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
  },
  elements: {
    arc: { hoverOffset: 6, hoverBorderWidth: 2, hoverBorderColor: "#fff" },
  },
};

const POLL_INTERVAL = 60000;

const Dashboard = () => {
  const { isMobile } = useWindowSize();

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
      const [statsRes, userRes, feedbackRes, txRes, goalRes, accountRes] =
        await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/analytics/users"),
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
    } catch (err) {
      setError("Failed to load dashboard data.");
      console.error("Dashboard error:", err);
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => { registerRefresh(fetchAll); }, [registerRefresh, fetchAll]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return (
    <Layout>
      <Topbar title="Dashboard" subtitle="System overview" />
      <div className="main-content">
        <div className="loading">Loading dashboard...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar title="Dashboard" subtitle="System overview" />
      <div className="main-content">
        <div className="p-5 text-[var(--danger)]">{error}</div>
      </div>
    </Layout>
  );

  // ── Derived values ────────────────────────────────────────────
  const totalUsers    = stats?.totalUsers || 0;
  const adoption      = userAnalytics?.adoption || {};

  const avgTxPerUser  = totalUsers && txAnalytics?.totalTransactions
    ? (txAnalytics.totalTransactions / totalUsers).toFixed(1)
    : "—";

  const goalSuccessRate = goalAnalytics?.totalGoals
    ? Math.round(((goalAnalytics.completedGoals || 0) / goalAnalytics.totalGoals) * 100)
    : 0;

  // ── Chart datasets ────────────────────────────────────────────
  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Users",
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      borderColor: "#16a34a",
      backgroundColor: "rgba(22,163,74,0.12)",
      pointBackgroundColor: "#16a34a",
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  };

  // Income vs expense ENTRY COUNT split (not rupee amounts)
  const incomeExpenseCountData = {
    labels: ["Income entries", "Expense entries"],
    datasets: [{
      data: [txAnalytics?.incomeCount || 0, txAnalytics?.expenseCount || 0],
      backgroundColor: ["#10b981", "#ef4444"],
      hoverBackgroundColor: ["#059669", "#dc2626"],
      borderWidth: 0,
    }],
  };

  const goalStatusData = {
    labels: ["Active", "Completed", "Overdue"],
    datasets: [{
      data: [
        goalAnalytics?.activeGoals    || 0,
        goalAnalytics?.completedGoals || 0,
        goalAnalytics?.overdueGoals   || 0,
      ],
      backgroundColor: ["#16a34a", "#10b981", "#ef4444"],
      hoverBackgroundColor: ["#15803d", "#059669", "#dc2626"],
      borderWidth: 0,
    }],
  };

  // Account TYPE split — count only (no balances)
  const accountTypeCountData = {
    labels: ["Cash", "Bank"],
    datasets: [{
      data: [accountAnalytics?.cashAccounts || 0, accountAnalytics?.bankAccounts || 0],
      backgroundColor: ["#f59e0b", "#0d9488"],
      hoverBackgroundColor: ["#d97706", "#0f766e"],
      borderWidth: 0,
    }],
  };

  const feedbackMonthData = {
    labels: feedbackAnalytics?.feedbackPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "Feedback Count",
      data: feedbackAnalytics?.feedbackPerMonth?.map((d) => d.count) || [],
      backgroundColor: "#16a34a",
      hoverBackgroundColor: "#15803d",
      borderRadius: 4,
      barPercentage: 0.65,
    }],
  };

  const categoryDotColors = ["#16a34a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <Layout>
      <Topbar title="Dashboard" subtitle="System overview" />
      <div className="main-content">

        {/* ── Row 1: Users ── */}
        <div className="mb-3">
          <div className="card" style={{ borderTop: "2px solid #16a34a" }}>
            <div className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-[0.5px]">
              Users
            </div>
            <div className="flex items-start gap-5 flex-wrap">
              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0 w-[220px]">
                {[
                  { label: "New This Month", value: stats?.newUsersThisMonth, color: "#10b981" },
                  { label: "Total",          value: stats?.totalUsers,        color: "#16a34a" },
                  { label: "Banned",         value: stats?.bannedUsers,       color: "#ef4444" },
                  { label: "Premium",        value: stats?.premiumUsers,      color: "#8b5cf6" },
                  { label: "Scheduled",      value: stats?.scheduledForDeletion, color: "#f59e0b" },
                  { label: "Admins",         value: stats?.totalAdmins,       color: "#0d9488" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex flex-col justify-center rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--bg)]"
                    style={{ transition: "transform 0.12s, border-color 0.15s", cursor: "default" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <div className="text-[9px] uppercase tracking-[0.5px] text-[var(--text-muted)] mb-[3px]">{label}</div>
                    <div className="text-base font-bold leading-none" style={{ color }}>{value ?? "—"}</div>
                  </div>
                ))}
              </div>
              {/* Line chart */}
              <div className="flex-1 relative h-[170px] min-w-[200px]">
                <Line data={userGrowthData} options={miniLineOpts} />
              </div>
            </div>

            {/* Feature adoption mini-bars */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-[8px]">
              <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.5px] mb-[2px]">Feature Adoption</div>
              <MiniAdoptionBar label="Goal adoption"     value={adoption.goalAdoptionRate  ?? 0} color="#8b5cf6" />
              <MiniAdoptionBar label="Tx adoption"       value={adoption.txAdoptionRate    ?? 0} color="#10b981" />
              <MiniAdoptionBar label="Multi-account"     value={adoption.multiAccountRate  ?? 0} color="#0d9488" />
            </div>
          </div>
        </div>

        {/* ── Row 2: Transactions + Goals + Accounts ── */}
        <div
          className="grid gap-3 mb-3"
          style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr" }}
        >
          {/* Transactions card — counts only, no rupees */}
          <CompactCard
            title="Transactions"
            accent="#10b981"
            chart={<Doughnut data={incomeExpenseCountData} options={miniDoughnutOpts} />}
            stats={
              <>
                <CompactStat label="Total"    value={txAnalytics?.totalTransactions} />
                <CompactStat label="Income"   value={txAnalytics?.incomeCount}  color="#10b981" />
                <CompactStat label="Expense"  value={txAnalytics?.expenseCount} color="#ef4444" />
                <CompactStat label="Avg/User" value={avgTxPerUser} />
              </>
            }
          >
            <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
              Showing entry counts — income & expense logs
            </div>
          </CompactCard>

          {/* Goals card */}
          <CompactCard
            title="Goals"
            accent="#8b5cf6"
            chart={<Doughnut data={goalStatusData} options={miniDoughnutOpts} />}
            stats={
              <>
                <CompactStat label="Total"     value={goalAnalytics?.totalGoals} />
                <CompactStat label="Active"    value={goalAnalytics?.activeGoals}    color="#16a34a" />
                <CompactStat label="Done"      value={goalAnalytics?.completedGoals} color="#10b981" />
                <CompactStat label="Overdue"   value={goalAnalytics?.overdueGoals}   color="#ef4444" />
                <CompactStat label="Avg %"     value={goalAnalytics?.avgCompletionRate ? `${Number(goalAnalytics.avgCompletionRate).toFixed(1)}%` : "—"} color="#8b5cf6" />
                <CompactStat label="Success"   value={`${goalSuccessRate}%`} color="#10b981" />
              </>
            }
          />

          {/* Accounts card — counts only, no balances */}
          <CompactCard
            title="Accounts"
            accent="#0d9488"
            chart={<Doughnut data={accountTypeCountData} options={miniDoughnutOpts} />}
            stats={
              <>
                <CompactStat label="Total"    value={accountAnalytics?.totalAccounts} />
                <CompactStat label="Cash"     value={accountAnalytics?.cashAccounts}  color="#f59e0b" />
                <CompactStat label="Bank"     value={accountAnalytics?.bankAccounts}  color="#0d9488" />
                <CompactStat label="Active"   value={accountAnalytics?.activeAccounts} color="#10b981" />
                <CompactStat label="Frozen"   value={accountAnalytics?.frozenAccounts} color="#f59e0b" />
                <CompactStat label="Avg/User" value={accountAnalytics?.avgAccountsPerUser ? Number(accountAnalytics.avgAccountsPerUser).toFixed(1) : "—"} />
              </>
            }
          >
            <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
              Account counts by type and status
            </div>
          </CompactCard>
        </div>

        {/* ── Row 3: Feedback ── */}
        <div className="card" style={{ borderTop: "2px solid #f59e0b" }}>
          <div className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-[0.5px]">
            Feedback & Rating
          </div>
          <div className="flex items-start gap-5 flex-wrap">
            {/* Stat boxes */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0 w-[220px]">
              {[
                { label: "Total",           value: stats?.totalFeedbacks,                                                                                color: "#f59e0b" },
                { label: "This Month",      value: feedbackAnalytics?.totalFeedbacksThisMonth,                                                           color: "#10b981" },
                { label: "Feedback Rating", value: feedbackAnalytics?.avgRating ? `${Number(feedbackAnalytics.avgRating).toFixed(1)} / 5` : "—",        color: "#8b5cf6" },
                { label: "User Rating",     value: stats?.avgUserRating ? `${Number(stats.avgUserRating).toFixed(1)} / 5` : "—",                        color: "#0d9488" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col justify-center rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--bg)]"
                  style={{ transition: "transform 0.12s, border-color 0.15s", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div className="text-[9px] uppercase tracking-[0.5px] text-[var(--text-muted)] mb-[3px]">{label}</div>
                  <div className="text-base font-bold leading-none" style={{ color }}>{value ?? "—"}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div className="flex-1 relative h-[120px] min-w-[200px]">
              <Bar data={feedbackMonthData} options={miniBarOpts} />
            </div>
          </div>
          {/* Category dots */}
          <div className="flex gap-3 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
            {feedbackAnalytics?.feedbackByCategory?.map((d, i) => (
              <div key={d._id} className="flex items-center gap-[5px]">
                <div className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: categoryDotColors[i] }} />
                <span className="text-[11px] text-[var(--text-muted)]">{d._id} ({d.count})</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;