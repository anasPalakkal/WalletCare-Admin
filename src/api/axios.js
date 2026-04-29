import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Clean instance for refresh call only — no interceptors, no loop risk
const refreshAxios = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Refresh token lock mechanism
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor — attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors, and don't retry if already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      window.location.pathname !== "/login"
    ) {
      const refreshToken = localStorage.getItem("adminRefreshToken");

      // No refresh token available — redirect to login
      if (!refreshToken) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminRefreshToken");
        localStorage.removeItem("adminData");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Mark as retrying and set refresh lock
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use clean axios instance — bypasses interceptors entirely
        const res = await refreshAxios.post("/auth/refresh", { refreshToken });

        const { accessToken, refreshToken: newRefreshToken } = res.data;

        // Save new tokens
        localStorage.setItem("adminToken", accessToken);
        localStorage.setItem("adminRefreshToken", newRefreshToken);

        // Update default headers for future requests
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        // Update current request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests with new token
        processQueue(null, accessToken);

        // Retry the original request with new token
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed — clear everything and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminRefreshToken");
        localStorage.removeItem("adminData");
        window.location.href = "/login";
        return Promise.reject(refreshError);

      } finally {
        // Always reset refresh lock
        isRefreshing = false;
      }
    }

    // Not a 401 or already retried — reject as-is
    return Promise.reject(error);
  }
);

export default api;