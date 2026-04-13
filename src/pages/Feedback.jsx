import Layout from "../components/Layout";
import Topbar from "../components/Topbar";

const Feedback = () => {
  return (
    <Layout>
      <Topbar title="Feedback" subtitle="Manage user feedback" />
      <div className="main-content">
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "60vh", gap: "12px"
        }}>
          <svg width="48" height="48" viewBox="0 0 20 20" fill="var(--text-muted)">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
          </svg>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
            Feedback
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Coming soon —  working on this page
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Feedback;