import Layout from "../components/Layout";
import Topbar from "../components/Topbar";

const Analytics = () => {
  return (
    <Layout>
      <Topbar title="Analytics" subtitle="System wide analytics" />
      <div className="main-content">
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "60vh", gap: "12px"
        }}>
          <svg width="48" height="48" viewBox="0 0 20 20" fill="var(--text-muted)">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
          </svg>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
            Analytics
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Coming soon — system wide analytics will appear here
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;