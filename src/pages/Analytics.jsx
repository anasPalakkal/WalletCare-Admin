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
  Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const formatMonthLabel = (id) => {
  if (!id) return "";
  const date = new Date(id.year, id.month - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const formatCurrency = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

// ── Summary card with colored top border ─────────────────────
const SummaryCard = ({ label, value, sub, color, onClick }) => (
  <div
    className="card transition-transform duration-200"
    style={{ borderTop: `3px solid ${color}`, cursor: onClick ? "pointer" : "default" }}
    onClick={onClick}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = "translateY(0)")}
  >
    <div className="text-[11px] text-[var(--text-muted)] mb-[6px] uppercase tracking-[0.5px]">{label}</div>
    <div className="text-[22px] font-bold text-[var(--text)]">{value ?? "—"}</div>
    {sub && <div className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</div>}
  </div>
);

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
    } catch {
      setError("Failed to load analytics.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, POLL_INTERVAL); return () => clearInterval(i); }, [fetchAll]);
  useEffect(() => { registerRefresh(fetchAll); }, [registerRefresh, fetchAll]);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, backgroundColor: "rgba(0,0,0,0.8)", titleColor: "#fff", bodyColor: "#fff", padding: 12, cornerRadius: 8, displayColors: true },
    },
    scales: {
      x: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { color: "rgba(107,114,128,0.1)" }, border: { display: false } },
      y: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { color: "rgba(107,114,128,0.1)" }, border: { display: false }, beginAtZero: true },
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
  const col4      = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)";
  const colWide   = isMobile ? "1fr" : "2fr 1fr";
  const colWideRev = isMobile ? "1fr" : "1fr 2fr";

  // ✅ All blues replaced:
  // #4f46e5 → #16a34a (green)   #6366f1 → #22c55e
  // #3b82f6 → #0d9488 (teal)    #818cf8 → #4ade80
  const userGrowthColors      = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"];
  const feedbackCategoryColors = ["#16a34a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const categoryColors         = ["#ef4444", "#f59e0b", "#10b981", "#0d9488", "#8b5cf6", "#ec4899"];

  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{ label: "New Users", data: userAnalytics?.userGrowth?.map((d) => d.count) || [], backgroundColor: userGrowthColors[0], hoverBackgroundColor: userGrowthColors[1], borderRadius: 6, barPercentage: 0.7 }],
  };

  const premiumVsFreeData = {
    labels: ["Premium", "Free"],
    datasets: [{ data: [userAnalytics?.premiumVsFree?.premiumUsers || 0, userAnalytics?.premiumVsFree?.freeUsers || 0], backgroundColor: ["#8b5cf6", "#6b7280"], hoverBackgroundColor: ["#9333ea", "#4b5563"], borderWidth: 0 }],
  };

  const userStatusData = {
    labels: ["Active", "Banned", "Scheduled for deletion"],
    datasets: [{ data: [stats?.activeUsers || 0, stats?.bannedUsers || 0, stats?.scheduledForDeletion || 0], backgroundColor: ["#10b981", "#ef4444", "#f59e0b"], hoverBackgroundColor: ["#059669", "#dc2626", "#d97706"], borderWidth: 0 }],
  };

  const feedbackByCategoryData = {
    labels: feedbackAnalytics?.feedbackByCategory?.map((d) => d._id) || [],
    datasets: [{ label: "Feedback Count", data: feedbackAnalytics?.feedbackByCategory?.map((d) => d.count) || [], backgroundColor: feedbackCategoryColors, hoverBackgroundColor: feedbackCategoryColors.map((c) => c + "dd"), borderRadius: 6, barPercentage: 0.7 }],
  };

  const monthlyVolumeData = {
    labels: txAnalytics?.monthlyVolume?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{ label: "Transactions", data: txAnalytics?.monthlyVolume?.map((d) => d.count) || [], backgroundColor: "#10b981", hoverBackgroundColor: "#059669", borderRadius: 6, barPercentage: 0.7 }],
  };

  const topCategoriesData = {
    labels: txAnalytics?.topCategories?.slice(0, 4).map((d) => d._id) || [],
    datasets: [{ data: txAnalytics?.topCategories?.slice(0, 4).map((d) => d.total) || [], backgroundColor: categoryColors, hoverBackgroundColor: categoryColors.map((c) => c + "dd"), borderWidth: 0 }],
  };

  // ✅ Goals completed: #4f46e5 → #16a34a
  const goalStatusData = {
    labels: ["Active", "Completed", "Overdue"],
    datasets: [{ data: [goalAnalytics?.activeGoals || 0, goalAnalytics?.completedGoals || 0, goalAnalytics?.overdueGoals || 0], backgroundColor: ["#10b981", "#16a34a", "#ef4444"], hoverBackgroundColor: ["#059669", "#15803d", "#dc2626"], borderWidth: 0 }],
  };

  const goalCategoryData = {
    labels: goalAnalytics?.goalsByCategory?.map((d) => d._id) || [],
    datasets: [{ label: "Goals", data: goalAnalytics?.goalsByCategory?.map((d) => d.count) || [], backgroundColor: "#8b5cf6", hoverBackgroundColor: "#7c3aed", borderRadius: 6, barPercentage: 0.7 }],
  };

  // ✅ Account type: #4f46e5 (bank) → #0d9488 (teal)
  const accountTypeData = {
    labels: ["Cash", "Bank"],
    datasets: [{ data: [accountAnalytics?.cashAccounts || 0, accountAnalytics?.bankAccounts || 0], backgroundColor: ["#f59e0b", "#0d9488"], hoverBackgroundColor: ["#d97706", "#0f766e"], borderWidth: 0 }],
  };

  return (
    <Layout>
      <Topbar title="Analytics" subtitle="Deep dive into system metrics" />
      <div className="main-content">

        {/* ── Section 1: Users ── */}
        <SectionTitle title="Users" sub="User growth, demographics and status breakdown" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          {/* ✅ Total Users: #4f46e5 → #16a34a */}
          <SummaryCard label="Total Users"   value={stats?.totalUsers}   sub="All time"            color="#16a34a" onClick={() => navigate("/users")} />
          <SummaryCard label="Active Users"  value={stats?.activeUsers}  sub="Currently active"   color="#10b981" onClick={() => navigate("/users?filter=active")} />
          <SummaryCard label="Premium Users" value={stats?.premiumUsers} sub={`${premiumPercent}% of total`} color="#8b5cf6" onClick={() => navigate("/users?filter=premium")} />
          <SummaryCard label="Banned Users"  value={stats?.bannedUsers}  sub="Suspended accounts" color="#ef4444" onClick={() => navigate("/users?filter=banned")} />
        </div>

        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWide }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">User Growth</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">New registrations per month</div>
            <div className="relative h-[200px]"><Bar data={userGrowthData} options={chartOptions} /></div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Premium vs Free</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">User subscription status</div>
            <div className="relative h-[150px]"><Doughnut data={premiumVsFreeData} options={doughnutOptions} /></div>
            <div className="flex justify-around mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Premium</div>
                <div className="text-lg font-bold text-[#8b5cf6]">{userAnalytics?.premiumVsFree?.premiumUsers || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Free</div>
                <div className="text-lg font-bold text-[#6b7280]">{userAnalytics?.premiumVsFree?.freeUsers || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-5">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">User Status Distribution</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Active, banned and scheduled for deletion</div>
          <div className="relative h-[200px] max-w-[400px] mx-auto"><Doughnut data={userStatusData} options={doughnutOptions} /></div>
          <div className="flex justify-around mt-4 pt-3 border-t border-[var(--border)] flex-wrap gap-3">
            <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Active</div><div className="text-lg font-bold text-[#10b981]">{stats?.activeUsers || 0}</div></div>
            <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Banned</div><div className="text-lg font-bold text-[#ef4444]">{stats?.bannedUsers || 0}</div></div>
            <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Scheduled</div><div className="text-lg font-bold text-[#f59e0b]">{stats?.scheduledForDeletion || 0}</div></div>
          </div>
        </div>

        {/* ── Section 2: Feedback ── */}
        <SectionTitle title="Feedback & Rating" sub="User feedback volume, categories and satisfaction ratings" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          <SummaryCard label="Total Feedback" value={stats?.totalFeedbacks} sub="All time" color="#f59e0b" onClick={() => navigate("/feedback")} />
          <SummaryCard label="This Month" value={feedbackAnalytics?.totalFeedbacksThisMonth} sub="Current month" color="#10b981" onClick={() => navigate("/feedback")} />
          <SummaryCard label="Feedback Rating" value={feedbackAnalytics?.avgRating ? `${feedbackAnalytics.avgRating.toFixed(1)} / 5` : "—"} sub="Feedback satisfaction" color="#8b5cf6" />
          <SummaryCard label="User Rating" value={stats?.avgUserRating ? `${stats.avgUserRating.toFixed(1)} / 5` : "—"} sub="User given ratings" color="#14b8a6" />
        </div>
        <div className="card mb-5">
          <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Feedback by Category</div>
          <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Distribution across different categories</div>
          <div className="relative h-[220px]"><Bar data={feedbackByCategoryData} options={chartOptions} /></div>
        </div>

        {/* ── Section 3: Transactions ── */}
        <SectionTitle title="Transactions" sub="Transaction volume, income/expense breakdown and top categories" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          <SummaryCard label="Total Transactions" value={txAnalytics?.totalTransactions} sub="All time" color="#10b981" />
          <SummaryCard label="Total Income"  value={formatCurrency(txAnalytics?.totalIncome)}  sub={`${txAnalytics?.incomeCount || 0} transactions`} color="#10b981" />
          <SummaryCard label="Total Expense" value={formatCurrency(txAnalytics?.totalExpense)} sub={`${txAnalytics?.expenseCount || 0} transactions`} color="#ef4444" />
          <SummaryCard label="Net Balance"   value={formatCurrency(Math.abs((txAnalytics?.totalIncome || 0) - (txAnalytics?.totalExpense || 0)))} sub={(txAnalytics?.totalIncome || 0) >= (txAnalytics?.totalExpense || 0) ? "Net positive" : "Net negative"} color="#14b8a6" />
        </div>
        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWide }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Monthly Volume</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Transaction count per month</div>
            <div className="relative h-[200px]"><Bar data={monthlyVolumeData} options={chartOptions} /></div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Top Spending Categories</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">By total amount spent</div>
            <div className="relative h-[150px]"><Doughnut data={topCategoriesData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-[6px] mt-3">
              {txAnalytics?.topCategories?.slice(0, 4).map((d, i) => (
                <div key={d._id} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: categoryColors[i] }} />
                    <span className="text-xs text-[var(--text-muted)]">{d._id}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)]">{formatCurrency(d.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Goals ── */}
        <SectionTitle title="Goals" sub="User goal creation, completion and category breakdown" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          <SummaryCard label="Total Goals"     value={goalAnalytics?.totalGoals}     sub="All time"       color="#8b5cf6" />
          {/* ✅ Active Goals: #4f46e5 → #16a34a */}
          <SummaryCard label="Active Goals"    value={goalAnalytics?.activeGoals}    sub="In progress"    color="#16a34a" />
          <SummaryCard label="Completed Goals" value={goalAnalytics?.completedGoals} sub="Achieved"       color="#10b981" />
          <SummaryCard label="Avg Completion"  value={`${goalAnalytics?.avgCompletionRate || 0}%`} sub="Across all goals" color="#f59e0b" />
        </div>
        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWideRev }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Goal Status</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Active vs completed vs overdue</div>
            <div className="relative h-[150px]"><Doughnut data={goalStatusData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: "Active",    value: goalAnalytics?.activeGoals,    color: "#10b981" },
                { label: "Completed", value: goalAnalytics?.completedGoals, color: "#16a34a" }, // ✅ was #4f46e5
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
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Total target amount</div>
              <div className="text-base font-bold text-[var(--text)]">{formatCurrency(goalAnalytics?.totalTargetAmount || 0)}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-[6px] mb-1">Saved so far</div>
              <div className="text-base font-bold text-[var(--success)]">{formatCurrency(goalAnalytics?.totalCurrentAmount || 0)}</div>
            </div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Goals by Category</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Number of goals per category</div>
            <div className="relative h-[200px]"><Bar data={goalCategoryData} options={chartOptions} /></div>
          </div>
        </div>

        {/* ── Section 5: Accounts ── */}
        <SectionTitle title="Accounts" sub="Account types, balances and status overview" />
        <div className="grid gap-3 mb-[14px]" style={{ gridTemplateColumns: col4 }}>
          {/* ✅ Total Accounts: #4f46e5 → #16a34a */}
          <SummaryCard label="Total Accounts" value={accountAnalytics?.totalAccounts} sub={`Avg ${accountAnalytics?.avgAccountsPerUser} per user`} color="#16a34a" />
          <SummaryCard label="Total Balance"  value={formatCurrency(accountAnalytics?.totalBalance)} sub="Across all accounts" color="#10b981" />
          <SummaryCard label="Cash Accounts"  value={accountAnalytics?.cashAccounts} sub={formatCurrency(accountAnalytics?.cashBalance)} color="#f59e0b" />
          <SummaryCard label="Bank Accounts"  value={accountAnalytics?.bankAccounts} sub={formatCurrency(accountAnalytics?.bankBalance)} color="#8b5cf6" />
        </div>
        <div className="grid gap-[14px] mb-5" style={{ gridTemplateColumns: colWideRev }}>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Account Types</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-[14px]">Cash vs bank accounts</div>
            <div className="relative h-[150px]"><Doughnut data={accountTypeData} options={doughnutOptions} /></div>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: "Cash", value: accountAnalytics?.cashAccounts, balance: accountAnalytics?.cashBalance, color: "#f59e0b" },
                { label: "Bank", value: accountAnalytics?.bankAccounts, balance: accountAnalytics?.bankBalance, color: "#0d9488" }, // ✅ was #4f46e5
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: item.color }} />
                    <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[var(--text)]">{item.value} accounts</span>
                    <span className="text-[11px] text-[var(--text-muted)] ml-[6px]">{formatCurrency(item.balance || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-1">Account Status</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-4">Active, frozen and closed accounts</div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Active", value: accountAnalytics?.activeAccounts,  bg: "var(--success-light)", textColor: "var(--success-text)" },
                { label: "Frozen", value: accountAnalytics?.frozenAccounts,  bg: "var(--warning-light)", textColor: "var(--warning-text)" },
                { label: "Closed", value: accountAnalytics?.closedAccounts,  bg: "var(--danger-light)",  textColor: "var(--danger-text)" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center px-[14px] py-[10px] rounded-lg" style={{ background: item.bg }}>
                  <span className="text-[13px] font-medium" style={{ color: item.textColor }}>{item.label}</span>
                  <span className="text-lg font-bold" style={{ color: item.textColor }}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="text-[11px] text-[var(--text-muted)] mb-1">Avg balance per account</div>
                <div className="text-lg font-bold text-[var(--text)]">{formatCurrency(accountAnalytics?.avgBalance || 0)}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Analytics;