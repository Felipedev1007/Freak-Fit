import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { RefreshCw, Moon } from "lucide-react";
import CartaoExercicio from "@/components/treino/CartaoExercicio";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";

const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const DAY_LABELS = { DOM: "Domingo", SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado" };
const DAY_NAMES = { DOM: "Dom", SEG: "Seg", TER: "Ter", QUA: "Qua", QUI: "Qui", SEX: "Sex", SAB: "Sáb" };
const DAY_FULL = { DOM: "Domingo", SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado" };

export default function Treino() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await appClient.auth.me().catch(() => null);
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("Treino")); return; }
    setUser(u);
    const profiles = await appClient.entities.UserProfile.filter({ user_email: u.email });
    const p = profiles[0] || null;
    if (p) setProfile(p);
    const workouts = await appClient.entities.WorkoutPlan.filter({ user_email: u.email });
    if (workouts.length) {
      const existingPlan = workouts[0];
      // Verifica se os dias do plano batem com os dias do perfil
      const trainingDays = p?.training_days || [];
      const planIsValid = trainingDays.length > 0 && trainingDays.every(day => {
        const dayData = existingPlan.week_plan?.[day];
        return dayData && dayData.rest_day === false;
      }) && DAYS.every(day => {
        if (trainingDays.includes(day)) return true;
        const dayData = existingPlan.week_plan?.[day];
        return dayData && dayData.rest_day === true;
      });

      if (planIsValid) {
        setPlan(existingPlan);
        setPlanId(existingPlan.id);
        setLoading(false);
      } else {
        // Plano inválido — regenera automaticamente com os dias corretos
        setLoading(false);
        await handleRegenerateWith(p, u, existingPlan.id);
        return;
      }
    } else {
      setLoading(false);
    }
  }

  function buildContext(p) {
    const injuries = p.physical_limitations?.length > 0
      ? `⚠️ LIMITAÇÕES FÍSICAS — ADAPTAR OBRIGATÓRIO: ${p.physical_limitations.join(", ")}. Substitua exercícios que agravem essas regiões por variações seguras.`
      : "Sem limitações físicas.";

    // Protocolo estrito por nível — volume, intensidade, complexidade e segurança
    const levelProtocol = {
      iniciante: {
        label: "INICIANTE",
        volume: "3 séries × 12-15 reps",
        intensity: "60-65% 1RM estimado — NUNCA chegue à falha muscular",
        rest: "Descanso: 60-90s entre séries",
        maxExercises: 4,
        rules: `REGRAS OBRIGATÓRIAS PARA INICIANTE:
• MÁXIMO 4 exercícios por sessão — não sobrecarregue o sistema nervoso
• PROIBIDO: exercícios complexos (olimpícos, handstand, muscle-up, pistol squat, etc.)
• PROIBIDO: técnicas avançadas (drop sets, supersets, rest-pause, oclusão)
• PRIORIDADE ABSOLUTA: aprendizado motor e técnica correta
• Use movimentos fundamentais: agachamento com halter, flexão de joelho guiada, remada apoiada, flexão de braço convencional
• Progressão: adicione 1-2 reps por semana antes de aumentar carga
• Instruções detalhadas de execução são ESSENCIAIS para iniciantes`,
        examplesAcademia: "leg press, cadeira extensora, rosca direta com barra, supino com halteres, puxada frontal (máquina), desenvolvimento com halteres, flexão de joelho deitado",
        examplesCasa: "agachamento livre, afundo estático, flexão de braço ajoelhado, prancha, elevação de quadril, abdominal crunch, polichinelo",
        examplesArLivre: "agachamento livre, afundo, flexão de braço convencional, prancha frontal, abdominal bicicleta, corrida leve, polichinelo",
      },
      intermediario: {
        label: "INTERMEDIÁRIO",
        volume: "3-4 séries × 8-12 reps",
        intensity: "70-75% 1RM — trabalhe próximo à falha nas últimas séries",
        rest: "Descanso: 60-90s (hipertrofia) ou 90-120s (força)",
        maxExercises: 5,
        rules: `REGRAS PARA INTERMEDIÁRIO:
• 5 exercícios por sessão — balanceie compostos e isoladores
• Comece com 1-2 compostos, depois 2-3 isoladores
• Supersets ocasionais são permitidos (agonista-antagonista)
• Variações moderadas: agachamento livre, barra fixa assistida, supino inclinado
• PROIBIDO: movimentos olímpicos (snatch, clean & jerk) sem base estabelecida
• Progressão de carga: aumente 2,5-5kg quando completar todas as reps com boa técnica`,
        examplesAcademia: "agachamento livre, supino com barra, terra romeno, barra fixa, desenvolvimento militar, remada curvada, leg press, rosca alternada",
        examplesCasa: "agachamento búlgaro, flexão de braço declinada, flexão diamante, barra de porta (supinada), afundo caminhante, prancha lateral, burpee modificado, pike push-up",
        examplesArLivre: "barra fixa (supinada e pronada), paralelas, agachamento búlgaro em banco, afundo caminhante, flexão declinada em banco, sprint 30m",
      },
      experiente: {
        label: "EXPERIENTE / AVANÇADO",
        volume: "4-5 séries × 6-12 reps (varia por bloco de periodização)",
        intensity: "75-85% 1RM — trabalhe até a falha muscular nas séries finais",
        rest: "Descanso: 90-180s (força) ou 45-60s (metabólico)",
        maxExercises: 6,
        rules: `REGRAS PARA EXPERIENTE:
• 5-6 exercícios por sessão — alta densidade de volume
• Técnicas avançadas PERMITIDAS: drop sets, supersets, rest-pause, contração excêntrica, tempo de execução
• Movimentos complexos permitidos: agachamento frontal, terra convencional, clean, barra fixa com peso, muscle-up
• Periodização ondulatória: varie rep ranges (força 3-5 reps / hipertrofia 8-12 / resistência 15-20) ao longo da semana
• Progressão: microcargas, volume progressivo, densidade
• Para casa/calistenia avançada: one-arm push-up progressions, pistol squat, L-sit, handstand push-up progressions`,
        examplesAcademia: "agachamento frontal, terra convencional, supino com barra, barra fixa com peso, desenvolvimento militar em pé, remada com barra, face pull, agachamento búlgaro com halteres pesados",
        examplesCasa: "pistol squat progressivo, flexão arqueiro, pike push-up elevado, barra de porta com lastro, agachamento búlgaro explosivo, L-sit em cadeiras, muscle-up progressão, handstand wall hold",
        examplesArLivre: "muscle-up, barra fixa com lastro, paralelas com lastro, pistol squat, handstand push-up, ring row, sprint tabata, salto em caixa",
      },
    }[p.experience_level] || {};

    const goalProtocol = {
      ganhar_massa: `Hipertrofia: compostos multiarticulares primeiro (agachamento, supino, remada, desenvolvimento). Volume alto, tensão mecânica máxima. Descanso 60-90s. Progressão de carga semanal.`,
      perder_peso: `Metabólico + força: elevar EPOC. Supersets agonista-antagonista, descansos 30-45s. Combine movimentos compostos com condicionamento. Densidade calórica alta na sessão.`,
      ganhar_forca: `Força máxima: movimentos compostos pesados, 3-6 reps (para iniciante, adapte para 8-10 reps técnicas). Descanso longo 2-3min. Progressão linear de carga.`,
      manter_forma: `Manutenção funcional: volume moderado, variedade. Equilíbrio entre grupos musculares. 8-12 reps, mescle compostos e isoladores.`,
      melhorar_condicionamento: `Condicionamento aeróbico-anaeróbico: circuitos funcionais, HIIT estruturado. Descanso ativo entre blocos. Alta frequência cardíaca sustentada.`,
    }[p.main_goal] || "";

    const biotypeAdaptation = {
      ectomorfo: "Sessões curtas e intensas (máx 60min). Minimize cardio. Compostos com máxima carga para estímulo anabólico.",
      mesomorfo: "Responde bem a volume e variedade. Combine força e hipertrofia. Periodize em blocos de 4-6 semanas.",
      endomorfo: "Inclua componente metabólico (supersets, circuitos). Descansos curtos. Combine força com gasto calórico elevado.",
    }[p.biotype] || "";

    const sexContext = p.sex === "feminino"
      ? "ALUNA: Priorize membros inferiores (glúteos, posterior de coxa, adutores, abdutor). Inclua: hip thrust, agachamento variado, terra romeno, afundo, abdutora/adutora. Reduza volume de peito/tríceps."
      : "";

    // Local de treino — calistenia completa para casa com lista de exercícios permitidos
    const locationContext = {
      academia: `ACADEMIA — acesso completo a equipamentos. Use máquinas, barras, halteres, cabos, polias.
Exercícios sugeridos (${levelProtocol.label}): ${levelProtocol.examplesAcademia || ""}`,
      
      casa: `🏠 TREINO EM CASA — CALISTENIA PURA — LEIA COM ATENÇÃO
⛔⛔⛔ ABSOLUTAMENTE PROIBIDO — QUALQUER ITEM ABAIXO = TREINO INVÁLIDO:
- Leg press, cadeira extensora, cadeira flexora, hack squat, smith machine
- Polia, cabo, cross-over, TRX comercial
- Barra olímpica, anilhas de academia, supino com barra, agachamento com barra
- Qualquer máquina de academia ou equipamento profissional
- Halter acima de 15kg

✅ ÚNICOS RECURSOS DISPONÍVEIS EM CASA:
- Peso corporal (principal ferramenta)
- Chão, parede, cadeira doméstica, mesa, banco baixo
- Elástico de resistência (se disponível)
- Halteres domésticos leves (até 15kg, se disponível)
- Barra de porta para puxada (se disponível)

BANCO DE EXERCÍCIOS CALISTÊNICOS POR GRUPO (use apenas estes ou variações equivalentes):
• PEITO/EMPURRAR: flexão convencional, flexão diamante, flexão declinada (pés na cadeira), flexão inclinada (mãos na cadeira), flexão archer, pike push-up, dip entre cadeiras
• COSTAS/PUXAR: barra de porta (supinado/pronado), remada invertida embaixo de mesa, face pull com elástico, pull-apart com elástico
• PERNAS: agachamento livre, agachamento búlgaro (pé na cadeira), afundo estático, afundo caminhante, agachamento sumô, elevação de panturrilha, agachamento pistol progressivo, agachamento explosivo (jump squat)
• GLÚTEOS: hip thrust no chão, elevação de quadril unilateral, pontapé com elástico, agachamento sumô com pausa
• OMBROS: pike push-up, handstand wall hold, elevação lateral com elástico, press de ombro com halteres leves
• CORE: prancha frontal, prancha lateral, abdominal crunch, abdominal bicicleta, hollow body hold, mountain climber, leg raise
• BRAÇOS: flexão diamante (tríceps), dip entre cadeiras, rosca com elástico, rosca com halteres leves

EXERCÍCIOS PARA NÍVEL ${levelProtocol.label}: ${levelProtocol.examplesCasa || ""}

Adaptação de intensidade para casa (objetivo: ${p.main_goal}): ${
  p.main_goal === "ganhar_massa" ? "Tempo sob tensão aumentado: fase excêntrica 3-4s, pausa de 2s na contração máxima. Isometria nos fins de série." :
  p.main_goal === "perder_peso" ? "Circuito com mínimo descanso entre exercícios. Adicione burpee ou mountain climber entre séries." :
  p.main_goal === "melhorar_condicionamento" ? "Formato AMRAP (máx reps em 40s) ou Tabata (20s on / 10s off). Circuito de 4-6 exercícios." :
  p.main_goal === "ganhar_forca" ? "Séries de baixas repetições (5-8) com variação mais difícil do exercício. Foco em controle total do movimento." :
  "Progressão sistemática de variações — domine a versão básica antes de avançar."
}`,

      ar_livre: `🌳 AO AR LIVRE — PESO CORPORAL E ESTRUTURAS EXTERNAS
⛔ PROIBIDO: qualquer equipamento de academia
✅ PERMITIDO: chão, barra fixa em praça, paralelas, banco de praça, escadas, peso corporal
EXERCÍCIOS (${levelProtocol.label}): ${levelProtocol.examplesArLivre || ""}`,

      hibrido: `HÍBRIDO (casa + academia): adapte para o dia — exercícios versáteis com ou sem equipamentos.`,
    }[p.training_location] || "";

    return `=== PERFIL DO ALUNO ===
Biotipo: ${p.biotype} → ${biotypeAdaptation}
Objetivo: ${p.main_goal} → ${goalProtocol}
Nível: ${levelProtocol.label} → Volume: ${levelProtocol.volume} | Intensidade: ${levelProtocol.intensity} | ${levelProtocol.rest}
Local: ${p.training_location} | Duração: ${p.session_duration}min | Frequência: ${p.weekly_frequency}x/semana
${sexContext ? `\n${sexContext}` : ""}

=== PROTOCOLO DE NÍVEL ===
${levelProtocol.rules || ""}

=== LOCAL DE TREINO ===
${locationContext}

${injuries}`;
  }

  async function generateWeekPlan(p, u, currentId) {
    const ctx = buildContext(p);
    const trainingDays = p.training_days || [];
    const isHome = p.training_location === "casa";
    const isOutdoor = p.training_location === "ar_livre";
    const level = p.experience_level || "iniciante";

    // Focos musculares por sexo e local
    const focusList = p.sex === "feminino"
      ? ["Glúteos e Posterior de Coxa", "Costas e Bíceps", "Quadríceps e Adutores", "Ombros e Core", "Glúteos e Abdutor/Adutor", "Corpo Todo Foco Inferior", "Posterior Completo"]
      : (isHome || isOutdoor)
        ? ["Empurrar (Peito/Ombro/Tríceps)", "Puxar (Costas/Bíceps)", "Pernas e Glúteos", "Core e Condicionamento", "Corpo Todo Funcional", "Superior Completo", "Inferior e Mobilidade"]
        : ["Peito e Tríceps", "Costas e Bíceps", "Pernas e Glúteos", "Ombros e Core", "Braços e Abdômen", "Corpo Todo", "Costas e Core"];

    // Protocolo de volume por nível
    const levelSpec = {
      iniciante:     { sets: 3, reps: "12-15", rest: 75,  maxEx: 4 },
      intermediario: { sets: 4, reps: "8-12",  rest: 90,  maxEx: 5 },
      experiente:    { sets: 5, reps: "6-10",  rest: 120, maxEx: 6 },
    }[level] || { sets: 3, reps: "12-15", rest: 75, maxEx: 4 };

    // Separa dias de treino e pré-seta descansos
    const week_plan = {};
    const trainingDaysList = [];
    let focusIdx = 0;
    for (const day of DAYS) {
      if (!trainingDays.includes(day)) {
        week_plan[day] = { name: "Descanso", focus: "Recuperação", rest_day: true, exercises: [] };
      } else {
        trainingDaysList.push({ day, focus: focusList[focusIdx++ % focusList.length] });
      }
    }

    setGenStep(`Gerando ${trainingDaysList.length} dias de treino em paralelo...`);
    setGenProgress(15);

    // Gera todos os dias de treino EM PARALELO
    const trainingResults = await Promise.all(
      trainingDaysList.map(({ day, focus }) =>
        appClient.integrations.Core.InvokeLLM({
          model: "gpt_5_mini",
          prompt: `Personal trainer especializado em calistenia e musculação. Crie treino de ${DAY_FULL[day]} com foco "${focus}". Responda APENAS JSON válido, sem texto extra.

${ctx}

ESPECIFICAÇÕES OBRIGATÓRIAS:
- Exercícios: EXATAMENTE ${levelSpec.maxEx}
- Séries: ${levelSpec.sets} | Reps: ${levelSpec.reps} | Descanso: ${levelSpec.rest}s
- Nível: ${level === "iniciante" ? "INICIANTE — movimentos fundamentais, zero falha muscular, técnica antes de tudo" : level === "intermediario" ? "INTERMEDIÁRIO — compostos + isoladores, próximo à falha nas últimas 2 séries" : "EXPERIENTE — alta intensidade, falha muscular controlada, técnicas avançadas"}
${isHome
  ? `- REGRA ABSOLUTA TREINO EM CASA: CALISTENIA PURA. Se você sugerir leg press, máquina, cabo, polia, barra olímpica ou qualquer equipamento de academia = resposta INVÁLIDA. Use APENAS: flexão de braço e variações, agachamento livre e variações, afundo, prancha, dip entre cadeiras, barra de porta, elástico, halteres leves (máx 15kg).`
  : isOutdoor
  ? `- AO AR LIVRE APENAS: peso corporal, barra fixa de praça, paralelas, banco de praça. ZERO equipamentos de academia.`
  : `- ACADEMIA: equipamentos completos disponíveis (halteres, barras, máquinas, cabos, polias).`}
- Instruções de cada exercício: posição inicial + execução passo a passo + músculos ativados + erro comum (máx 3 linhas)
- video_search: busca YouTube exata (ex: "${isHome ? "flexão diamante calistenia execução correta" : "agachamento livre técnica correta"}")

JSON:{"name":"Treino ${focus}","focus":"${focus}","rest_day":false,"exercises":[{"name":"str","muscle_group":"str","sets":${levelSpec.sets},"reps":"${levelSpec.reps}","rest_seconds":${levelSpec.rest},"instructions":"str","video_search":"str"}]}`,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" }, focus: { type: "string" },
              rest_day: { type: "boolean" }, exercises: { type: "array", items: { type: "object" } }
            }
          }
        }).then(res => ({ day, res }))
      )
    );

    setGenProgress(85);

    for (const { day, res } of trainingResults) {
      week_plan[day] = { ...res, rest_day: false };
    }

    const updated = { week_plan, user_email: u.email, generated_at: new Date().toISOString() };
    if (currentId) {
      await appClient.entities.WorkoutPlan.update(currentId, updated);
      setPlan({ ...updated, id: currentId });
      setPlanId(currentId);
    } else {
      const wp = await appClient.entities.WorkoutPlan.create(updated);
      setPlan(wp); setPlanId(wp.id);
    }
  }

  async function handleRegenerateWith(p, u, currentId) {
    setRegenerating(true);
    setGenProgress(5);
    await generateWeekPlan(p, u, currentId);
    setGenProgress(100);
    setRegenerating(false);
  }

  async function handleRegenerate() {
    if (!profile || !user) return;
    setRegenerating(true);
    setGenProgress(5);
    const existing = await appClient.entities.WorkoutPlan.filter({ user_email: user.email });
    if (existing.length > 1) {
      for (let i = 1; i < existing.length; i++) await appClient.entities.WorkoutPlan.delete(existing[i].id);
    }
    await generateWeekPlan(profile, user, planId || existing[0]?.id || null);
    setGenProgress(100);
    setRegenerating(false);
  }

  async function handleReplaceExercise(dayKey, exerciseIdx) {
    if (!profile || !planId || !plan) return;
    const exercise = plan.week_plan[dayKey].exercises[exerciseIdx];
    const allExerciseNames = Object.values(plan.week_plan).flatMap(d => d.exercises?.map(e => e.name) || []).join(", ");
    const isHome = profile.training_location === "casa";
    const isOutdoor = profile.training_location === "ar_livre";
    const level = profile.experience_level || "iniciante";
    const levelSpec = { iniciante: { sets: 3, reps: "12-15", rest: 75 }, intermediario: { sets: 4, reps: "8-12", rest: 90 }, experiente: { sets: 5, reps: "6-10", rest: 120 } }[level];
    const res = await appClient.integrations.Core.InvokeLLM({
      model: "gpt_5_mini",
      prompt: `Personal trainer. Substitua "${exercise.name}" (${exercise.muscle_group}) por exercício DIFERENTE do mesmo grupo muscular. Responda APENAS JSON.

${buildContext(profile)}

NÃO USE NENHUM DESTES: ${allExerciseNames}
${isHome ? "⛔ CASA — CALISTENIA PURA: peso corporal, elástico, halteres leves, cadeira, chão. ZERO leg press, máquina, cabo, barra olímpica ou qualquer equipamento de academia." : isOutdoor ? "⛔ AO AR LIVRE — sem equipamentos de academia." : ""}
Séries=${levelSpec.sets} | Reps=${levelSpec.reps} | Descanso=${levelSpec.rest}s | Nível=${level}

JSON:{"exercise":{"name":"str","muscle_group":"str","sets":${levelSpec.sets},"reps":"${levelSpec.reps}","rest_seconds":${levelSpec.rest},"instructions":"str","video_search":"str"}}`,
      response_json_schema: { type: "object", properties: { exercise: { type: "object" } } }
    });
    const updatedWeekPlan = JSON.parse(JSON.stringify(plan.week_plan));
    updatedWeekPlan[dayKey].exercises[exerciseIdx] = res.exercise;
    await appClient.entities.WorkoutPlan.update(planId, { week_plan: updatedWeekPlan });
    setPlan({ ...plan, week_plan: updatedWeekPlan });
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={36} /></div>;

  const todayIdx = new Date().getDay();
  const dayData = plan?.week_plan?.[selectedDay];

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Plano de Treino</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Treino personalizado para seu biotipo</p>
        </div>
        <button onClick={handleRegenerate} disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {regenerating ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
          {regenerating ? "Gerando..." : "Novo Treino"}
        </button>
      </div>

      {regenerating ? (
        <div className="card-glass p-8 flex flex-col items-center text-center mb-4">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,212,170,0.12), rgba(0,168,255,0.12))", border: "2px solid rgba(0,212,170,0.25)" }}>
              <span className="text-4xl" style={{ display: "inline-block", animation: "workoutPulse 1.5s ease-in-out infinite" }}>💪</span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{ borderTopColor: "#00D4AA", animation: "workoutSpin 1.2s linear infinite" }} />
          </div>

          <p className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Gerando treino personalizado</p>
          <p className="text-sm mb-1 font-medium" style={{ color: "#00D4AA" }}>{genStep || "Analisando seu perfil..."}</p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>Cada dia terá um foco muscular diferente</p>

          <div className="w-full max-w-xs mb-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(genProgress)}%`, background: "linear-gradient(90deg, #00D4AA, #00A8FF)" }} />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {DAYS.map((day, i) => {
              const isTraining = profile?.training_days?.includes(day);
              const stepDone = genProgress >= 85 ? isTraining : false;
              const stepActive = genProgress > 15 && genProgress < 85 && isTraining;
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: stepDone ? "#00D4AA" : stepActive ? "rgba(0,212,170,0.3)" : "var(--bg-surface)",
                      color: stepDone ? "#000" : stepActive ? "#00D4AA" : "var(--text-muted)",
                      border: stepActive ? "2px solid #00D4AA" : "2px solid transparent"
                    }}>
                    {stepDone ? "✓" : (isTraining ? "💪" : "😴")}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{Math.round(genProgress)}% concluído</p>

          <style>{`
            @keyframes workoutSpin { to { transform: rotate(360deg); } }
            @keyframes workoutPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
          `}</style>
        </div>
      ) : plan ? (
        <>
          {/* Day Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {DAYS.map((day, i) => {
              const isToday = i === todayIdx;
              const isSelected = day === selectedDay;
              const isTrainingDay = profile?.training_days?.includes(day);
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl transition-all shrink-0 min-w-[52px] border"
                  style={{
                    background: isSelected ? "#00D4AA" : isToday ? "rgba(0,212,170,0.08)" : "var(--bg-card)",
                    borderColor: isSelected ? "#00D4AA" : isToday ? "rgba(0,212,170,0.3)" : "var(--border-color)",
                    color: isSelected ? "#000" : isToday ? "#00D4AA" : "var(--text-secondary)"
                  }}>
                  <span className="text-[10px] font-medium">{DAY_NAMES[day]}</span>
                  <span className="text-[10px]">{isTrainingDay ? "💪" : "😴"}</span>
                </button>
              );
            })}
          </div>



          {/* Day Content */}
          {dayData ? (
            dayData.rest_day ? (
              <div className="card-glass p-8 text-center">
                <Moon size={40} className="mx-auto mb-3" style={{ color: "#A78BFA" }} />
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Dia de Descanso</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aproveite para recuperar e descansar! 😴</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{DAY_LABELS[selectedDay]}</h2>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{dayData.name}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA" }}>
                      {dayData.exercises?.length || 0} exercícios
                    </span>
                  </div>
                  {profile?.physical_limitations?.length > 0 && (
                    <p className="text-xs mt-2 px-2 py-1 rounded-lg" style={{ background: "rgba(247,129,66,0.1)", color: "#F78142" }}>
                      ⚠️ Adaptado para: {profile.physical_limitations.join(", ")}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {dayData.exercises?.map((exercise, idx) => (
                    <CartaoExercicio
                      key={idx}
                      exercise={exercise}
                      onReplace={() => handleReplaceExercise(selectedDay, idx)}
                    />
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="card-glass p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sem dados para este dia. Regenere o treino.</p>
            </div>
          )}
        </>
      ) : (
        <div className="card-glass p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum plano gerado ainda.</p>
          <button onClick={handleRegenerate} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#00D4AA", color: "#000" }}>
            Gerar Treino
          </button>
        </div>
      )}
    </div>
  );
}
