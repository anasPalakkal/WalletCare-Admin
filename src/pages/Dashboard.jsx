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
  Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Tooltip, Legend
);

const formatMonthLabel = (id) => {
  if (!id) return "";
  const date = new Date(id.year, id.month - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const formatCurrency = (val) => {
  if (!val && val !== 0) return "—";
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val}`;
};

// ── Mini stat block ───────────────────────────────────────────
const MiniStat = ({ label, value, color }) => (
  <div className="flex flex-col gap-[2px]">
    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.5px]">
      {label}
    </div>
    <div className="text-lg font-bold" style={{ color: color || "var(--text)" }}>
      {value ?? "—"}
    </div>
  </div>
);

// ── Section card with colored top border ──────────────────────
const SectionCard = ({ title, accent, stats, chart, children }) => (
  <div className="card" style={{ borderTop: `2px solid ${accent}` }}>
    <div className="text-xs font-semibold text-[var(--text)] mb-[14px] uppercase tracking-[0.5px]">
      {title}
    </div>
    <div className="flex items-start gap-4">
      <div className="flex flex-col gap-3 min-w-[130px] flex-shrink-0">
        {stats}
      </div>
      <div className="flex-1 relative h-[120px]">
        {chart}
      </div>
    </div>
    {children}
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
      ticks: { color: "#6b7280", font: { size: 9 }, maxTicksLimit: 4 },
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

  const [stats, setStats]                   = useState(null);
  const [userAnalytics, setUserAnalytics]   = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [txAnalytics, setTxAnalytics]       = useState(null);
  const [goalAnalytics, setGoalAnalytics]   = useState(null);
  const [accountAnalytics, setAccountAnalytics] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");

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

  // ── Chart datasets ────────────────────────────────────────────
  // 🔵→🟢 Users bar: indigo replaced with green
  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Users",
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      backgroundColor: "#16a34a",       // ✅ was #4f46e5 (indigo)
      hoverBackgroundColor: "#22c55e",  // ✅ was #6366f1
      borderRadius: 4,
      barPercentage: 0.65,
    }],
  };

  const incomeExpenseData = {
    labels: ["Income", "Expense"],
    datasets: [{
      data: [txAnalytics?.totalIncome || 0, txAnalytics?.totalExpense || 0],
      backgroundColor: ["#10b981", "#ef4444"],
      hoverBackgroundColor: ["#059669", "#dc2626"],
      borderWidth: 0,
    }],
  };

  // 🔵→🟢 Goals chart: indigo (active) replaced with green
  const goalStatusData = {
    labels: ["Active", "Completed", "Overdue"],
    datasets: [{
      data: [
        goalAnalytics?.activeGoals || 0,
        goalAnalytics?.completedGoals || 0,
        goalAnalytics?.overdueGoals || 0,
      ],
      backgroundColor: ["#16a34a", "#10b981", "#ef4444"],   // ✅ was #4f46e5
      hoverBackgroundColor: ["#15803d", "#059669", "#dc2626"],
      borderWidth: 0,
    }],
  };

  // 🔵→🩵 Accounts chart: blue (bank) replaced with teal
  const cashBankData = {
    labels: ["Cash", "Bank"],
    datasets: [{
      data: [accountAnalytics?.cashBalance || 0, accountAnalytics?.bankBalance || 0],
      backgroundColor: ["#f59e0b", "#0d9488"],   // ✅ was #3b82f6
      hoverBackgroundColor: ["#d97706", "#0f766e"],
      borderWidth: 0,
    }],
  };

  // 🔵→🟢 Feedback bar: deep blue replaced with green
  const feedbackMonthData = {
    labels: feedbackAnalytics?.feedbackPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "Feedback Count",
      data: feedbackAnalytics?.feedbackPerMonth?.map((d) => d.count) || [],
      backgroundColor: "#16a34a",       // ✅ was #3710b9 (deep blue)
      hoverBackgroundColor: "#15803d",  // ✅ was #4c1d95
      borderRadius: 4,
      barPercentage: 0.65,
    }],
  };

  // feedback category dot colors — replaced indigo with green
  const categoryDotColors = ["#16a34a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const col2 = isMobile ? "1fr" : "1fr 1fr";

  return (
    <Layout>
      <Topbar title="Dashboard" subtitle="System overview" />
      <div className="main-content">

        {/* ── Row 1: Users + Transactions ── */}
        <div
          className="grid gap-3 mb-3"
          style={{ gridTemplateColumns: col2 }}
        >
          {/* Users card — accent green instead of indigo */}
          <SectionCard
            title="Users"
            accent="#16a34a"          // ✅ was #4f46e5
            stats={
              <>
                <MiniStat label="Total"   value={stats?.totalUsers} />
                <MiniStat label="Active"  value={stats?.activeUsers}  color="#10b981" />
                <MiniStat label="Banned"  value={stats?.bannedUsers}  color="#ef4444" />
                <MiniStat label="Premium" value={stats?.premiumUsers} color="#8b5cf6" />
              </>
            }
            chart={<Bar data={userGrowthData} options={miniBarOpts} />}
          >
            <div className="flex gap-4 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Scheduled deletion</div>
                <div className="text-[15px] font-bold text-[#14b8a6]">{stats?.scheduledForDeletion ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Free users</div>
                <div className="text-[15px] font-bold text-[var(--text)]">
                  {userAnalytics?.premiumVsFree?.freeUsers ?? "—"}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Transactions card */}
          <SectionCard
            title="Transactions"
            accent="#10b981"
            stats={
              <>
                <MiniStat label="Total"   value={txAnalytics?.totalTransactions} />
                <MiniStat label="Income"  value={formatCurrency(txAnalytics?.totalIncome)}  color="#10b981" />
                <MiniStat label="Expense" value={formatCurrency(txAnalytics?.totalExpense)} color="#ef4444" />
              </>
            }
            chart={<Doughnut data={incomeExpenseData} options={miniDoughnutOpts} />}
          >
            <div className="flex gap-4 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Income count</div>
                <div className="text-[15px] font-bold text-[#10b981]">{txAnalytics?.incomeCount ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Expense count</div>
                <div className="text-[15px] font-bold text-[#ef4444]">{txAnalytics?.expenseCount ?? "—"}</div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Row 2: Goals + Accounts ── */}
        <div
          className="grid gap-3 mb-3"
          style={{ gridTemplateColumns: col2 }}
        >
          {/* Goals card */}
          <SectionCard
            title="Goals"
            accent="#8b5cf6"
            stats={
              <>
                <MiniStat label="Total"     value={goalAnalytics?.totalGoals} />
                <MiniStat label="Active"    value={goalAnalytics?.activeGoals}     color="#16a34a" /> {/* ✅ was #4f46e5 */}
                <MiniStat label="Completed" value={goalAnalytics?.completedGoals}  color="#10b981" />
                <MiniStat label="Overdue"   value={goalAnalytics?.overdueGoals}    color="#ef4444" />
              </>
            }
            chart={<Doughnut data={goalStatusData} options={miniDoughnutOpts} />}
          >
            <div className="flex gap-4 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Avg completion</div>
                <div className="text-[15px] font-bold text-[#8b5cf6]">
                  {goalAnalytics?.avgCompletionRate
                    ? `${Number(goalAnalytics.avgCompletionRate).toFixed(1)}%`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Target amount</div>
                <div className="text-[15px] font-bold text-[var(--text)]">
                  {formatCurrency(goalAnalytics?.totalTargetAmount)}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Accounts card — blue replaced with teal */}
          <SectionCard
            title="Accounts"
            accent="#0d9488"          // ✅ was #3b82f6
            stats={
              <>
                <MiniStat label="Total"         value={accountAnalytics?.totalAccounts} />
                <MiniStat label="Total balance" value={formatCurrency(accountAnalytics?.totalBalance)} color="#0d9488" /> {/* ✅ was #3b82f6 */}
                <MiniStat label="Avg balance"   value={formatCurrency(accountAnalytics?.avgBalance)} />
              </>
            }
            chart={<Doughnut data={cashBankData} options={miniDoughnutOpts} />}
          >
            <div className="flex gap-4 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Cash</div>
                <div className="text-[15px] font-bold text-[#f59e0b]">
                  {formatCurrency(accountAnalytics?.cashBalance)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Bank</div>
                <div className="text-[15px] font-bold text-[#0d9488]"> {/* ✅ was #3b82f6 */}
                  {formatCurrency(accountAnalytics?.bankBalance)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Avg / user</div>
                <div className="text-[15px] font-bold text-[var(--text)]">
                  {accountAnalytics?.avgAccountsPerUser
                    ? Number(accountAnalytics.avgAccountsPerUser).toFixed(1)
                    : "—"}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Row 3: Feedback full width ── */}
        <SectionCard
          title="Feedback & Rating"
          accent="#f59e0b"
          stats={
            <>
              <MiniStat label="Total"           value={stats?.totalFeedbacks} />
              <MiniStat label="This month"      value={feedbackAnalytics?.totalFeedbacksThisMonth} color="#f59e0b" />
              <MiniStat
                label="Feedback Rating"
                value={feedbackAnalytics?.avgRating
                  ? `${Number(feedbackAnalytics.avgRating).toFixed(1)} / 5`
                  : "—"}
                color="#10b981"
              />
              <MiniStat
                label="User Rating"
                value={stats?.avgUserRating
                  ? `${Number(stats.avgUserRating).toFixed(1)} / 5`
                  : "—"}
                color="#8b5cf6"
              />
            </>
          }
          chart={<Bar data={feedbackMonthData} options={miniBarOpts} />}
        >
          <div className="flex gap-3 flex-wrap mt-3 pt-[10px] border-t border-[var(--border)]">
            {feedbackAnalytics?.feedbackByCategory?.map((d, i) => (
              <div key={d._id} className="flex items-center gap-[5px]">
                <div
                  className="w-2 h-2 rounded-[2px] flex-shrink-0"
                  style={{ background: categoryDotColors[i] }}  // ✅ was #4f46e5 first item
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {d._id} ({d.count})
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </Layout>
  );
};

export default Dashboard;