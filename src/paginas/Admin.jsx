import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Save, Shield, Trash2, UserCog, X } from "lucide-react";
import { appClient } from "@/api/appClient";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
};

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const profilesByEmail = useMemo(() => {
    return profiles.reduce((map, profile) => {
      map[profile.user_email] = profile;
      return map;
    }, {});
  }, [profiles]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setError("");
    try {
      const currentUser = await appClient.auth.me();
      if (currentUser?.role !== "admin") {
        navigate("/Painel", { replace: true });
        return;
      }

      const [loadedUsers, loadedProfiles] = await Promise.all([
        appClient.admin.listUsers(),
        appClient.entities.UserProfile.filter({}),
      ]);
      setUsers(loadedUsers);
      setProfiles(loadedProfiles);
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar o painel admin.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
    });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveUser(user) {
    setSavingId(user.id);
    setMessage("");
    setError("");
    try {
      await appClient.admin.updateUser(user.id, {
        full_name: form.full_name,
        email: form.email,
        password: form.password || undefined,
      });
      setMessage("Usuario atualizado com sucesso.");
      cancelEdit();
      await loadAdminData();
    } catch (err) {
      setError(err.message || "Nao foi possivel salvar o usuario.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(user) {
    const ok = window.confirm(`Excluir ${user.email}? Esta acao remove a conta e os dados vinculados.`);
    if (!ok) return;

    setDeletingId(user.id);
    setMessage("");
    setError("");
    try {
      await appClient.admin.deleteUser(user.id);
      setMessage("Usuario excluido com sucesso.");
      await loadAdminData();
    } catch (err) {
      setError(err.message || "Nao foi possivel excluir o usuario.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Shield size={18} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Area administrativa
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Usuarios</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Gerencie contas cadastradas, dados de perfil e exclusoes.
          </p>
        </div>
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <span style={{ color: "var(--text-muted)" }}>Total:</span>{" "}
          <strong style={{ color: "var(--text-primary)" }}>{users.length}</strong>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead style={{ color: "var(--text-muted)", background: "var(--bg-surface)" }}>
              <tr>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingId === user.id;
                const profile = profilesByEmail[user.email];
                const isAdmin = user.role === "admin";
                return (
                  <tr key={user.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                    <td className="px-4 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={form.full_name}
                          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--bg-surface)", color: "var(--primary)" }}>
                            {isAdmin ? <Shield size={16} /> : <UserCog size={16} />}
                          </div>
                          <div>
                            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{user.full_name || "Sem nome"}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.auth_provider || "email"}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                          />
                          <input
                            type="password"
                            value={form.password}
                            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                            placeholder="Nova senha opcional"
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>{user.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: "var(--text-secondary)" }}>
                      {profile ? (
                        <div>
                          <p>{profile.nickname || profile.main_goal || "Perfil preenchido"}</p>
                          <p className="mt-1 text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                            {profile.main_goal?.replace(/_/g, " ") || "Sem objetivo"}
                          </p>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Sem perfil</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: isAdmin ? "rgba(0,212,170,0.12)" : "var(--bg-surface)",
                          color: isAdmin ? "var(--primary)" : "var(--text-secondary)",
                        }}
                      >
                        {isAdmin ? "Admin" : "Usuario"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveUser(user)}
                              disabled={savingId === user.id}
                              className="flex h-9 w-9 items-center justify-center rounded-xl"
                              style={{ background: "var(--primary)", color: "#000" }}
                              title="Salvar"
                            >
                              {savingId === user.id ? <LoadingSpinner size={14} color="#000" /> : <Save size={15} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex h-9 w-9 items-center justify-center rounded-xl"
                              style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
                              title="Cancelar"
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(user)}
                              disabled={isAdmin}
                              className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
                              style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
                              title={isAdmin ? "Admin principal protegido" : "Editar"}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={isAdmin || deletingId === user.id}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border disabled:opacity-40"
                              style={{ borderColor: "rgba(239,68,68,0.35)", color: "#EF4444" }}
                              title={isAdmin ? "Admin principal protegido" : "Excluir"}
                            >
                              {deletingId === user.id ? <LoadingSpinner size={14} color="#EF4444" /> : <Trash2 size={15} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
