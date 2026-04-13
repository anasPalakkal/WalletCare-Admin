import Sidebar from "./Sidebar";
import useWindowSize from "../hooks/useWindowSize";
import { LayoutProvider, useLayout } from "../context/LayoutContext";

const LayoutInner = ({ children }) => {
  const { isMobile } = useWindowSize();
  const { sidebarOpen, closeSidebar } = useLayout();

  return (
    <div className="layout">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={closeSidebar} />

      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 40,
          }}
        />
      )}

      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

const Layout = ({ children }) => (
  <LayoutProvider>
    <LayoutInner>{children}</LayoutInner>
  </LayoutProvider>
);

export default Layout;