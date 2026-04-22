import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";

const POLL_INTERVAL = 60000;

const ManageAdmins = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  // Redirect if not superadmin
  useEffect(() => {
    if (admin && admin.role !== "superadmin") {
      navigate("/dashboard");
    }
  }, [admin, navigate]);

  const fetchAdmins = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res = await api.get("/admin/admins");
      setAdmins(res.data.data);
      setError("");
    } catch (err) {
      setError("Failed to load admins.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => {
    if (admin?.role === "superadmin") {
      fetchAdmins();
      const interval = setInterval(fetchAdmins, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchAdmins, admin]);

  useEffect(() => {
    registerRefresh(fetchAdmins);
  }, [registerRefresh, fetchAdmins]);

  const handleDemote = async (adminId) => {
    setActionLoading(adminId + "demote");
    try {
      await api.patch(`/admin/demote/${adminId}`);
      await fetchAdmins();
      setConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to demote admin.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (adminId) => {
    setActionLoading(adminId + "delete");
    try {
      await api.delete(`/admin/delete-admin/${adminId}`);
      await fetchAdmins();
      setConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete admin.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const getInitials = (name) =>
    name
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : "A";

  if (!admin || admin.role !== "superadmin") {
    return null;
  }

  if (loading)
    return (
      <Layout>
        <Topbar title="Manage Admins" subtitle="View and manage administrators" />
        <div className="main-content">
          <div className="loading">Loading admins...</div>
        </div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <Topbar
          title="Manage Admins"
          subtitle="View and manage administrators"
          onRefresh={fetchAdmins}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
        />
        <div className="main-content">
          <div style={{ color: "var(--danger)" }}>{error}</div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <Topbar title="Manage Admins" subtitle="View and manage administrators" />
      <div className="main-content">
        {/* Header with Create Admin Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text)", margin: 0 }}>
              Administrators
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Total: {admins.length} admin{admins.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/create")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Admin
          </button>
        </div>

        {/* Admins Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Email Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((adminUser) => {
                    const isSuperadmin = adminUser.role === "superadmin";
                    const isSelf = adminUser._id === admin.id;

                    return (
                      <tr key={adminUser._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: isSuperadmin ? "#7c3aed" : "#2563eb",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: "600",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(adminUser.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: "500", fontSize: "13px", color: "var(--text)" }}>
                                {adminUser.name}
                                {isSelf && (
                                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "6px" }}>
                                    (You)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{adminUser.email}</td>
                        <td>
                          {isSuperadmin ? (
                            <span className="badge" style={{ background: "#7c3aed", color: "white", fontWeight: "600" }}>
                              Superadmin
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "#2563eb", color: "white", fontWeight: "600" }}>
                              Admin
                            </span>
                          )}
                        </td>
                        <td>
                          {adminUser.isEmailVerified ? (
                            <span className="badge badge-success">Verified</span>
                          ) : (
                            <span className="badge badge-warning">Not Verified</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                          {formatDate(adminUser.createdAt)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {/* Demote Button */}
                            {!isSuperadmin && !isSelf && (
                              <button
                                className="btn btn-warning"
                                style={{ fontSize: "11px", padding: "4px 10px" }}
                                disabled={actionLoading === adminUser._id + "demote"}
                                onClick={() =>
                                  setConfirm({
                                    action: "demote",
                                    admin: adminUser,
                                  })
                                }
                              >
                                {actionLoading === adminUser._id + "demote" ? "..." : "Demote"}
                              </button>
                            )}

                            {/* Delete Button */}
                            {!isSuperadmin && !isSelf && (
                              <button
                                className="btn btn-danger"
                                style={{ fontSize: "11px", padding: "4px 10px" }}
                                disabled={actionLoading === adminUser._id + "delete"}
                                onClick={() =>
                                  setConfirm({
                                    action: "delete",
                                    admin: adminUser,
                                  })
                                }
                              >
                                {actionLoading === adminUser._id + "delete" ? "..." : "Delete"}
                              </button>
                            )}

                            {/* Protection Messages */}
                            {isSuperadmin && !isSelf && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                                Protected
                              </span>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                                Cannot modify yourself
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "400px", margin: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Confirm {confirm.action === "demote" ? "Demotion" : "Deletion"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              {confirm.action === "demote" ? (
                <>
                  Are you sure you want to <strong>demote</strong>{" "}
                  <strong>{confirm.admin.name}</strong> to a regular user?
                  <br />
                  <br />
                  They will lose admin panel access but keep their account and wallet.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>permanently delete</strong>{" "}
                  <strong>{confirm.admin.name}</strong>?
                  <br />
                  <br />
                  This will delete their account, wallet, goals, and all transactions. This action cannot be undone.
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={confirm.action === "delete" ? "btn btn-danger" : "btn btn-warning"}
                onClick={() => {
                  if (confirm.action === "demote") {
                    handleDemote(confirm.admin._id);
                  } else {
                    handleDelete(confirm.admin._id);
                  }
                }}
              >
                Yes, {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManageAdmins;