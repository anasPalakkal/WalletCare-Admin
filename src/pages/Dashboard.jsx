import { useEffect, useState } from "react";
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

const StatCard = ({ label, value, color }) => (
  <div className="card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{
      fontSize: "11px", color: "var(--text-muted)",
      marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px"
    }}>
      {label}
    </div>
    <div style={{ fontSize: "26px", fontWeight: "700", color: "var(--text)" }}>
      {value ?? "—"}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, userRes, feedbackRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/analytics/users"),
          api.get("/admin/analytics/feedback"),
        ]);

        setStats(statsRes.data.data);
        setUserAnalytics(userRes.data.data);
        setFeedbackAnalytics(feedbackRes.data.data);
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error("Dashboard error:", err);
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
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: { legend: { display: false } },
  };

  if (loading) return (
    <Layout>
      <Topbar title="Dashboard" subtitle="Overview of all system metrics" />
      <div className="main-content">
        <div className="loading">Loading dashboard...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <Topbar title="Dashboard" subtitle="Overview of all system metrics" />
      <div className="main-content">
        <div style={{ color: "var(--danger)", padding: "20px" }}>{error}</div>
      </div>
    </Layout>
  );

  const userGrowthData = {
    labels: userAnalytics?.userGrowth?.map((d) => d._id) || [],
    datasets: [{
      data: userAnalytics?.userGrowth?.map((d) => d.count) || [],
      backgroundColor: "#4f46e5",
      borderRadius: 5,
      barPercentage: 0.6,
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
      backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      borderWidth: 0,
    }],
  };

  const feedbackMonthData = {
    labels: feedbackAnalytics?.feedbackPerMonth?.map((d) => d._id) || [],
    datasets: [{
      data: feedbackAnalytics?.feedbackPerMonth?.map((d) => d.count) || [],
      backgroundColor: "#10b981",
      borderRadius: 5,
      barPercentage: 0.6,
    }],
  };

  return (
    <Layout>
      <Topbar title="Dashboard" subtitle="Overview of all system metrics" />
      <div className="main-content">

        {/* Stat Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}>
          <StatCard label="Total Users" value={stats?.totalUsers} color="#4f46e5" />
          <StatCard label="Active Users" value={stats?.activeUsers} color="#10b981" />
          <StatCard label="Banned Users" value={stats?.bannedUsers} color="#ef4444" />
          <StatCard label="Premium Users" value={stats?.premiumUsers} color="#8b5cf6" />
          <StatCard label="Total Feedbacks" value={stats?.totalFeedbacks} color="#f59e0b" />
          <StatCard label="Scheduled Deletion" value={stats?.scheduledForDeletion} color="#14b8a6" />
        </div>

        {/* Charts Row 1 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
          marginBottom: "14px",
        }}>
          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
              User Growth
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>
              Monthly registrations — last 6 months
            </div>
            <div style={{ position: "relative", height: "180px" }}>
              <Bar data={userGrowthData} options={chartOptions} />
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
              Premium vs Free
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>
              Current user distribution
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ position: "relative", height: "150px", width: "150px", flexShrink: 0 }}>
                <Doughnut data={premiumData} options={doughnutOptions} />
              </div>
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                    {userAnalytics?.premiumVsFree?.premiumUsers || 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Premium users</div>
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                    {userAnalytics?.premiumVsFree?.freeUsers || 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Free users</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#8b5cf6" }}></div>
                    Premium
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#e5e7eb" }}></div>
                    Free
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 — Feedback */}
        <div className="card">
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
            Feedback Analytics
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Submissions by category and monthly trend
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>By category</div>
              <div style={{ position: "relative", height: "180px" }}>
                <Doughnut data={feedbackCategoryData} options={doughnutOptions} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                {feedbackAnalytics?.feedbackByCategory?.map((d, i) => (
                  <div key={d._id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i] }}></div>
                    {d._id} ({d.count})
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Per month</div>
              <div style={{ position: "relative", height: "180px" }}>
                <Bar data={feedbackMonthData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", gap: "20px", flexWrap: "wrap",
            marginTop: "16px", paddingTop: "14px",
            borderTop: "1px solid var(--border)",
          }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>This month</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                {feedbackAnalytics?.totalFeedbacksThisMonth || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Avg rating</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                {feedbackAnalytics?.avgRating
                  ? `${Number(feedbackAnalytics.avgRating).toFixed(1)} / 5`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;