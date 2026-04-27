import { useEffect } from "react";
import api from "../api/axios";

const HEARTBEAT_INTERVAL = 30000; // ping every 30s → online window is 60s

const useHeartbeat = () => {
  useEffect(() => {
    const ping = () => api.patch("/admin/heartbeat").catch(() => {});
    ping(); // ping immediately on mount
    const i = setInterval(ping, HEARTBEAT_INTERVAL);
    return () => clearInterval(i);
  }, []);
};

export default useHeartbeat;