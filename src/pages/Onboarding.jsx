import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Zap } from "lucide-react";

const BIOTYPES = [
  { value: "ectomorfo", label: "Ectomorfo", icon: "🦷", desc: "Corpo magro, dificuldade de ganhar massa" },
  { value: "mesomorfo", label: "Mesomorfo", icon: "💪", desc: "Corpo atlético, fácil de ganhar e perder peso" },
  { value: "endomorfo", label: "Endomorfo", icon: "🍩", desc: "Corpo mais largo, tendência a acumular gordura" },
];

const GOALS = [
  { value: "perder_peso", label: "Perder Peso", icon: "🔥", desc: "Queimar gordura e definir o corpo" },
  { value: "ganhar_massa", label: "Ganhar Massa", icon: "💪", desc: "Aumentar músculo e volume corporal" },
  { value: "manter_forma", label: "Manter Forma", icon: "⚖️", desc: "Manter peso e saúde em equilíbrio" },
  { value: "melhorar_condicionamento", label: "Condicionamento", icon: "🏃", desc: "Melhorar resistência e energia" },
  { value: "ganhar_forca", label: "Ganhar Força", icon: "🏋️", desc: "Aumentar carga e potência muscular" },
];

const EXPERIENCE = [
  { value: "iniciante", label: "Iniciante", icon: "🌱", desc: "Menos de 1 ano" },
  { value: "intermediario", label: "Intermediário", icon: "🔥", desc: "1 a 3 anos" },
  { value: "experiente", label: "Experiente", icon: "⚡", desc: "Mais de 3 anos" },
];

const LOCATIONS = [
  { value: "academia", label: "Academia", icon: "🏋️" },
  { value: "casa", label: "Em Casa", icon: "🏠" },
  { value: "ar_livre", label: "Ar Livre", icon: "🌳" },
  { value: "hibrido", label: "Híbrido", icon: "🔄" },
];

const WEEKDAYS = [
  { value: "DOM", label: "Dom" },
  { value: "SEG", label: "Seg" },
  { value: "TER", label: "Ter" },
  { value: "QUA", label: "Qua" },
  { value: "QUI", label: "Qui" },
  { value: "SEX", label: "Sex" },
  { value: "SAB", label: "Sáb" },
];

const FOOD_RESTRICTIONS = [
  { value: "lactose", label: "Lactose", icon: "🥛" },
  { value: "gluten", label: "Glúten", icon: "🌾" },
  { value: "amendoim", label: "Amendoim", icon: "🥜" },
  { value: "soja", label: "Soja", icon: "🫘" },
  { value: "ovos", label: "Ovos", icon: "🥚" },
  { value: "frutos_do_mar", label: "Frutos do Mar", icon: "🦐" },
  { value: "nozes", label: "Nozes/Castanhas", icon: "🌰" },
  { value: "vegan", label: "Vegano", icon: "🌱" },
  { value: "vegetariano", label: "Vegetariano", icon: "🥦" },
];

const PHYSICAL_LIMITATIONS = [
  { value: "joelho", label: "Joelho", icon: "🦵" },
  { value: "ombro", label: "Ombro", icon: "💪" },
  { value: "coluna", label: "Coluna/Lombar", icon: "🦴" },
  { value: "quadril", label: "Quadril", icon: "🍑" },
  { value: "tornozelo", label: "Tornozelo/Pé", icon: "🦶" },
  { value: "cotovelo", label: "Cotovelo/Pulso", icon: "🤲" },
  { value: "pescoco", label: "Pescoço/Cervical", icon: "🧠" },
  { value: "nenhuma", label: "Nenhuma", icon: "✅" },
];

const TOTAL_STEPS = 8;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    nickname: "",
    age: "",
    weight: "",
    height: "",
    sex: "",
    biotype: "",
    main_goal: "",
    experience_level: "",
    training_location: "",
    weekly_frequency: 3,
    session_duration: 60,
    training_days: [],
    food_restrictions: [],
    physical_limitations: [],
  });

  function toggle(field, value) {
    setData(prev => {
      const arr = prev[field] || [];
      if (value === "nenhuma") return { ...prev, [field]: ["nenhuma"] };
      const filtered = arr.filter(v => v !== "nenhuma");
      return {
        ...prev,
        [field]: filtered.includes(value) ? filtered.filter(v => v !== value) : [...filtered, value]
      };
    });
  }

  function canProceed() {
    switch (step) {
      case 0: return data.nickname && data.age && data.weight && data.height && data.sex;
      case 1: return !!data.biotype;
      case 2: return !!data.main_goal;
      case 3: return !!data.experience_level;
      case 4: return !!data.training_location && data.training_days.length === data.weekly_frequency;
      case 5: return true; // physical limitations: optional
      case 6: return true; // food restrictions: optional
      case 7: return true; // summary
      default: return true;
    }
  }

  async function handleFinish() {
    setSaving(true);
    const u = await base44.auth.me().catch(() => null);
    if (!u) { base44.auth.redirectToLogin(createPageUrl("Onboarding")); return; }

    const profileData = {
      user_email: u.email,
      nickname: data.nickname,
      full_name: u.full_name,
      age: Number(data.age),
      weight: Number(data.weight),
      height: Number(data.height),
      sex: data.sex,
      biotype: data.biotype,
      main_goal: data.main_goal,
      experience_level: data.experience_level,
      training_location: data.training_location,
      weekly_frequency: Number(data.weekly_frequency),
      session_duration: Number(data.session_duration),
      training_days: data.training_days,
      food_restrictions: data.food_restrictions.filter(r => r !== "nenhuma"),
      physical_limitations: data.physical_limitations.filter(l => l !== "nenhuma"),
      onboarding_completed: true,
    };

    const existing = await base44.entities.UserProfile.filter({ user_email: u.email });
    if (existing.length > 0) {
      await base44.entities.UserProfile.update(existing[0].id, profileData);
    } else {
      await base44.entities.UserProfile.create(profileData);
    }
    window.location.href = createPageUrl("Dashboard");
  }

  const progress = ((step) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-dark)" }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#00D4AA" }}>
          <Zap size={16} color="#000" />
        </div>
        <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>YForge Fit</span>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-2">
        <div className="h-1 rounded-full" style={{ background: "var(--bg-surface)" }}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>Etapa {step + 1} de {TOTAL_STEPS}</p>
      </div>

      {/* Steps */}
      <div className="flex-1 flex flex-col justify-center p-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>

            {/* Step 0: Personal Info */}
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Vamos começar! 👋</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Conte um pouco sobre você</p>
                <div className="space-y-3">
                  <input className="w-full px-4 py-3 rounded-xl text-sm outline-none" placeholder="Como quer ser chamado?"
                    style={{ background: "var(--bg-card)", border: "1px solid #000", color: "var(--text-primary)" }}
                    value={data.nickname} onChange={e => setData({ ...data, nickname: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="w-full px-4 py-3 rounded-xl text-sm outline-none" placeholder="Idade"
                      style={{ background: "var(--bg-card)", border: "1px solid #000", color: "var(--text-primary)" }}
                      value={data.age} onChange={e => setData({ ...data, age: e.target.value })} />
                    <select className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-card)", border: "1px solid #000", color: data.sex ? "var(--text-primary)" : "var(--text-muted)" }}
                      value={data.sex} onChange={e => setData({ ...data, sex: e.target.value })}>
                      <option value="">Sexo</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="w-full px-4 py-3 rounded-xl text-sm outline-none" placeholder="Peso (kg)"
                      style={{ background: "var(--bg-card)", border: "1px solid #000", color: "var(--text-primary)" }}
                      value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })} />
                    <input type="number" className="w-full px-4 py-3 rounded-xl text-sm outline-none" placeholder="Altura (cm)"
                      style={{ background: "var(--bg-card)", border: "1px solid #000", color: "var(--text-primary)" }}
                      value={data.height} onChange={e => setData({ ...data, height: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Biotype */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Qual seu biotipo?</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Isso ajuda a personalizar seu treino e dieta</p>
                <div className="space-y-3">
                  {BIOTYPES.map(b => (
                    <button key={b.value} onClick={() => setData({ ...data, biotype: b.value })}
                      className="w-full p-4 rounded-2xl text-left transition-all border flex items-center gap-3"
                      style={{
                        background: data.biotype === b.value ? "rgba(0,212,170,0.1)" : "var(--bg-card)",
                        borderColor: data.biotype === b.value ? "#00D4AA" : "var(--border-color)"
                      }}>
                      <span className="text-2xl">{b.icon}</span>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: data.biotype === b.value ? "#00D4AA" : "var(--text-primary)" }}>{b.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Goal */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Seu objetivo principal?</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Vamos focar no que importa para você</p>
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map(g => (
                    <button key={g.value} onClick={() => setData({ ...data, main_goal: g.value })}
                      className="p-4 rounded-2xl text-center transition-all border flex flex-col items-center"
                      style={{
                        background: data.main_goal === g.value ? "rgba(0,212,170,0.1)" : "var(--bg-card)",
                        borderColor: data.main_goal === g.value ? "#00D4AA" : "var(--border-color)"
                      }}>
                      <span className="text-2xl mb-1">{g.icon}</span>
                      <p className="text-xs font-semibold" style={{ color: data.main_goal === g.value ? "#00D4AA" : "var(--text-primary)" }}>{g.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Experience */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Nível de experiência?</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Quanto tempo você treina?</p>
                <div className="space-y-3">
                  {EXPERIENCE.map(e => (
                    <button key={e.value} onClick={() => setData({ ...data, experience_level: e.value })}
                      className="w-full p-4 rounded-2xl text-left transition-all border flex items-center gap-3"
                      style={{
                        background: data.experience_level === e.value ? "rgba(0,212,170,0.1)" : "var(--bg-card)",
                        borderColor: data.experience_level === e.value ? "#00D4AA" : "var(--border-color)"
                      }}>
                      <span className="text-2xl">{e.icon}</span>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: data.experience_level === e.value ? "#00D4AA" : "var(--text-primary)" }}>{e.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{e.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Location + frequency + duration */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Onde você treina?</h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Configurações de treino</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {LOCATIONS.map(l => (
                    <button key={l.value} onClick={() => setData({ ...data, training_location: l.value })}
                      className="p-4 rounded-2xl text-center transition-all border"
                      style={{
                        background: data.training_location === l.value ? "rgba(0,212,170,0.1)" : "var(--bg-card)",
                        borderColor: data.training_location === l.value ? "#00D4AA" : "var(--border-color)"
                      }}>
                      <span className="text-2xl">{l.icon}</span>
                      <p className="text-xs font-semibold mt-1" style={{ color: data.training_location === l.value ? "#00D4AA" : "var(--text-primary)" }}>{l.label}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Frequência: <span style={{ color: "#00D4AA" }}>{data.weekly_frequency}x por semana</span></p>
                    <input type="range" min="1" max="7" value={data.weekly_frequency}
                      onChange={e => setData({ ...data, weekly_frequency: Number(e.target.value), training_days: [] })}
                      className="w-full accent-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Duração: <span style={{ color: "#00D4AA" }}>{data.session_duration} min</span></p>
                    <input type="range" min="30" max="120" step="10" value={data.session_duration}
                      onChange={e => setData({ ...data, session_duration: Number(e.target.value) })}
                      className="w-full accent-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                      Dias de treino: <span style={{ color: data.training_days.length === data.weekly_frequency ? "#00D4AA" : "#F59E0B" }}>{data.training_days.length}/{data.weekly_frequency} selecionados</span>
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {WEEKDAYS.map(d => {
                        const sel = data.training_days.includes(d.value);
                        const maxReached = data.training_days.length >= data.weekly_frequency;
                        const disabled = !sel && maxReached;
                        return (
                          <button key={d.value}
                            onClick={() => !disabled && toggle("training_days", d.value)}
                            disabled={disabled}
                            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all border"
                            style={{
                              background: sel ? "#00D4AA" : "var(--bg-card)",
                              borderColor: sel ? "#00D4AA" : "var(--border-color)",
                              color: sel ? "#000" : disabled ? "var(--text-muted)" : "var(--text-secondary)",
                              opacity: disabled ? 0.4 : 1,
                              cursor: disabled ? "not-allowed" : "pointer"
                            }}>
                            <span className="text-xs font-bold">{d.label}</span>
                            {sel && <Check size={10} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Physical Limitations */}
            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Alguma limitação física?</h2>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Isso adapta os exercícios para regiões com problema</p>
                <p className="text-xs mb-6 px-3 py-2 rounded-xl" style={{ background: "rgba(247,129,66,0.1)", color: "#F78142" }}>
                  ⚠️ Exercícios para as regiões selecionadas serão substituídos por alternativas mais leves e seguras
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PHYSICAL_LIMITATIONS.map(l => {
                    const sel = data.physical_limitations.includes(l.value);
                    return (
                      <button key={l.value} onClick={() => toggle("physical_limitations", l.value)}
                        className="p-3 rounded-2xl flex items-center gap-3 transition-all border"
                        style={{
                          background: sel ? (l.value === "nenhuma" ? "rgba(0,212,170,0.1)" : "rgba(247,129,66,0.1)") : "var(--bg-card)",
                          borderColor: sel ? (l.value === "nenhuma" ? "#00D4AA" : "#F78142") : "var(--border-color)"
                        }}>
                        <span className="text-xl">{l.icon}</span>
                        <span className="text-xs font-medium" style={{ color: sel ? (l.value === "nenhuma" ? "#00D4AA" : "#F78142") : "var(--text-primary)" }}>{l.label}</span>
                        {sel && <Check size={12} className="ml-auto" style={{ color: l.value === "nenhuma" ? "#00D4AA" : "#F78142" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Food Restrictions */}
            {step === 6 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Restrições alimentares?</h2>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Alergias e preferências que afetam sua dieta</p>
                <p className="text-xs mb-6 px-3 py-2 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                  🚫 A IA nunca incluirá ingredientes que contenham os itens selecionados
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {FOOD_RESTRICTIONS.map(r => {
                    const sel = data.food_restrictions.includes(r.value);
                    return (
                      <button key={r.value} onClick={() => toggle("food_restrictions", r.value)}
                        className="p-3 rounded-2xl flex items-center gap-3 transition-all border"
                        style={{
                          background: sel ? "rgba(245,158,11,0.1)" : "var(--bg-card)",
                          borderColor: sel ? "#F59E0B" : "var(--border-color)"
                        }}>
                        <span className="text-xl">{r.icon}</span>
                        <span className="text-xs font-medium" style={{ color: sel ? "#F59E0B" : "var(--text-primary)" }}>{r.label}</span>
                        {sel && <Check size={12} className="ml-auto" style={{ color: "#F59E0B" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 7: Summary */}
            {step === 7 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Tudo pronto! 🎉</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Veja um resumo do seu perfil</p>
                <div className="card-glass p-4 space-y-3">
                  {[
                    { label: "Nome", value: data.nickname },
                    { label: "Biotipo", value: data.biotype },
                    { label: "Objetivo", value: data.main_goal?.replace(/_/g, " ") },
                    { label: "Experiência", value: data.experience_level },
                    { label: "Local", value: data.training_location },
                    { label: "Frequência", value: `${data.weekly_frequency}x/semana, ${data.session_duration}min` },
                    { label: "Dias de treino", value: data.training_days.join(", ") || "—" },
                    { label: "Limitações físicas", value: data.physical_limitations.length > 0 ? data.physical_limitations.filter(l => l !== "nenhuma").join(", ") || "Nenhuma" : "Nenhuma" },
                    { label: "Restrições alimentares", value: data.food_restrictions.length > 0 ? data.food_restrictions.join(", ") : "Nenhuma" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "var(--border-color)" }}>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-4 flex gap-3 max-w-lg mx-auto w-full">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
            <ChevronLeft size={16} />
            Voltar
          </button>
        )}
        <button
          onClick={step === TOTAL_STEPS - 1 ? handleFinish : () => { if (step === 4 && data.training_days.length !== data.weekly_frequency) return; setStep(s => s + 1); }}
          disabled={!canProceed() || saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: canProceed() ? "#00D4AA" : "var(--bg-surface)",
            color: canProceed() ? "#000" : "var(--text-muted)",
            opacity: saving ? 0.7 : 1
          }}>
          {saving ? "Salvando..." : step === TOTAL_STEPS - 1 ? "Começar agora! 🚀" : "Continuar"}
          {!saving && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}