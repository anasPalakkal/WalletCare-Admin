import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import useWindowSize from "../hooks/useWindowSize";
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
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const SummaryCard = ({ label, value, sub, color }) => (
  <div className="card" style={{ borderTop: `3px solid ${color}` }}>
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

const Analytics = () => {
  const { isMobile, isTablet } = useWindowSize();
  const [stats, setStats] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [txAnalytics, setTxAnalytics] = useState(null);
  const [goalAnalytics, setGoalAnalytics] = useState(null);
  const [accountAnalytics, setAccountAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
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
      } catch (err) {
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: { legend: { display: false } },
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
      <Topbar title="Analytics" subtitle="Detailed system analytics" />
      <div className="main-content">
        <div style={{ color: "var(--danger)" }}>{error}</div>
      </div>
    </Layout>
  );

  const premiumPercent = stats?.totalUsers
    ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0;

  const activePercent = stats?.totalUsers
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

  const categoryColors = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];
  const goalColors     = ["#10b981","#4f46e5","#ef4444"];

  const col4 = isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))";
  const col2 = isMobile ? "1fr" : "1fr 1fr";
  const colWide = isMobile ? "1fr" : "1.5fr 1fr";
  const colWideRev = isMobile ? "1fr" : "1fr 1.5fr";
  const colFeedback = isMobile ? "1fr" : "1fr 2fr";

  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "New Users",
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      backgroundColor: "#4f46e5", borderRadius: 5, barPercentage: 0.5,
    }],
  };

  const userStatusData = {
    labels: ["Active", "Banned", "Scheduled Deletion"],
    datasets: [{
      data: [stats?.activeUsers || 0, stats?.bannedUsers || 0, stats?.scheduledForDeletion || 0],
      backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
      borderWidth: 0,
    }],
  };

  const premiumData = {
    labels: ["Premium", "Free"],
    datasets: [{
      data: [
        userAnalytics?.premiumVsFree?.premiumUsers || 0,
        userAnalytics?.premiumVsFree?.freeUsers || 0,
      ],
      backgroundColor: ["#8b5cf6", "#e5e7eb"],
      borderWidth: 0,
    }],
  };

  const feedbackCategoryData = {
    labels: feedbackAnalytics?.feedbackByCategory?.map((d) => d._id) || [],
    datasets: [{
      data: feedbackAnalytics?.feedbackByCategory?.map((d) => d.count) || [],
      backgroundColor: categoryColors,
      borderWidth: 0,
    }],
  };

  const feedbackMonthData = {
    labels: feedbackAnalytics?.feedbackPerMonth?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "Feedbacks",
      data: feedbackAnalytics?.feedbackPerMonth?.map((d) => d.count) || [],
      backgroundColor: "#10b981", borderRadius: 5, barPercentage: 0.5,
    }],
  };

  const monthlyVolumeData = {
    labels: txAnalytics?.monthlyVolume?.map((d) => formatMonthLabel(d._id)) || [],
    datasets: [{
      label: "Transactions",
      data: txAnalytics?.monthlyVolume?.map((d) => d.count) || [],
      backgroundColor: "#4f46e5", borderRadius: 5, barPercentage: 0.5,
    }],
  };

  const topCategoriesData = {
    labels: txAnalytics?.topCategories?.map((d) => d._id) || [],
    datasets: [{
      data: txAnalytics?.topCategories?.map((d) => d.total) || [],
      backgroundColor: categoryColors,
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
      backgroundColor: goalColors,
      borderWidth: 0,
    }],
  };

  const goalCategoryData = {
    labels: goalAnalytics?.goalsByCategory?.map((d) => d._id) || [],
    datasets: [{
      label: "Goals",
      data: goalAnalytics?.goalsByCategory?.map((d) => d.count) || [],
      backgroundColor: "#8b5cf6", borderRadius: 5, barPercentage: 0.5,
    }],
  };

  const accountTypeData = {
    labels: ["Cash", "Bank"],
    datasets: [{
      data: [
        accountAnalytics?.cashAccounts || 0,
        accountAnalytics?.bankAccounts || 0,
      ],
      backgroundColor: ["#f59e0b", "#4f46e5"],
      borderWidth: 0,
    }],
  };

  return (
    <Layout>
      <Topbar title="Analytics" subtitle="Detailed system analytics" />
      <div className="main-content">

        {/* ── Section 1: User Overview ── */}
        <SectionTitle title="User Overview" sub="Registration, status and subscription breakdown" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Users"   value={stats?.totalUsers}   sub={`${activePercent}% active`}    color="#4f46e5" />
          <SummaryCard label="Active Users"  value={stats?.activeUsers}  sub={`${activePercent}% of total`}  color="#10b981" />
          <SummaryCard label="Banned Users"  value={stats?.bannedUsers}  sub="Currently blocked"             color="#ef4444" />
          <SummaryCard label="Premium Users" value={stats?.premiumUsers} sub={`${premiumPercent}% of total`} color="#8b5cf6" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: colWide, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>User Growth</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Monthly new registrations</div>
            <div style={{ position: "relative", height: "200px" }}>
              <Bar data={userGrowthData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>User Status</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Active vs banned vs scheduled</div>
            <div style={{ position: "relative", height: "140px" }}>
              <Doughnut data={userStatusData} options={doughnutOptions} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {[
                { label: "Active",    value: stats?.activeUsers,          color: "#10b981" },
                { label: "Banned",    value: stats?.bannedUsers,          color: "#ef4444" },
                { label: "Scheduled", value: stats?.scheduledForDeletion, color: "#f59e0b" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>
                    {item.value} ({stats?.totalUsers ? Math.round((item.value / stats.totalUsers) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Subscription ── */}
        <SectionTitle title="Subscription" sub="Premium vs free user distribution" />
        <div style={{ display: "grid", gridTemplateColumns: colFeedback, gap: "14px", marginBottom: "20px" }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Premium vs Free</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Current distribution</div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ position: "relative", height: "130px", width: "130px", flexShrink: 0 }}>
                <Doughnut data={premiumData} options={doughnutOptions} />
              </div>
              <div style={{ flex: 1 }}>
                {[
                  { label: "Premium", value: userAnalytics?.premiumVsFree?.premiumUsers || 0, color: "#8b5cf6" },
                  { label: "Free",    value: userAnalytics?.premiumVsFree?.freeUsers || 0,    color: "#e5e7eb" },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: item.color }} />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.label}</span>
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                      {item.value}
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
                        ({stats?.totalUsers ? Math.round((item.value / stats.totalUsers) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>Feedback Overview</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Monthly submissions and avg rating</div>
            <div style={{ display: "grid", gridTemplateColumns: col2, gap: "16px" }}>
              <div style={{ position: "relative", height: "160px" }}>
                <Bar data={feedbackMonthData} options={chartOptions} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>By category</div>
                <div style={{ position: "relative", height: "130px" }}>
                  <Doughnut data={feedbackCategoryData} options={doughnutOptions} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>This month</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>{feedbackAnalytics?.totalFeedbacksThisMonth || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Avg rating</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                    {feedbackAnalytics?.avgRating ? Number(feedbackAnalytics.avgRating).toFixed(1) : "—"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/ 5</span>
                </div>
                <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                  {[1,2,3,4,5].map((star) => (
                    <svg key={star} width="12" height="12" viewBox="0 0 20 20"
                      fill={star <= Math.round(feedbackAnalytics?.avgRating || 0) ? "#f59e0b" : "var(--border)"}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>{stats?.totalFeedbacks || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Transactions ── */}
        <SectionTitle title="Transactions" sub="System wide income, expense and volume trends" />
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: "12px", marginBottom: "14px" }}>
          <SummaryCard label="Total Transactions" value={txAnalytics?.totalTransactions}             sub="Completed"                                                                    color="#4f46e5" />
          <SummaryCard label="Total Income"        value={formatCurrency(txAnalytics?.totalIncome)}  sub={`${txAnalytics?.incomeCount} transactions`}                                   color="#10b981" />
          <SummaryCard label="Total Expense"       value={formatCurrency(txAnalytics?.totalExpense)} sub={`${txAnalytics?.expenseCount} transactions`}                                  color="#ef4444" />
          <SummaryCard label="Net Balance"
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
          <SummaryCard label="Total Goals"     value={goalAnalytics?.totalGoals}                    sub="All time"         color="#8b5cf6" />
          <SummaryCard label="Active Goals"    value={goalAnalytics?.activeGoals}                   sub="In progress"      color="#4f46e5" />
          <SummaryCard label="Completed Goals" value={goalAnalytics?.completedGoals}                sub="Achieved"         color="#10b981" />
          <SummaryCard label="Avg Completion"  value={`${goalAnalytics?.avgCompletionRate || 0}%`}  sub="Across all goals" color="#f59e0b" />
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
                { label: "Active",    value: goalAnalytics?.activeGoals,    color: "#10b981" },
                { label: "Completed", value: goalAnalytics?.completedGoals, color: "#4f46e5" },
                { label: "Overdue",   value: goalAnalytics?.overdueGoals,   color: "#ef4444" },
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
          <SummaryCard label="Total Accounts" value={accountAnalytics?.totalAccounts}                sub={`Avg ${accountAnalytics?.avgAccountsPerUser} per user`} color="#4f46e5" />
          <SummaryCard label="Total Balance"  value={formatCurrency(accountAnalytics?.totalBalance)} sub="Across all accounts"                                    color="#10b981" />
          <SummaryCard label="Cash Accounts"  value={accountAnalytics?.cashAccounts}                 sub={formatCurrency(accountAnalytics?.cashBalance)}          color="#f59e0b" />
          <SummaryCard label="Bank Accounts"  value={accountAnalytics?.bankAccounts}                 sub={formatCurrency(accountAnalytics?.bankBalance)}          color="#8b5cf6" />
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
                { label: "Closed", value: accountAnalytics?.closedAccounts, bg: "var(--danger-light)",  textColor: "var(--danger-text)"  },
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