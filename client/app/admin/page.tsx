"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type ManagedUser = { id: string; name: string; email: string; role: "student" | "mentor" | "administrator"; status: "active" | "suspended"; createdAt: string };
const roles = ["student", "mentor", "administrator"] as const;
const responseMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") return data.message;
    }
  }
  return fallback;
};

export default function AdminPage() {
  const { isAllowed } = useRoleGuard(["administrator"]);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try { const { data } = await axiosInstance.get("/api/rbac/users"); setUsers(data.users || []); }
    catch (requestError: unknown) { setError(responseMessage(requestError, "Unable to load users.")); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isAllowed) void loadUsers(); }, [isAllowed]);

  const updateRole = async (userId: string, role: ManagedUser["role"]) => {
    try {
      await axiosInstance.patch(`/api/rbac/users/${userId}/role`, { role });
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
    } catch (requestError: unknown) { setError(responseMessage(requestError, "Unable to update this role.")); }
  };

  const updateStatus = async (user: ManagedUser) => {
    const status = user.status === "active" ? "suspended" : "active";
    if (status === "suspended" && !window.confirm(`Suspend ${user.name}'s account? They will be signed out immediately.`)) return;
    try {
      await axiosInstance.patch(`/api/rbac/users/${user.id}/status`, { status });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status } : item));
    } catch (requestError: unknown) { setError(responseMessage(requestError, "Unable to update this account status.")); }
  };

  const deleteUser = async (user: ManagedUser) => {
    if (!window.confirm(`Permanently delete ${user.name}'s account and all associated data? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/api/rbac/users/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (requestError: unknown) { setError(responseMessage(requestError, "Unable to delete this account.")); }
  };

  if (!isAllowed) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Administration</p><h1 className="mt-2 text-4xl font-black text-slate-950">Platform access</h1><p className="mt-3 text-slate-600">Manage account roles. Role changes are validated and enforced by the server.</p></header>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => { const isCurrentUser = user.id === currentUser?.id; return <tr key={user.id}><td className="px-5 py-4"><p className="font-semibold text-slate-950">{user.name}{isCurrentUser ? " (you)" : ""}</p><p className="text-slate-500">{user.email}</p></td><td className="px-5 py-4 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><select disabled={isCurrentUser} value={user.role} onChange={(event) => void updateRole(user.id, event.target.value as ManagedUser["role"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"><option value={roles[0]}>Student</option><option value={roles[1]}>Mentor</option><option value={roles[2]}>Administrator</option></select></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button disabled={isCurrentUser} type="button" onClick={() => void updateStatus(user)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{user.status === "active" ? "Suspend" : "Reactivate"}</button><button disabled={isCurrentUser} type="button" onClick={() => void deleteUser(user)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Delete</button></div></td></tr>; })}</tbody></table>
      </section>
    </main>
  );
}