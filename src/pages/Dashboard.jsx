import { useEffect, useState, useCallback } from "react";
import useWindowSize from "../hooks/useWindowSize";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
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

const MiniStat = ({ label, value, color }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
    <div style={{
      fontSize: "10px", color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {label}
    </div>
    <div style={{
      fontSize: "18px", fontWeight: "700",
      color: color || "var(--text)",
    }}>
      {value ?? "—"}
    </div>
  </div>
);

const SectionCard = ({ title, accent, stats, chart, children }) => (
  <div className="card" style={{ borderTop: `2px solid ${accent}` }}>
    <div style={{
      fontSize: "12px", fontWeight: "600",
      color: "var(--text)", marginBottom: "14px",
      textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {title}
    </div>
    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
      <div style={{
        display: "flex", flexDirection: "column",
        gap: "12px", minWidth: "130px", flexShrink: 0,
      }}>
        {stats}
      </div>
      <div style={{ flex: 1, position: "relative", height: "120px" }}>
        {chart}
      </div>
    </div>
    {children}
  </div>
);

const miniBarOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
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
};

const miniDoughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
};

const POLL_INTERVAL = 60000; // 60 seconds

const Dashboard = () => {
  const { isMobile, isTablet } = useWindowSize();

  const [stats, setStats] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [txAnalytics, setTxAnalytics] = useState(null);
  const [goalAnalytics, setGoalAnalytics] = useState(null);
  const [accountAnalytics, setAccountAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── useCallback so interval and button share the same reference ──────
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [
        statsRes, userRes, feedbackRes,
        txRes, goalRes, accountRes,
      ] = await Promise.all([
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
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError("Failed to load dashboard data.");
      console.error("Dashboard error:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // ── initial load + auto poll every 60s ───────────────────────────────
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(interval); // cleanup on unmount
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
      <Topbar
        title="Dashboard"
        subtitle="System overview"
        onRefresh={fetchAll}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />
      <div className="main-content">
        <div style={{ color: "var(--danger)", padding: "20px" }}>{error}</div>
      </div>
    </Layout>
  );

  // ── chart data ────────────────────────────────────────────────────────

  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      backgroundColor: "#4f46e5",
      borderRadius: 4,
      barPercentage: 0.65,
    }],
  };

  const incomeExpenseData = {
    labels: ["Income", "Expense"],
    datasets: [{
      data: [
        txAnalytics?.totalIncome || 0,
        txAnalytics?.totalExpense || 0,
      ],
      backgroundColor: ["#10b981", "#ef4444"],
      borderWidth: 0,
    }],
  };

  const goalStatusData = {
    labels: ["Active", "Completed", "Overdue"],
    datasets: [{
      data: [
        goalAnalytics?.activeGoals || 0,
        goalAnalytics?.completedGoals || 0,
        goalAnalytics?.overdueGoals || 0,
      ],
      backgroundColor: ["#4f46e5", "#10b981", "#ef4444"],
      borderWidth: 0,
    }],
  };

  const cashBankData = {
    labels: ["Cash", "Bank"],
    datasets: [{
      data: [
        accountAnalytics?.cashBalance || 0,
        accountAnalytics?.bankBalance || 0,
      ],
      backgroundColor: ["#f59e0b", "#3b82f6"],
      borderWidth: 0,
    }],
  };

  const feedbackMonthData = {
    labels: feedbackAnalytics?.feedbackPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      data: feedbackAnalytics?.feedbackPerMonth?.map((d) => d.count) || [],
      backgroundColor: "#10b981",
      borderRadius: 4,
      barPercentage: 0.65,
    }],
  };

  const col2 = isMobile ? "1fr" : "1fr 1fr";

  return (
    <Layout>
      <Topbar
        title="Dashboard"
        subtitle="System overview"
        onRefresh={fetchAll}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />
      <div className="main-content">

        {/* ── Row 1: Users + Transactions ── */}
        <div style={{ display: "grid", gridTemplateColumns: col2, gap: "12px", marginBottom: "12px" }}>

          <SectionCard
            title="Users"
            accent="#4f46e5"
            stats={
              <>
                <MiniStat label="Total" value={stats?.totalUsers} />
                <MiniStat label="Active" value={stats?.activeUsers} color="#10b981" />
                <MiniStat label="Banned" value={stats?.bannedUsers} color="#ef4444" />
                <MiniStat label="Premium" value={stats?.premiumUsers} color="#8b5cf6" />
              </>
            }
            chart={<Bar data={userGrowthData} options={miniBarOpts} />}
          >
            <div style={{
              display: "flex", gap: "16px", flexWrap: "wrap",
              marginTop: "12px", paddingTop: "10px",
              borderTop: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Scheduled deletion</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#14b8a6" }}>{stats?.scheduledForDeletion ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Free users</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                  {userAnalytics?.premiumVsFree?.freeUsers ?? "—"}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Transactions"
            accent="#10b981"
            stats={
              <>
                <MiniStat label="Total" value={txAnalytics?.totalTransactions} />
                <MiniStat label="Income" value={formatCurrency(txAnalytics?.totalIncome)} color="#10b981" />
                <MiniStat label="Expense" value={formatCurrency(txAnalytics?.totalExpense)} color="#ef4444" />
              </>
            }
            chart={<Doughnut data={incomeExpenseData} options={miniDoughnutOpts} />}
          >
            <div style={{
              display: "flex", gap: "16px", flexWrap: "wrap",
              marginTop: "12px", paddingTop: "10px",
              borderTop: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Income count</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#10b981" }}>{txAnalytics?.incomeCount ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Expense count</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#ef4444" }}>{txAnalytics?.expenseCount ?? "—"}</div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Row 2: Goals + Accounts ── */}
        <div style={{ display: "grid", gridTemplateColumns: col2, gap: "12px", marginBottom: "12px" }}>

          <SectionCard
            title="Goals"
            accent="#8b5cf6"
            stats={
              <>
                <MiniStat label="Total" value={goalAnalytics?.totalGoals} />
                <MiniStat label="Active" value={goalAnalytics?.activeGoals} color="#4f46e5" />
                <MiniStat label="Completed" value={goalAnalytics?.completedGoals} color="#10b981" />
                <MiniStat label="Overdue" value={goalAnalytics?.overdueGoals} color="#ef4444" />
              </>
            }
            chart={<Doughnut data={goalStatusData} options={miniDoughnutOpts} />}
          >
            <div style={{
              display: "flex", gap: "16px", flexWrap: "wrap",
              marginTop: "12px", paddingTop: "10px",
              borderTop: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg completion</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#8b5cf6" }}>
                  {goalAnalytics?.avgCompletionRate
                    ? `${Number(goalAnalytics.avgCompletionRate).toFixed(1)}%`
                    : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Target amount</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                  {formatCurrency(goalAnalytics?.totalTargetAmount)}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Accounts"
            accent="#3b82f6"
            stats={
              <>
                <MiniStat label="Total" value={accountAnalytics?.totalAccounts} />
                <MiniStat label="Total balance" value={formatCurrency(accountAnalytics?.totalBalance)} color="#3b82f6" />
                <MiniStat label="Avg balance" value={formatCurrency(accountAnalytics?.avgBalance)} />
              </>
            }
            chart={<Doughnut data={cashBankData} options={miniDoughnutOpts} />}
          >
            <div style={{
              display: "flex", gap: "16px", flexWrap: "wrap",
              marginTop: "12px", paddingTop: "10px",
              borderTop: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Cash</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#f59e0b" }}>
                  {formatCurrency(accountAnalytics?.cashBalance)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Bank</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#3b82f6" }}>
                  {formatCurrency(accountAnalytics?.bankBalance)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg / user</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
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
          title="Feedback"
          accent="#f59e0b"
          stats={
            <>
              <MiniStat label="Total" value={stats?.totalFeedbacks} />
              <MiniStat label="This month" value={feedbackAnalytics?.totalFeedbacksThisMonth} color="#f59e0b" />
              <MiniStat
                label="Avg rating"
                value={feedbackAnalytics?.avgRating
                  ? `${Number(feedbackAnalytics.avgRating).toFixed(1)} / 5`
                  : "—"}
                color="#f59e0b"
              />
            </>
          }
          chart={<Bar data={feedbackMonthData} options={miniBarOpts} />}
        >
          <div style={{
            display: "flex", gap: "12px", flexWrap: "wrap",
            marginTop: "12px", paddingTop: "10px",
            borderTop: "1px solid var(--border)",
          }}>
            {feedbackAnalytics?.feedbackByCategory?.map((d, i) => (
              <div key={d._id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "2px",
                  background: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i],
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
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