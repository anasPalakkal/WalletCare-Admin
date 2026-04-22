import { useEffect, useState, useCallback, useRef } from "react";
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

const formatCurrency = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const SummaryCard = ({ label, value, sub, color, onClick }) => (
  <div 
    className="card" 
    style={{ 
      borderTop: `3px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease'
    }}
    onClick={onClick}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
  >
    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {label}
    </div>
    <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)" }}>
      {value ?? "—"}
    </div>
    {sub && (
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
        {sub}
      </div>
    )}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: "14px", marginTop: "6px" }}>
    <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>{title}</div>
    {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</div>}
  </div>
);

const POLL_INTERVAL = 60000;

const Analytics = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useWindowSize();
  const [stats, setStats] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [txAnalytics, setTxAnalytics] = useState(null);
  const [goalAnalytics, setGoalAnalytics] = useState(null);
  const [accountAnalytics, setAccountAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // ✅ ADD THIS:
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
    } catch (err) {
      setError("Failed to load analytics.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    registerRefresh(fetchAll);
  }, [registerRefresh, fetchAll]);

  // Enhanced chart options with hover effects
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#6b7280", font: { size: 11 } },
        grid: { color: "rgba(107,114,128,0.1)" },
        border: { display: false },
      },
      y: {
        ticks: { color: "#6b7280", font: { size: 11 } },
        grid: { color: "rgba(107,114,128,0.1)" },
        border: { display: false },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          }
        }
      }
    },
    interaction: {
      mode: 'point',
      intersect: true,
    },
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    },
    elements: {
      arc: {
        hoverOffset: 8,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      }
    }
  };

  if (loading) return (
    <Layout>
      <Topbar title="Analytics" subtitle="Detailed system analytics" />
      <div className="main-content">
        <div className="loading">Loading analytics...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar
        title="Analytics"
        subtitle="Detailed system analytics"
      />
      <div className="main-content">
        <div style={{ color: "var(--danger)" }}>{error}</div>
      </div>
    </Layout>
  );

  const premiumPercent = stats?.totalUsers
    ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0;

  const col4 = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)";
  const col3 = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)";
  const colWide = isMobile ? "1fr" : "2fr 1fr";
  const colWideRev = isMobile ? "1fr" : "1fr 2fr";

  const userGrowthColors = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];
  const feedbackCategoryColors = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const categoryColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  // Enhanced chart data with hover configurations
  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Users",
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      backgroundColor: userGrowthColors[0],
      hoverBackgroundColor: userGrowthColors[1],
      borderRadius: 6,
      barPercentage: 0.7,
    }],
  };

  const premiumVsFreeData = {
    labels: ["Premium", "Free"],
    datasets: [{
      data: [
        userAnalytics?.premiumVsFree?.premiumUsers || 0,
        userAnalytics?.premiumVsFree?.freeUsers || 0,
      ],
      backgroundColor: ["#8b5cf6", "#6b7280"],
      hoverBackgroundColor: ["#9333ea", "#4b5563"],
      borderWidth: 0,
    }],
  };

  const userStatusData = {
    labels: ["Active", "Banned", "Scheduled for deletion"],
    datasets: [{
      data: [stats?.activeUsers || 0, stats?.bannedUsers || 0, stats?.scheduledForDeletion || 0],
      backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
      hoverBackgroundColor: ["#059669", "#dc2626", "#d97706"],
      borderWidth: 0,
    }],
  };

  const feedbackByCategoryData = {
    labels: feedbackAnalytics?.feedbackByCategory?.map((d) => d._id) || [],
    datasets: [{
      label: "Feedback Count",
      data: feedbackAnalytics?.feedbackByCategory?.map((d) => d.count) || [],
      backgroundColor: feedbackCategoryColors,
      hoverBackgroundColor: feedbackCategoryColors.map(c => c + 'dd'),
      borderRadius: 6,
      barPercentage: 0.7,
    }],
  };

  const monthlyVolumeData = {
    labels: txAnalytics?.monthlyVolume?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "Transactions",
      data: txAnalytics?.monthlyVolume?.map((d) => d.count) || [],
      backgroundColor: "#10b981",
      hoverBackgroundColor: "#059669",
      borderRadius: 6,
      barPercentage: 0.7,
    }],
  };

  const topCategoriesData = {
    labels: txAnalytics?.topCategories?.slice(0, 4).map((d) => d._id) || [],
    datasets: [{
      data: txAnalytics?.topCategories?.slice(0, 4).map((d) => d.total) || [],
      backgroundColor: categoryColors,
      hoverBackgroundColor: categoryColors.map(c => c + 'dd'),
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
      backgroundColor: ["#10b981", "#4f46e5", "#ef4444"],
      hoverBackgroundColor: ["#059669", "#4338ca", "#dc2626"],
      borderWidth: 0,
    }],
  };

  const goalCategoryData = {
    labels: goalAnalytics?.goalsByCategory?.map((d) => d._id) || [],
    datasets: [{
      label: "Goals",
      data: goalAnalytics?.goalsByCategory?.map((d) => d.count) || [],
      backgroundColor: "#8b5cf6",
      hoverBackgroundColor: "#7c3aed",
      borderRadius: 6,
      barPercentage: 0.7,
    }],
  };

  const accountTypeData = {
    labels: ["Cash", "Bank"],
    datasets: [{
      data: [accountAnalytics?.cashAccounts || 0, accountAnalytics?.bankAccounts || 0],
      backgroundColor: ["#f59e0b", "#4f46e5"],
      hoverBackgroundColor: ["#d97706", "#4338ca"],
      borderWidth: 0,
    }],
  };

  return (
    <Layout>
      <Topbar title="Analytics" subtitle="Deep dive into system metrics" />
      <div className="main-content">

        {/* ── Section 1: Users ── */}
        <SectionTitle title="Users" sub="User growth, demographics and status breakdown" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Users" value={stats?.totalUsers} sub="All time" color="#4f46e5" onClick={() => navigate('/users')} />
          <SummaryCard label="Active Users" value={stats?.activeUsers} sub="Currently active" color="#10b981" onClick={() => navigate('/users?filter=active')} />
          <SummaryCard label="Premium Users" value={stats?.premiumUsers} sub={`${premiumPercent}% of total`} color="#8b5cf6" onClick={() => navigate('/users?filter=premium')} />
          <SummaryCard label="Banned Users" value={stats?.bannedUsers} sub="Suspended accounts" color="#ef4444" onClick={() => navigate('/users?filter=banned')} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: colWide, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>User Growth</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>New registrations per month</div>
            <div style={{ position: "relative", height: "200px" }}>
              <Bar data={userGrowthData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Premium vs Free</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>User subscription status</div>
            <div style={{ position: "relative", height: "150px" }}>
              <Doughnut data={premiumVsFreeData} options={doughnutOptions} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Premium</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#8b5cf6" }}>
                  {userAnalytics?.premiumVsFree?.premiumUsers || 0}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Free</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#6b7280" }}>
                  {userAnalytics?.premiumVsFree?.freeUsers || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>User Status Distribution</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Active, banned and scheduled for deletion</div>
          <div style={{ position: "relative", height: "200px", maxWidth: "400px", margin: "0 auto" }}>
            <Doughnut data={userStatusData} options={doughnutOptions} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Active</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#10b981" }}>{stats?.activeUsers || 0}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Banned</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#ef4444" }}>{stats?.bannedUsers || 0}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Scheduled</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#f59e0b" }}>{stats?.scheduledForDeletion || 0}</div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Feedback & Rating ── */}
        <SectionTitle title="Feedback & Rating" sub="User feedback volume, categories and satisfaction ratings" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Feedback" value={stats?.totalFeedbacks} sub="All time" color="#f59e0b" onClick={() => navigate('/feedback')} />
          <SummaryCard label="This Month" value={feedbackAnalytics?.totalFeedbacksThisMonth} sub="Current month" color="#10b981" onClick={() => navigate('/feedback')} />
          <SummaryCard
            label="Feedback Rating"
            value={feedbackAnalytics?.avgRating ? `${feedbackAnalytics.avgRating.toFixed(1)} / 5` : "—"}
            sub="Feedback satisfaction"
            color="#8b5cf6"
          />
          <SummaryCard
            label="User Rating"
            value={stats?.avgUserRating ? `${stats.avgUserRating.toFixed(1)} / 5` : "—"}
            sub="User given ratings"
            color="#14b8a6"
          />
        </div>

        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Feedback by Category</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Distribution across different categories</div>
          <div style={{ position: "relative", height: "220px" }}>
            <Bar data={feedbackByCategoryData} options={chartOptions} />
          </div>
        </div>

        {/* ── Section 3: Transactions ── */}
        <SectionTitle title="Transactions" sub="Transaction volume, income/expense breakdown and top categories" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Transactions" value={txAnalytics?.totalTransactions} sub="All time" color="#10b981" />
          <SummaryCard label="Total Income" value={formatCurrency(txAnalytics?.totalIncome)} sub={`${txAnalytics?.incomeCount || 0} transactions`} color="#10b981" />
          <SummaryCard label="Total Expense" value={formatCurrency(txAnalytics?.totalExpense)} sub={`${txAnalytics?.expenseCount || 0} transactions`} color="#ef4444" />
          <SummaryCard
            label="Net Balance"
            value={formatCurrency(Math.abs((txAnalytics?.totalIncome || 0) - (txAnalytics?.totalExpense || 0)))}
            sub={(txAnalytics?.totalIncome || 0) >= (txAnalytics?.totalExpense || 0) ? "Net positive" : "Net negative"}
            color="#14b8a6"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: colWide, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Monthly Volume</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Transaction count per month</div>
            <div style={{ position: "relative", height: "200px" }}>
              <Bar data={monthlyVolumeData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Top Spending Categories</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>By total amount spent</div>
            <div style={{ position: "relative", height: "150px" }}>
              <Doughnut data={topCategoriesData} options={doughnutOptions} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
              {txAnalytics?.topCategories?.slice(0, 4).map((d, i) => (
                <div key={d._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: categoryColors[i] }} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{d._id}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>
                    {formatCurrency(d.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Goals ── */}
        <SectionTitle title="Goals" sub="User goal creation, completion and category breakdown" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Goals" value={goalAnalytics?.totalGoals} sub="All time" color="#8b5cf6" />
          <SummaryCard label="Active Goals" value={goalAnalytics?.activeGoals} sub="In progress" color="#4f46e5" />
          <SummaryCard label="Completed Goals" value={goalAnalytics?.completedGoals} sub="Achieved" color="#10b981" />
          <SummaryCard label="Avg Completion" value={`${goalAnalytics?.avgCompletionRate || 0}%`} sub="Across all goals" color="#f59e0b" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: colWideRev, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Goal Status</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Active vs completed vs overdue</div>
            <div style={{ position: "relative", height: "150px" }}>
              <Doughnut data={goalStatusData} options={doughnutOptions} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {[
                { label: "Active", value: goalAnalytics?.activeGoals, color: "#10b981" },
                { label: "Completed", value: goalAnalytics?.completedGoals, color: "#4f46e5" },
                { label: "Overdue", value: goalAnalytics?.overdueGoals, color: "#ef4444" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Total target amount</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
                {formatCurrency(goalAnalytics?.totalTargetAmount || 0)}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "4px" }}>Saved so far</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--success)" }}>
                {formatCurrency(goalAnalytics?.totalCurrentAmount || 0)}
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Goals by Category</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Number of goals per category</div>
            <div style={{ position: "relative", height: "200px" }}>
              <Bar data={goalCategoryData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* ── Section 5: Accounts ── */}
        <SectionTitle title="Accounts" sub="Account types, balances and status overview" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Accounts" value={accountAnalytics?.totalAccounts} sub={`Avg ${accountAnalytics?.avgAccountsPerUser} per user`} color="#4f46e5" />
          <SummaryCard label="Total Balance" value={formatCurrency(accountAnalytics?.totalBalance)} sub="Across all accounts" color="#10b981" />
          <SummaryCard label="Cash Accounts" value={accountAnalytics?.cashAccounts} sub={formatCurrency(accountAnalytics?.cashBalance)} color="#f59e0b" />
          <SummaryCard label="Bank Accounts" value={accountAnalytics?.bankAccounts} sub={formatCurrency(accountAnalytics?.bankBalance)} color="#8b5cf6" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: colWideRev, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Account Types</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Cash vs bank accounts</div>
            <div style={{ position: "relative", height: "150px" }}>
              <Doughnut data={accountTypeData} options={doughnutOptions} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {[
                { label: "Cash", value: accountAnalytics?.cashAccounts, balance: accountAnalytics?.cashBalance, color: "#f59e0b" },
                { label: "Bank", value: accountAnalytics?.bankAccounts, balance: accountAnalytics?.bankBalance, color: "#4f46e5" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>{item.value} accounts</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "6px" }}>
                      {formatCurrency(item.balance || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Account Status</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>Active, frozen and closed accounts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Active", value: accountAnalytics?.activeAccounts, bg: "var(--success-light)", textColor: "var(--success-text)" },
                { label: "Frozen", value: accountAnalytics?.frozenAccounts, bg: "var(--warning-light)", textColor: "var(--warning-text)" },
                { label: "Closed", value: accountAnalytics?.closedAccounts, bg: "var(--danger-light)", textColor: "var(--danger-text)" },
              ].map((item) => (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: "8px", background: item.bg,
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: item.textColor }}>{item.label}</span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: item.textColor }}>{item.value}</span>
                </div>
              ))}
              <div style={{ paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Avg balance per account</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                  {formatCurrency(accountAnalytics?.avgBalance || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Analytics;