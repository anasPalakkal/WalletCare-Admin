import Layout from "../components/Layout";
import Topbar from "../components/Topbar";

const Settings = () => {
  return (
    <Layout>
      <Topbar title="Settings" subtitle="Manage your admin account" />
      <div className="main-content">
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "60vh", gap: "12px"
        }}>
          <svg width="48" height="48" viewBox="0 0 20 20" fill="var(--text-muted)">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
          </svg>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
            Settings
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Coming soon — admin profile and password settings
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;