import { useState, useEffect, useRef } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Save, LogOut, Trash2, User, Camera, Bell, ClipboardList, Dumbbell } from "lucide-react";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import ImageCropModal from "@/components/ui/media/ImageCropModal";
import { useAuth } from "@/lib/AuthContext";

const COLORS = [
  { label: "Teal", value: "#00D4AA" },
  { label: "Azul", value: "#3B82F6" },
  { label: "Roxo", value: "#A78BFA" },
  { label: "Rosa", value: "#EC4899" },
  { label: "Laranja", value: "#F97316" },
  { label: "Verde", value: "#22C55E" }
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [form, setForm] = useState({ nickname: "", primary_color: "#00D4AA", theme: "dark", weight: "", height: "", age: "", avatar_url: "", meal_notifications: false, main_goal: "", experience_level: "", weekly_frequency: "", training_days: [], training_location: "" });
  const [regenPlans, setRegenPlans] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await appClient.auth.me().catch(() => null);
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("Configuracoes")); return; }
    setUser(u);
    const profiles = await appClient.entities.UserProfile.filter({ user_email: u.email });
    if (profiles.length) {
      const p = profiles[0];
      setProfile(p);
      setProfileId(p.id);
      setForm({
        nickname: p.nickname || "",
        primary_color: p.primary_color || "#00D4AA",
        theme: p.theme || "dark",
        weight: p.weight || "",
        height: p.height || "",
        age: p.age || "",
        avatar_url: p.avatar_url || "",
        meal_notifications: p.meal_notifications || false,
        main_goal: p.main_goal || "",
        experience_level: p.experience_level || "",
        weekly_frequency: p.weekly_frequency || "",
        training_days: p.training_days || [],
        training_location: p.training_location || ""
      });
    }
    setLoading(false);
  }

  function handlePhotoSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropModalSrc(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleCropConfirm(blob) {
    if (!profileId) return;
    setUploadingPhoto(true);
    setCropModalSrc(null);
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    await appClient.entities.UserProfile.update(profileId, { avatar_url: file_url });
    setForm(p => ({ ...p, avatar_url: file_url }));
    window.dispatchEvent(new Event("profile-updated"));
    setUploadingPhoto(false);
  }

  const GOAL_LABELS = { perder_peso: "Perder Peso", ganhar_massa: "Ganhar Massa", manter_forma: "Manter Forma", melhorar_condicionamento: "Condicionamento", ganhar_forca: "Ganhar Força" };
  const EXP_LABELS = { iniciante: "Iniciante", intermediario: "Intermediário", experiente: "Experiente" };
  const LOCATION_LABELS = { academia: "🏋️ Academia", casa: "🏠 Casa", ar_livre: "🌳 Ar Livre", hibrido: "🔀 Híbrido" };
  const ALL_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const DAY_NAMES_S = { DOM: "Dom", SEG: "Seg", TER: "Ter", QUA: "Qua", QUI: "Qui", SEX: "Sex", SAB: "Sáb" };

  function toggleDay(day) {
    setForm(p => {
      const maxDays = parseInt(p.weekly_frequency) || 7;
      const isSelected = p.training_days.includes(day);
      if (!isSelected && p.training_days.length >= maxDays) return p; // já no limite
      return {
        ...p,
        training_days: isSelected ? p.training_days.filter(d => d !== day) : [...p.training_days, day]
      };
    });
  }

  async function handleSave() {
    if (!profileId) return;
    setSaving(true);

    const oldGoal = profile?.main_goal;
    const oldExp = profile?.experience_level;
    const oldFreq = profile?.weekly_frequency;
    const oldDays = JSON.stringify((profile?.training_days || []).slice().sort());
    const oldLocation = profile?.training_location;
    const oldWeight = profile?.weight;
    const oldHeight = profile?.height;

    const updatedData = {
      nickname: form.nickname,
      primary_color: form.primary_color,
      theme: form.theme,
      weight: parseFloat(form.weight) || profile?.weight,
      height: parseFloat(form.height) || profile?.height,
      age: parseInt(form.age) || profile?.age,
      meal_notifications: form.meal_notifications,
      main_goal: form.main_goal || profile?.main_goal,
      experience_level: form.experience_level || profile?.experience_level,
      weekly_frequency: parseInt(form.weekly_frequency) || profile?.weekly_frequency,
      training_days: form.training_days.length > 0 ? form.training_days : profile?.training_days,
      training_location: form.training_location || profile?.training_location
    };

    await appClient.entities.UserProfile.update(profileId, updatedData);
    window.dispatchEvent(new Event("profile-updated"));

    // Dieta: regenera apenas se mudou peso, altura ou objetivo
    const newWeight = parseFloat(form.weight) || oldWeight;
    const newHeight = parseFloat(form.height) || oldHeight;
    const dietChanged = form.main_goal !== oldGoal ||
      newWeight !== oldWeight ||
      newHeight !== oldHeight;

    // Treino: regenera se mudou objetivo, experiência, frequência, local ou dias de treino
    const workoutChanged = form.main_goal !== oldGoal || form.experience_level !== oldExp ||
      String(form.weekly_frequency) !== String(oldFreq) || JSON.stringify(form.training_days.sort()) !== oldDays ||
      form.training_location !== oldLocation;

    if ((dietChanged || workoutChanged) && user) {
      setRegenPlans(true);
      if (workoutChanged) {
        const workouts = await appClient.entities.WorkoutPlan.filter({ user_email: user.email });
        for (const w of workouts) await appClient.entities.WorkoutPlan.delete(w.id);
      }
      if (dietChanged) {
        const diets = await appClient.entities.DietPlan.filter({ user_email: user.email });
        for (const d of diets) await appClient.entities.DietPlan.delete(d.id);
      }
      setRegenPlans(false);
      navigate(createPageUrl("Painel"));
      return;
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleResetPlan() {
    if (!user) return;
    const workouts = await appClient.entities.WorkoutPlan.filter({ user_email: user.email });
    const diets = await appClient.entities.DietPlan.filter({ user_email: user.email });
    for (const w of workouts) await appClient.entities.WorkoutPlan.delete(w.id);
    for (const d of diets) await appClient.entities.DietPlan.delete(d.id);
    alert("Planos resetados! Acesse o Painel para gerar novos planos.");
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={36} /></div>;

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-2xl mx-auto animate-fade-up">
    {cropModalSrc && (
      <ImageCropModal
        imageSrc={cropModalSrc}
        primaryColor={form.primary_color}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropModalSrc(null)}
      />
    )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Personalize sua experiência</p>
      </div>

      {/* Profile */}
      <div className="card-glass p-4 mb-4">
        <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="relative">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold"
              style={{ background: `${form.primary_color}20`, color: form.primary_color }}>
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : (user?.full_name || user?.email || "U")[0].toUpperCase()
              }
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
              style={{ background: form.primary_color, borderColor: "var(--bg-card)" }}>
              {uploadingPhoto ? <LoadingSpinner size={10} color="#000" /> : <Camera size={10} color="#000" />}
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f) handlePhotoSelect(f); e.target.value = ""; }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{user?.full_name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Clique no ícone para alterar foto</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <User size={14} style={{ color: "var(--text-muted)" }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Perfil</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Apelido</label>
            <input value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
              placeholder="Como você quer ser chamado?"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "weight", label: "Peso (kg)" },
              { key: "height", label: "Altura (cm)" },
              { key: "age", label: "Idade" }
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Treino */}
      <div className="card-glass p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell size={14} style={{ color: "var(--text-muted)" }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Treino & Objetivo</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Objetivo Principal</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(GOAL_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, main_goal: key }))}
                  className="py-2 px-3 rounded-xl text-xs font-medium transition-all border text-left"
                  style={{
                    background: form.main_goal === key ? `${form.primary_color}15` : "var(--bg-surface)",
                    borderColor: form.main_goal === key ? form.primary_color : "var(--border-color)",
                    color: form.main_goal === key ? form.primary_color : "var(--text-secondary)"
                  }}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Nível de Experiência</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(EXP_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, experience_level: key }))}
                  className="py-2 rounded-xl text-xs font-medium transition-all border"
                  style={{
                    background: form.experience_level === key ? `${form.primary_color}15` : "var(--bg-surface)",
                    borderColor: form.experience_level === key ? form.primary_color : "var(--border-color)",
                    color: form.experience_level === key ? form.primary_color : "var(--text-secondary)"
                  }}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Local de Treino</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LOCATION_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, training_location: key }))}
                  className="py-2 px-3 rounded-xl text-xs font-medium transition-all border text-left"
                  style={{
                    background: form.training_location === key ? `${form.primary_color}15` : "var(--bg-surface)",
                    borderColor: form.training_location === key ? form.primary_color : "var(--border-color)",
                    color: form.training_location === key ? form.primary_color : "var(--text-secondary)"
                  }}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Frequência semanal (dias)</label>
            <input type="number" min="1" max="7" value={form.weekly_frequency}
              onChange={e => setForm(p => ({ ...p, weekly_frequency: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Dias de Treino</label>
              {form.weekly_frequency && (
                <span className="text-xs" style={{ color: form.training_days.length >= parseInt(form.weekly_frequency) ? "#EF4444" : "var(--text-muted)" }}>
                  {form.training_days.length}/{form.weekly_frequency} dias
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {ALL_DAYS.map(day => {
                const maxReached = form.training_days.length >= parseInt(String(form.weekly_frequency || 7)) && !form.training_days.includes(day);
                return (
                <button key={day} onClick={() => toggleDay(day)}
                  disabled={maxReached}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all border"
                  style={{
                    background: form.training_days.includes(day) ? `${form.primary_color}15` : "var(--bg-surface)",
                    borderColor: form.training_days.includes(day) ? form.primary_color : "var(--border-color)",
                    color: form.training_days.includes(day) ? form.primary_color : maxReached ? "var(--text-muted)" : "var(--text-secondary)",
                    opacity: maxReached ? 0.4 : 1,
                    cursor: maxReached ? "not-allowed" : "pointer"
                  }}>{DAY_NAMES_S[day]}</button>
              )})}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card-glass p-4 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>Aparência</h3>

        <div className="mb-4">
          <label className="block text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Cor principal</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setForm(p => ({ ...p, primary_color: c.value }))}
                title={c.label}
                className="w-9 h-9 rounded-xl transition-all border-2"
                style={{
                  background: c.value,
                  borderColor: form.primary_color === c.value ? "#fff" : "transparent",
                  transform: form.primary_color === c.value ? "scale(1.15)" : "scale(1)"
                }} />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Tema</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ key: "dark", label: "🌙 Escuro" }, { key: "light", label: "☀️ Claro" }, { key: "auto", label: "🔄 Auto" }].map(t => (
              <button key={t.key} onClick={() => setForm(p => ({ ...p, theme: t.key }))}
                className="py-2 rounded-xl text-xs font-medium transition-all border"
                style={{
                  background: form.theme === t.key ? "rgba(0,212,170,0.1)" : "var(--bg-surface)",
                  borderColor: form.theme === t.key ? form.primary_color : "var(--border-color)",
                  color: form.theme === t.key ? form.primary_color : "var(--text-secondary)"
                }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-glass p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} style={{ color: "var(--text-muted)" }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Notificações</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Lembretes de refeição</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Receber notificações nos horários das refeições</p>
          </div>
          <button
            onClick={() => setForm(p => ({ ...p, meal_notifications: !p.meal_notifications }))}
            className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: form.meal_notifications ? form.primary_color : "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: form.meal_notifications ? "calc(100% - 22px)" : "2px" }} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving || regenPlans}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold mb-4"
        style={{ background: saved ? "#22C55E" : form.primary_color, color: "#000" }}>
        {(saving || regenPlans) ? <LoadingSpinner size={16} color="#000" /> : <Save size={16} />}
        {regenPlans ? "Atualizando planos..." : saving ? "Salvando..." : saved ? "Salvo! ✓" : "Salvar Alterações"}
      </button>

      {/* Ficha Técnica */}
      {profile && (
        <div className="card-glass p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={14} style={{ color: "var(--text-muted)" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Ficha Técnica</h3>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Objetivo", value: profile.main_goal?.replace(/_/g, " ") },
              { label: "Biotipo", value: profile.biotype },
              { label: "Experiência", value: profile.experience_level },
              { label: "Local de treino", value: profile.training_location?.replace(/_/g, " ") },
              { label: "Frequência semanal", value: profile.weekly_frequency ? `${profile.weekly_frequency}x / semana` : null },
              { label: "Duração da sessão", value: profile.session_duration ? `${profile.session_duration} min` : null },
              { label: "Dias de treino", value: profile.training_days?.join(", ") },
              { label: "Equipamentos", value: profile.available_equipment?.join(", ") },
              { label: "Restrições alimentares", value: profile.food_restrictions?.length ? profile.food_restrictions.join(", ") : "Nenhuma" },
              { label: "Limitações físicas", value: profile.physical_limitations?.length ? profile.physical_limitations.join(", ") : "Nenhuma" },
              { label: "Calorias diárias", value: profile.daily_calories ? `${Math.round(profile.daily_calories)} kcal` : null },
              { label: "Proteínas", value: profile.protein_grams ? `${Math.round(profile.protein_grams)}g` : null },
              { label: "Carboidratos", value: profile.carbs_grams ? `${Math.round(profile.carbs_grams)}g` : null },
              { label: "Gorduras", value: profile.fat_grams ? `${Math.round(profile.fat_grams)}g` : null },
            ].filter(item => item.value).map(item => (
              <div key={item.label} className="flex justify-between items-start gap-4 py-2" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                <span className="text-right font-medium capitalize" style={{ color: "var(--text-primary)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card-glass p-4 mb-4" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#EF4444" }}>Zona de Risco</h3>
        <button onClick={handleResetPlan}
          className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm transition-all mb-2 border"
          style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}>
          <Trash2 size={14} /> Resetar Planos de Treino e Dieta
        </button>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Isso irá deletar seus planos atuais e gerar novos ao acessar o Painel.
        </p>
      </div>

      <button onClick={() => logout("/")}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm border transition-all"
        style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
        <LogOut size={14} /> Sair da conta
      </button>
    </div>
  );
}
