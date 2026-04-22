import { createContext, useContext, useState, useRef, useCallback } from "react";

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const lastUpdatedRef = useRef(null);
  const refreshFunctionRef = useRef(null);

  // Register the page's refresh function
  const registerRefresh = useCallback((refreshFn) => {
    refreshFunctionRef.current = refreshFn;
  }, []);

  // Trigger refresh (called by Topbar button)
  const triggerRefresh = useCallback(async () => {
    if (refreshFunctionRef.current) {
      setRefreshing(true);
      try {
        await refreshFunctionRef.current();
        lastUpdatedRef.current = new Date();
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Refresh error:", error);
      } finally {
        setRefreshing(false);
      }
    }
  }, []);

  // Helper for pages to use
  const handleRefreshStart = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handleRefreshEnd = useCallback(() => {
    setRefreshing(false);
    lastUpdatedRef.current = new Date();
    setLastUpdated(new Date());
  }, []);

  const value = {
    refreshing,
    lastUpdated,
    lastUpdatedRef,
    registerRefresh,
    triggerRefresh,
    handleRefreshStart,
    handleRefreshEnd,
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within RefreshProvider");
  }
  return context;
};