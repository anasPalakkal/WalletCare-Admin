import Layout from "../components/Layout";
import Topbar from "../components/Topbar";

const Notifications = () => {
  return (
    <Layout>
      <Topbar title="Notifications" subtitle="Send and manage notifications" />
      <div className="main-content">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <svg width="48" height="48" viewBox="0 0 20 20" fill="var(--text-muted)">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
          </svg>
          <div className="text-base font-semibold text-[var(--text)]">Notifications</div>
          <div className="text-[13px] text-[var(--text-muted)]">
            Coming soon — send and manage user notifications here
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;