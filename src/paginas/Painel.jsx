import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Dumbbell, Utensils, TrendingUp, Camera, ChevronRight, Flame, Droplets, Target, Zap } from "lucide-react";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import GeneratingLoader from "@/components/ui/feedback/GeneratingLoader";

const DIET_MEAL_TIMING_RULES = `
REGRAS OBRIGATÓRIAS POR HORÁRIO:
- cafe_manha 07:00: comida típica de café da manhã, como ovos, aveia, tapioca, cuscuz, pão integral, iogurte, frutas, queijo cottage, leite ou alternativas permitidas. NÃO use arroz com frango, peixe com legumes, carne com batata ou marmita.
- almoco 12:00: almoço completo com proteína magra, carboidrato base, feijão/leguminosas quando fizer sentido, salada e legumes.
- lanche_tarde 15:30: lanche prático, como iogurte com fruta, vitamina, sanduíche integral, tapioca pequena, fruta com pasta de amendoim, whey/proteína vegetal, aveia ou castanhas.
- jantar 19:00: jantar realista, com proteína, legumes/verduras e carboidrato ajustado à meta, evitando comida de café da manhã.
- ceia 21:30: refeição leve antes de dormir, como iogurte proteico, cottage, caseína/whey, leite, ovos, tofu, abacate, chia ou castanhas. NÃO use prato pesado de almoço/jantar.`;
const DIET_DAY_VARIETY = {
  DOM: "café: omelete com tapioca e mamão | almoço: frango, arroz integral, feijão e salada | lanche: iogurte com banana e aveia | jantar: peixe com legumes e batata doce | ceia: cottage ou iogurte com chia",
  SEG: "café: overnight oats com iogurte e banana | almoço: patinho moído, mandioca e legumes | lanche: sanduíche integral com atum e fruta | jantar: frango com quinoa e salada | ceia: leite/proteína com abacate",
  TER: "café: cuscuz com ovos e fruta | almoço: peixe, arroz, lentilha e salada | lanche: vitamina de fruta com aveia | jantar: carne magra com abobrinha e purê | ceia: ovos ou tofu com chia",
  QUA: "café: pão integral com ovos e cottage | almoço: frango com macarrão integral e legumes | lanche: tapioca pequena com queijo ou frango | jantar: omelete com legumes | ceia: iogurte com linhaça",
  QUI: "café: panqueca de banana com aveia | almoço: salmão/peixe, batata e salada | lanche: fruta com pasta de amendoim e proteína | jantar: frango com legumes e arroz integral | ceia: cottage com castanhas",
  SEX: "café: tapioca com ovos e vitamina | almoço: carne magra, arroz, feijão e salada | lanche: iogurte com granola e morangos | jantar: tilápia ou tofu com quinoa | ceia: caseína/iogurte/leite com chia",
  SAB: "café: mingau de aveia com banana | almoço: frango ou grão-de-bico com batata doce | lanche: wrap integral com proteína e fruta | jantar: sopa proteica com legumes | ceia: abacate com chia ou iogurte",
};

export default function Painel() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const todayIdx = new Date().getDay();
  const todayKey = DAYS[todayIdx];

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const u = await appClient.auth.me().catch(() => null);
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("Painel")); return; }
    setUser(u);
    const profiles = await appClient.entities.UserProfile.filter({ user_email: u.email });
    if (!profiles.length || !profiles[0].onboarding_completed) {
      window.location.href = createPageUrl("BoasVindas");
      return;
    }
    const p = profiles[0];
    setProfile(p);
    const [workouts, diets] = await Promise.all([
      appClient.entities.WorkoutPlan.filter({ user_email: u.email }),
      appClient.entities.DietPlan.filter({ user_email: u.email })
    ]);
    const hasWorkout = workouts.length > 0;
    const hasDiet = diets.length > 0;
    if (hasWorkout) setWorkoutPlan(workouts[0]);
    if (hasDiet) setDietPlan(diets[0]);
    setLoading(false);
    if (!hasWorkout || !hasDiet) await generatePlans(p, u, hasWorkout, hasDiet);
  }

  async function generatePlans(p, u, hasWorkout, hasDiet) {
    setGenerating(true);
    const ctx = buildContext(p);

    if (!hasWorkout) {
      setGeneratingMsg("Criando seu plano de treino personalizado...");
      const trainingDays = p.training_days || [];
      const limitations = p.physical_limitations?.length > 0
        ? `Limitações físicas: ${p.physical_limitations.join(", ")} — evite exercícios pesados nessas regiões.`
        : "Sem limitações físicas.";
      const DAY_FULL_W = { DOM: "Domingo", SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado" };
      const focusList = p.sex === "feminino"
        ? [
            "Glúteos e Posterior de Coxa",
            "Quadríceps, Adutores e Panturrilhas",
            "Glúteos e Abdutor/Adutor",
            "Costas, Ombros e Core",
            "Pernas Completas com Ênfase em Glúteos",
            "Posterior Completo e Glúteos",
            "Corpo Todo com Foco Inferior",
          ]
        : ["Peito e Tríceps", "Costas e Bíceps", "Pernas e Glúteos", "Ombros e Core", "Braços e Abdômen", "Corpo Todo", "Costas e Core"];

      const week_plan = {};
      let focusIdx = 0;
      const trainingDaysList = [];
      for (const day of DAYS) {
        if (!trainingDays.includes(day)) {
          week_plan[day] = { name: "Descanso", focus: "Recuperação", rest_day: true, exercises: [] };
        } else {
          trainingDaysList.push({ day, focus: focusList[focusIdx++ % focusList.length] });
        }
      }
      const usedExercises = [];
      for (let ti = 0; ti < trainingDaysList.length; ti++) {
        const { day, focus } = trainingDaysList[ti];
        setGeneratingMsg(`Criando treino: ${DAY_FULL_W[day]}... (${ti + 1}/${trainingDaysList.length})`);
        const notRepeat = usedExercises.length > 0 ? `NÃO use: ${usedExercises.join(", ")}.` : "";
        const res = await appClient.integrations.Core.InvokeLLM({
          prompt: `Personal trainer: crie treino para ${DAY_FULL_W[day]}, foco em "${focus}". Perfil: ${ctx}. ${limitations} ${notRepeat} Crie 5 exercícios ÚNICOS. ${p.sex === "feminino" ? "PERFIL FEMININO: priorize glúteos, posterior, quadríceps, adutores, abdutores, panturrilhas e core. Quando o foco for inferior, use compostos + isoladores de glúteos/pernas e mantenha peito/tríceps com volume reduzido." : ""} JSON: {"name":"Treino de ${focus}","focus":"${focus}","rest_day":false,"exercises":[{"name":"string","muscle_group":"string","sets":3,"reps":"string","rest_seconds":60,"instructions":"string","video_search":"string"}]}`,
          response_json_schema: { type: "object", properties: { name: { type: "string" }, focus: { type: "string" }, rest_day: { type: "boolean" }, exercises: { type: "array", items: { type: "object" } } } }
        });
        if (res.exercises) res.exercises.forEach(e => { if (e.name) usedExercises.push(e.name); });
        week_plan[day] = { ...res, rest_day: false };
      }
      const wp = await appClient.entities.WorkoutPlan.create({ user_email: u.email, week_plan, generated_at: new Date().toISOString() });
      setWorkoutPlan(wp);
    }

    if (!hasDiet) {
      setGeneratingMsg("Montando seu plano alimentar semanal...");
      const restrictions = p.food_restrictions?.length > 0
        ? `PROIBIDO: ${p.food_restrictions.join(", ")} e todos os derivados.`
        : "Sem restrições.";
      const trainingDays = p.training_days || [];
      const DAY_FULL = { DOM: "Domingo", SEG: "Segunda-feira", TER: "Terça-feira", QUA: "Quarta-feira", QUI: "Quinta-feira", SEX: "Sexta-feira", SAB: "Sábado" };

      const week_plan = {};
      const usedProteins = [];
      const usedCarbs = [];
      const usedMeals = [];
      const usedIngredients = [];

      for (let i = 0; i < DAYS.length; i++) {
        const day = DAYS[i];
        const isTraining = trainingDays.includes(day);
        const calNote = isTraining
          ? "Dia de treino: adicione +150kcal extras em carboidratos."
          : "Dia de descanso: mantenha calorias base.";
        const prevSummary = usedProteins.length > 0
          ? `Proteínas já usadas: ${usedProteins.join(", ")}. Carboidratos já usados: ${usedCarbs.join(", ")}. Refeições já usadas: ${usedMeals.join(", ")}. Ingredientes já usados: ${usedIngredients.slice(0, 40).join(", ")}. Use combinações DIFERENTES.`
          : "Primeiro dia, escolha livremente.";
        const daySuggestion = DIET_DAY_VARIETY[day] || DIET_DAY_VARIETY.SEG;

        setGeneratingMsg(`Gerando dieta: ${DAY_FULL[day]}... (${i + 1}/7)`);

        const res = await appClient.integrations.Core.InvokeLLM({
          prompt: `Nutricionista: plano alimentar para ${DAY_FULL[day]}. Perfil: ${ctx}. ${calNote} ${prevSummary} ${restrictions} Use ingredientes VARIADOS. SUGESTÃO DE VARIEDADE PARA ESTE DIA: ${daySuggestion}. ${DIET_MEAL_TIMING_RULES} Cada refeição deve parecer natural para o horário e ainda seguir a dieta/macros. NÃO repita o mesmo cardápio dos dias anteriores. JSON: {"daily_plan":{"cafe_manha":{"name":"str","time":"07:00","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[{"name":"str","quantity":"str","calories":0,"protein":0,"carbs":0,"fat":0}]},"almoco":{"name":"str","time":"12:00","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[]},"lanche_tarde":{"name":"str","time":"15:30","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[]},"jantar":{"name":"str","time":"19:00","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[]},"ceia":{"name":"str","time":"21:30","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[]}},"main_protein":"str","main_carb":"str"}`,
          response_json_schema: { type: "object", properties: { daily_plan: { type: "object" }, main_protein: { type: "string" }, main_carb: { type: "string" } } }
        });
        if (res.main_protein) usedProteins.push(res.main_protein);
        if (res.main_carb) usedCarbs.push(res.main_carb);
        if (res.daily_plan) {
          Object.values(res.daily_plan).forEach((meal) => {
            if (meal?.name) usedMeals.push(meal.name);
            meal?.ingredients?.forEach((ingredient) => {
              if (ingredient?.name) usedIngredients.push(ingredient.name);
            });
          });
        }
        
        // Calcula totais do dia
        const meals = Object.values(res.daily_plan);
        const dayTotals = {
          total_calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
          protein_grams: meals.reduce((s, m) => s + (m.protein || 0), 0),
          carbs_grams: meals.reduce((s, m) => s + (m.carbs || 0), 0),
          fat_grams: meals.reduce((s, m) => s + (m.fat || 0), 0)
        };
        
        week_plan[day] = { ...res, ...dayTotals };
      }

      setGeneratingMsg("Gerando dicas de saúde...");
      const tipsRes = await appClient.integrations.Core.InvokeLLM({
        prompt: `Dê 3 dicas práticas de nutrição para: ${ctx}. JSON: {"health_tips":["dica1","dica2","dica3"]}`,
        response_json_schema: { type: "object", properties: { health_tips: { type: "array", items: { type: "string" } } } }
      });

      const dp = await appClient.entities.DietPlan.create({
        user_email: u.email,
        week_plan,
        health_tips: tipsRes.health_tips || [],
        generated_at: new Date().toISOString()
      });
      setDietPlan(dp);
    }
    setGenerating(false);
    setGeneratingMsg("");
  }

  function buildContext(p) {
    const imc = p.weight && p.height ? (p.weight / ((p.height / 100) ** 2)).toFixed(1) : "N/A";
    return `Nome: ${p.full_name || "usuário"}, Biotipo: ${p.biotype}, Peso: ${p.weight}kg, Altura: ${p.height}cm, IMC: ${imc}, Idade: ${p.age}, Sexo: ${p.sex}, Objetivo: ${p.main_goal}, Experiência: ${p.experience_level}, Frequência: ${p.weekly_frequency}x/semana, Duração: ${p.session_duration}min, Local: ${p.training_location}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(0,212,170,0.1)" }}>
          <Zap size={32} style={{ color: "#00D4AA" }} />
        </div>
        <GeneratingLoader message={generatingMsg || "Criando seu plano personalizado..."} estimatedSeconds={90} />
        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Preparando seu plano com base no seu biotipo, objetivos e histórico...
        </p>
      </div>
    );
  }

  const todayWorkout = workoutPlan?.week_plan?.[todayKey];
  const imc = profile ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : null;

  // Pega dados do dia atual — usa os totais salvos no week_plan (mesma fonte que a aba Diet)
  const todayDietData = dietPlan?.week_plan?.[todayKey] || null;
  const todayDailyPlan = todayDietData?.daily_plan || dietPlan?.daily_plan || null;
  const todayProtein = todayDietData?.protein_grams ?? (dietPlan?.protein_grams || 0);
  const todayCarbs = todayDietData?.carbs_grams ?? (dietPlan?.carbs_grams || 0);
  const todayFat = todayDietData?.fat_grams ?? (dietPlan?.fat_grams || 0);
  const todayKcal = todayDietData?.total_calories ?? (dietPlan?.total_calories || 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{greeting()},</p>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {profile?.nickname || user?.full_name?.split(" ")[0] || "Atleta"} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Pronto para mais um dia de evolução?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "IMC", value: imc || "–", icon: Target, color: "#00D4AA" },
          { label: "Kcal/dia", value: todayKcal > 0 ? Math.round(todayKcal) : "–", icon: Flame, color: "#FF6B35" },
          { label: "Proteína", value: todayProtein > 0 ? `${Math.round(todayProtein)}g` : "–", icon: Zap, color: "#A78BFA" },
          { label: "Água", value: "2,5L", icon: Droplets, color: "#38BDF8" }
        ].map(stat => (
          <div key={stat.label} className="card-glass p-3 lg:p-4 flex flex-col items-center text-center">
            <stat.icon size={18} style={{ color: stat.color }} className="mb-1.5" />
            <p className="text-base lg:text-xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
            <p className="text-[10px] lg:text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Workout Card */}
      <div className="card-glass p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>TREINO DE HOJE · {["DOM","SEG","TER","QUA","QUI","SEX","SAB"][todayIdx]}</p>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {todayWorkout?.rest_day ? "Dia de Descanso 😴" : (todayWorkout?.name || "Aguardando plano...")}
            </h3>
            {todayWorkout && !todayWorkout.rest_day && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{todayWorkout.focus}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,212,170,0.1)" }}>
            <Dumbbell size={20} style={{ color: "#00D4AA" }} />
          </div>
        </div>
        {todayWorkout && !todayWorkout.rest_day && (
          <span className="inline-block text-xs px-2 py-1 rounded-full mb-4" style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA" }}>
            {todayWorkout.exercises?.length || 0} exercícios
          </span>
        )}
        <Link to={createPageUrl("Treino")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold"
          style={{ background: "#00D4AA", color: "#000" }}>
          {todayWorkout?.rest_day ? "Ver semana" : "Ver treino"} <ChevronRight size={16} />
        </Link>
      </div>

      {/* Diet Card */}
      <div className="card-glass p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>DIETA DE HOJE</p>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Plano Alimentar</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {todayDailyPlan ? `${Object.keys(todayDailyPlan).length} refeições hoje` : (dietPlan ? "Plano disponível" : "Aguardando plano...")}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,107,53,0.1)" }}>
            <Utensils size={20} style={{ color: "#FF6B35" }} />
          </div>
        </div>
        {dietPlan && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Proteína", grams: Math.round(todayProtein), color: "#A78BFA" },
              { label: "Carbs", grams: Math.round(todayCarbs), color: "#F59E0B" },
              { label: "Gordura", grams: Math.round(todayFat), color: "#FF6B35" }
            ].map(macro => (
              <div key={macro.label} className="text-center">
                <p className="text-base font-bold" style={{ color: macro.color }}>{macro.grams}g</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{macro.label}</p>
              </div>
            ))}
          </div>
        )}
        <Link to={createPageUrl("Dieta")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          Ver dieta completa <ChevronRight size={16} />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to={createPageUrl("Progresso")} className="card-glass p-4 flex items-center gap-3 transition-all">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.1)" }}>
            <TrendingUp size={18} style={{ color: "#38BDF8" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Progresso</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Registrar evolução</p>
          </div>
        </Link>
        <Link to={createPageUrl("AnaliseRefeicao")} className="card-glass p-4 flex items-center gap-3 transition-all">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)" }}>
            <Camera size={18} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analisar Prato</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Foto da refeição</p>
          </div>
        </Link>
      </div>

      {/* Health Tip */}
      {dietPlan?.health_tips?.[0] && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(0,212,170,0.07)", border: "1px solid rgba(0,212,170,0.15)" }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "#00D4AA" }}>💡 DICA DO DIA</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{dietPlan.health_tips[0]}</p>
        </div>
      )}
    </div>
  );
}
