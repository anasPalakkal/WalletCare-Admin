import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";

const POLL_INTERVAL = 60000;

const ManageAdmins = () => {
  const { admin } = useAuth();
  const navigate  = useNavigate();
  const [admins, setAdmins]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm]             = useState(null);
  const { registerRefresh, handleRefreshStart, handleRefreshEnd, lastUpdatedRef } = useRefresh();

  useEffect(() => {
    if (admin && admin.role !== "superadmin") navigate("/dashboard");
  }, [admin, navigate]);

  const fetchAdmins = useCallback(async () => {
    handleRefreshStart();
    try {
      if (!lastUpdatedRef.current) setLoading(true);
      const res = await api.get("/admin/admins");
      setAdmins(res.data.data);
      setError("");
    } catch {
      setError("Failed to load admins.");
    } finally {
      handleRefreshEnd();
      setLoading(false);
    }
  }, [handleRefreshStart, handleRefreshEnd, lastUpdatedRef]);

  useEffect(() => {
    if (admin?.role === "superadmin") {
      fetchAdmins();
      const i = setInterval(fetchAdmins, POLL_INTERVAL);
      return () => clearInterval(i);
    }
  }, [fetchAdmins, admin]);

  useEffect(() => { registerRefresh(fetchAdmins); }, [registerRefresh, fetchAdmins]);

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
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "A";

  if (!admin || admin.role !== "superadmin") return null;

  if (loading) return <Layout><Topbar title="Manage Admins" subtitle="View and manage administrators" /><div className="main-content"><div className="loading">Loading admins...</div></div></Layout>;
  if (error)   return <Layout><Topbar title="Manage Admins" subtitle="View and manage administrators" /><div className="main-content"><div className="text-[var(--danger)]">{error}</div></div></Layout>;

 return (
    <Layout>
      <Topbar title="Manage Admins" subtitle="View and manage administrators" />
      <div className="main-content">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)] m-0">Administrators</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-0">
              Total: {admins.length} admin{admins.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button className="btn btn-primary flex items-center gap-[6px]" onClick={() => navigate("/admin/create")}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Admin
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th><th>Email</th><th>Role</th><th>Email Verified</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-[var(--text-muted)] p-[30px]">No admins found</td></tr>
                ) : (
                  admins.map((adminUser) => {
                    const isSuperadmin = adminUser.role === "superadmin";
                    const isSelf       = adminUser._id === admin.id;
                    return (
                      <tr key={adminUser._id}>
                        <td>
                          <div className="flex items-center gap-[10px]">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                              style={{ background: isSuperadmin ? "#7c3aed" : "#16a34a" }}
                            >
                              {getInitials(adminUser.name)}
                            </div>
                            <div>
                              <div className="font-medium text-[13px] text-[var(--text)]">
                                {adminUser.name}
                                {isSelf && <span className="text-[10px] text-[var(--text-muted)] ml-[6px]">(You)</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-[var(--text-muted)] text-xs">{adminUser.email}</td>
                        <td>
                          {isSuperadmin
                            ? <span className="badge font-semibold text-white" style={{ background: "#7c3aed" }}>Superadmin</span>
                            : <span className="badge font-semibold text-white" style={{ background: "#16a34a" }}>Admin</span>}
                        </td>
                        <td>
                          {adminUser.isEmailVerified
                            ? <span className="badge badge-success">Verified</span>
                            : <span className="badge badge-warning">Not Verified</span>}
                        </td>
                        <td className="text-[var(--text-muted)] text-xs">{formatDate(adminUser.createdAt)}</td>
                        <td>
                          <div className="flex gap-[6px] flex-wrap">
                            {!isSuperadmin && !isSelf && (
                              <>
                                <button
                                  className="btn btn-warning"
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                  disabled={actionLoading === adminUser._id + "demote"}
                                  onClick={() => setConfirm({ action: "demote", admin: adminUser })}
                                >
                                  {actionLoading === adminUser._id + "demote" ? "..." : "Demote"}
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                  disabled={actionLoading === adminUser._id + "delete"}
                                  onClick={() => setConfirm({ action: "delete", admin: adminUser })}
                                >
                                  {actionLoading === adminUser._id + "delete" ? "..." : "Delete"}
                                </button>
                              </>
                            )}
                            {isSuperadmin && !isSelf && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Protected</span>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Cannot modify yourself</span>
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

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100]">
          <div className="card w-full max-w-[400px] mx-4">
            <div className="text-[15px] font-semibold text-[var(--text)] mb-2">
              Confirm {confirm.action === "demote" ? "Demotion" : "Deletion"}
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">
              {confirm.action === "demote" ? (
                <>Are you sure you want to <strong>demote</strong> <strong>{confirm.admin.name}</strong> to a regular user?<br /><br />They will lose admin panel access but keep their account and wallet.</>
              ) : (
                <>Are you sure you want to <strong>permanently delete</strong> <strong>{confirm.admin.name}</strong>?<br /><br />This will delete their account, wallet, goals, and all transactions. This action cannot be undone.</>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className={confirm.action === "delete" ? "btn btn-danger" : "btn btn-warning"}
                onClick={() => confirm.action === "demote" ? handleDemote(confirm.admin._id) : handleDelete(confirm.admin._id)}
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