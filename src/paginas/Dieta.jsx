import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { RefreshCw, Lightbulb, Moon } from "lucide-react";
import CartaoRefeicao from "@/components/dieta/CartaoRefeicao";

const MEAL_ORDER = ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const DAY_LABELS = { DOM: "Domingo", SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado" };
const DAY_NAMES = { DOM: "Dom", SEG: "Seg", TER: "Ter", QUA: "Qua", QUI: "Qui", SEX: "Sex", SAB: "Sáb" };
const DAY_FULL = { DOM: "Domingo", SEG: "Segunda-feira", TER: "Terça-feira", QUA: "Quarta-feira", QUI: "Quinta-feira", SEX: "Sexta-feira", SAB: "Sábado" };

const PROTEIN_VARIATIONS = ["frango grelhado", "peixe assado", "carne bovina magra", "ovos mexidos", "atum", "salmão", "patinho moído"];
const CARB_VARIATIONS = ["arroz integral", "batata doce", "macarrão integral", "quinoa", "aveia", "mandioca", "pão integral"];
const MEAL_TIMING_RULES = `
REGRAS OBRIGATÓRIAS POR HORÁRIO:
- cafe_manha 07:00: comida típica de café da manhã, como ovos, aveia, tapioca, cuscuz, pão integral, iogurte, frutas, queijo cottage, leite ou alternativas permitidas. NÃO use almoço/jantar aqui, como arroz com frango, peixe com legumes, carne com batata ou marmita.
- almoco 12:00: refeição principal de almoço, com proteína magra, carboidrato de base, feijão/leguminosas quando fizer sentido, salada e legumes. Pode usar arroz, batata, mandioca, macarrão, quinoa, frango, peixe, carne magra, ovos ou leguminosas.
- lanche_tarde 15:30: lanche prático de tarde/pré-treino, como iogurte com fruta, vitamina, sanduíche integral, tapioca pequena, fruta com pasta de amendoim, whey/proteína vegetal, aveia ou castanhas. NÃO use prato de almoço completo.
- jantar 19:00: jantar realista, mais leve que almoço quando o objetivo permitir, com proteína, legumes/verduras e carboidrato ajustado à meta. Evite café da manhã no jantar.
- ceia 21:30: refeição leve antes de dormir, focada em proteína e saciedade, como iogurte proteico, cottage, caseína/whey, leite, ovos, tofu, abacate, chia ou castanhas. NÃO use arroz, feijão, macarrão, carne com batata ou prato pesado.
Cada refeição deve parecer natural para o horário, mas ainda bater as calorias e macros definidos.`;
const DAY_MEAL_VARIETY = {
  DOM: {
    cafe_manha: "omelete com tapioca e mamão",
    almoco: "frango grelhado, arroz integral, feijão e salada",
    lanche_tarde: "iogurte com banana, aveia e castanhas",
    jantar: "peixe assado com legumes e batata doce",
    ceia: "cottage ou iogurte proteico com chia",
  },
  SEG: {
    cafe_manha: "overnight oats com iogurte, banana e chia",
    almoco: "patinho moído, mandioca, feijão e legumes",
    lanche_tarde: "sanduíche integral com atum e fruta",
    jantar: "frango desfiado com quinoa e salada",
    ceia: "leite ou proteína vegetal com abacate",
  },
  TER: {
    cafe_manha: "cuscuz com ovos mexidos e fruta",
    almoco: "peixe grelhado, arroz, lentilha e salada",
    lanche_tarde: "vitamina de fruta com aveia e proteína",
    jantar: "carne magra com abobrinha e purê de batata",
    ceia: "ovos cozidos ou tofu com chia",
  },
  QUA: {
    cafe_manha: "pão integral com ovos e queijo cottage",
    almoco: "frango, macarrão integral e legumes",
    lanche_tarde: "tapioca pequena com queijo ou frango",
    jantar: "omelete com legumes e salada",
    ceia: "iogurte natural com linhaça",
  },
  QUI: {
    cafe_manha: "panqueca de banana com aveia e ovos",
    almoco: "salmão ou peixe, batata inglesa e salada",
    lanche_tarde: "fruta com pasta de amendoim e whey",
    jantar: "frango com legumes salteados e arroz integral",
    ceia: "cottage com castanhas",
  },
  SEX: {
    cafe_manha: "tapioca com ovos e vitamina de fruta",
    almoco: "carne bovina magra, arroz, feijão e salada",
    lanche_tarde: "iogurte com granola e morangos",
    jantar: "tilápia ou tofu com legumes e quinoa",
    ceia: "caseína, iogurte proteico ou leite com chia",
  },
  SAB: {
    cafe_manha: "mingau de aveia com banana e proteína",
    almoco: "frango ou grão-de-bico, batata doce e salada",
    lanche_tarde: "wrap integral com proteína e fruta",
    jantar: "sopa proteica com legumes e frango desfiado",
    ceia: "abacate com chia ou iogurte proteico",
  },
};

export default function Dieta() {
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
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("Dieta")); return; }
    setUser(u);
    const [profiles, diets] = await Promise.all([
      appClient.entities.UserProfile.filter({ user_email: u.email }),
      appClient.entities.DietPlan.filter({ user_email: u.email })
    ]);
    if (profiles.length) setProfile(profiles[0]);
    if (diets.length) {
      setPlan(diets[0]);
      setPlanId(diets[0].id);
    }
    setLoading(false);
  }

  // Calcula TDEE base puro (Mifflin-St Jeor + atividade + biotipo)
  function calcTDEE(p) {
    const weight = p.weight || 70;
    const height = p.height || 170;
    const age = p.age || 25;
    const sex = p.sex || "masculino";
    const freq = p.weekly_frequency || 3;

    // Mifflin-St Jeor
    const tmb = sex === "feminino"
      ? (10 * weight) + (6.25 * height) - (5 * age) - 161
      : (10 * weight) + (6.25 * height) - (5 * age) + 5;

    // Fator de atividade físico mais preciso
    const activityFactor = freq <= 1 ? 1.2 : freq <= 3 ? 1.375 : freq <= 5 ? 1.55 : 1.725;

    // Biotipo ajusta metabolismo
    const biotypeMultiplier = { ectomorfo: 1.08, mesomorfo: 1.00, endomorfo: 0.95 };

    // Piso mínimo de segurança: ninguém deve ficar abaixo de 1400 kcal (F) / 1600 kcal (M)
    const minTDEE = sex === "feminino" ? 1400 : 1600;
    return Math.max(minTDEE, Math.round(tmb * activityFactor * (biotypeMultiplier[p.biotype] || 1.0)));
  }

  /**
   * Calcula macros para um dia específico seguindo periodização nutricional real.
   * dayVariation: número de -1 a +1 para aplicar variação individual por dia (evita dias iguais)
   */
  function calcDietParams(p, isTrainingDay = false, dayVariation = 0) {
    const weight = p.weight || 70;
    const height = p.height || 170;
    const sex = p.sex || "masculino";
    const imc = weight / ((height / 100) ** 2);
    const tdeeBase = calcTDEE(p);

    // Superávit/déficit por objetivo — valores revisados para evitar subestimação
    const goalSurplusMap = {
      perder_peso:              -0.18,  // déficit 18% (não mais que 20% — preserva músculo)
      ganhar_massa:             +0.18,  // superávit 18% — AUMENTADO para garantir hipertrofia real
      manter_forma:              0.00,
      melhorar_condicionamento: +0.08,
      ganhar_forca:             +0.12,
    };

    let surplusPct = goalSurplusMap[p.main_goal] ?? 0;

    // Ectomorfo hardgainer: superávit extra
    if (p.biotype === "ectomorfo") {
      if (p.main_goal === "ganhar_massa") surplusPct += 0.10;
      if (p.main_goal === "ganhar_forca") surplusPct += 0.06;
    }

    let avgWeeklyCals = Math.round(tdeeBase * (1 + surplusPct));

    // PISOS CALÓRICOS MÍNIMOS — evita subalimentação independente do perfil
    const floorByGoal = {
      ganhar_massa:             sex === "feminino" ? 2000 : 2200,
      ganhar_forca:             sex === "feminino" ? 1900 : 2100,
      melhorar_condicionamento: sex === "feminino" ? 1700 : 1900,
      manter_forma:             sex === "feminino" ? 1500 : 1700,
      perder_peso:              sex === "feminino" ? 1300 : 1500,
    }[p.main_goal] ?? (sex === "feminino" ? 1500 : 1700);

    avgWeeklyCals = Math.max(avgWeeklyCals, floorByGoal);

    // Periodização treino vs descanso
    const deltaTrainingPct = {
      perder_peso:              0.05,
      ganhar_massa:             0.10,
      manter_forma:             0.07,
      melhorar_condicionamento: 0.12,
      ganhar_forca:             0.10,
    }[p.main_goal] ?? 0.07;

    const deltaMult = p.biotype === "endomorfo" ? 0.6 : p.biotype === "ectomorfo" ? 1.2 : 1.0;
    const delta = deltaTrainingPct * deltaMult;

    // Variação individual por dia: ±5% para que cada dia tenha kcal distintas
    const dayDelta = dayVariation * 0.05;

    const totalCals = isTrainingDay
      ? Math.round(avgWeeklyCals * (1 + delta + dayDelta))
      : Math.round(avgWeeklyCals * (1 - delta + dayDelta));

    // PROTEÍNA — estável (não varia treino/descanso)
    const proteinPerKg = {
      perder_peso: 2.3,
      ganhar_massa: 2.2,
      manter_forma: 1.9,
      melhorar_condicionamento: 2.0,
      ganhar_forca: 2.4,
    }[p.main_goal] ?? 2.0;
    const proteinG = Math.round(weight * proteinPerKg);
    const proteinCals = proteinG * 4;

    // GORDURA — estável (~25% treino, ~28% descanso)
    const fatPct = isTrainingDay ? 0.25 : 0.28;
    const fatG = Math.round((totalCals * fatPct) / 9);
    const fatCals = fatG * 9;

    // CARBOIDRATO — variável de ajuste (restante das calorias)
    const carbCals = Math.max(0, totalCals - proteinCals - fatCals);
    const carbG = Math.max(0, Math.round(carbCals / 4));

    return {
      tdee: tdeeBase,
      avgWeeklyCals,
      totalCals,
      proteinG,
      carbG,
      fatG,
      imc: imc.toFixed(1),
      isTrainingDay,
    };
  }

  function buildContext(p, isTrainingDay = false) {
    const restrictions = p.food_restrictions?.length > 0
      ? `⛔ PROIBIDO ABSOLUTAMENTE (não use nem derivados): ${p.food_restrictions.join(", ")}.`
      : "Sem restrições alimentares.";

    const limitations = p.physical_limitations?.length > 0
      ? `⚠️ Limitações físicas: ${p.physical_limitations.join(", ")} — adapte alimentos que possam agravar inflamação nessas regiões.`
      : "";

    const locationNote = {
      academia: "Treina em academia — acesso completo a equipamentos. Pode incluir whey protein, suplementos pré-treino.",
      casa: "Treina em casa — sem suplementos específicos necessários. Foco em alimentos naturais.",
      ar_livre: "Treina ao ar livre — atividade cardiorrespiratória intensa. Carboidratos de rápida digestão no pré-treino.",
      hibrido: "Treino híbrido (academia + outros). Nutrição adaptada a intensidade variável.",
    }[p.training_location] || "";

    const { totalCals, proteinG, carbG, fatG, imc, tdee, avgWeeklyCals } = calcDietParams(p, isTrainingDay);
    const weight = p.weight || 70;
    const height = p.height || 170;
    const bmi = (weight / ((height/100)**2)).toFixed(1);

    // Biotipo — impacto real na prescrição
    const biotypeGuidance = {
      ectomorfo: `ECTOMORFO — HARDGAINER CONFIRMADO
• Metabolismo basal acelerado: queima calorias em repouso acima da média
• Dificuldade comprovada de ganho de peso e massa muscular
• ESTRATÉGIA OBRIGATÓRIA: alta densidade calórica em TODAS as refeições, sem exceção
• Porções GRANDES — o paciente não pode sentir fome em nenhum momento do dia
• Priorizar alimentos energeticamente densos: arroz branco (absorção rápida), macarrão, batata inglesa, mandioca, banana, leite integral (3,5% gordura), ovo inteiro, amendoim, azeite extra-virgem, aveia com mel, granola, abacate
• Refeições a cada 3h — manutenção do anabolismo proteico
• Ceia OBRIGATÓRIA e calórica (não apenas iogurte — deve ter proteína + carbo)`,

      mesomorfo: `MESOMORFO — RESPOSTA EFICIENTE AO TREINO
• Metabolismo equilibrado, composição corporal naturalmente favorável
• Boa sensibilidade à insulina — tolera bem carboidratos em horários estratégicos
• Superávit moderado e controlado
• Periodização treino/descanso clara mas sem extremos
• Equilíbrio entre proteínas, carboidratos complexos e gorduras saudáveis`,

      endomorfo: `ENDOMORFO — CONTROLE METABÓLICO RIGOROSO
• Metabolismo mais lento, maior tendência ao acúmulo de gordura corporal
• Resistência insulínica leve — carboidratos simples devem ser evitados
• Carboidratos concentrados nos horários de maior atividade (pré e pós-treino)
• Nos dias de descanso: carboidratos MUITO reduzidos, foco em proteínas, fibras e gorduras saudáveis
• Priorizar carboidratos de baixo índice glicêmico: batata doce, arroz integral, aveia, leguminosas
• Gorduras saudáveis aumentam saciedade e preservam massa muscular`,
    }[p.biotype] || "";

    // Objetivo — protocolo clínico específico
    const goalProtocol = {
      perder_peso: {
        label: "EMAGRECIMENTO — DÉFICIT CALÓRICO CONTROLADO",
        protocol: `TDEE: ${tdee}kcal → Alvo: ${totalCals}kcal (déficit de ${tdee - totalCals}kcal = ${Math.round((tdee - totalCals)/tdee*100)}%)
Proteína ALTA e ESTÁVEL (${Math.round(proteinG/weight)}g/kg) — protege massa muscular no déficit
Carboidratos ESTRATÉGICOS: maiores no treino para performance, menores no descanso para acelerar oxidação de gordura
Gordura: estável, moderada — suporte hormonal e saciedade
Evitar: açúcar simples, ultraprocessados, álcool, frituras, bebidas calóricas
Incluir: vegetais fibrosos em TODAS as refeições (brócolis, couve, espinafre, abobrinha, pepino)`,
        timingNote: isTrainingDay
          ? "PRÉ-TREINO (60-90min antes): carboidrato de baixo a médio IG + proteína magra. PÓS-TREINO (até 40min): proteína de rápida absorção + carbo simples para reparação."
          : "DESCANSO: distribuir proteína uniformemente ao longo do dia. Reduzir carboidratos no jantar e ceia — foco em proteína + vegetais + gordura saudável.",
      },
      ganhar_massa: {
        label: "HIPERTROFIA MUSCULAR — SUPERÁVIT CALÓRICO PERIODIZADO",
        protocol: `TDEE: ${tdee}kcal → Média semanal: ${avgWeeklyCals}kcal → HOJE (${isTrainingDay ? "DIA DE TREINO" : "DIA DE DESCANSO"}): ${totalCals}kcal
Proteína ESTÁVEL todos os dias: ${proteinG}g (${Math.round(proteinG/weight)}g/kg) — síntese proteica muscular contínua
Carboidratos: ${isTrainingDay ? `ALTOS (${carbG}g) — combustível para treino intenso e reposição de glicogênio muscular` : `MODERADOS (${carbG}g) — suporte à recuperação sem excesso calórico`}
Gordura: ${isTrainingDay ? `${fatG}g (leve redução para dar espaço ao carbo)` : `${fatG}g (levemente maior — suporte hormonal na recuperação)`}
Refeições NUNCA devem ser puladas — anabolismo exige ingestão frequente`,
        timingNote: isTrainingDay
          ? "PRÉ-TREINO (60-90min antes): refeição completa com arroz/macarrão/batata + proteína. Ou lanche rápido 30min antes: banana + whey/ovo. PÓS-TREINO (até 30min): proteína de alto valor biológico + carbo de absorção rápida (arroz branco, banana, batata inglesa)."
          : "DESCANSO: foco em recuperação muscular. Proteína distribuída em 4-5 refeições. Carboidratos concentrados no café da manhã e almoço. Jantar e ceia: proteína + gordura + vegetais.",
      },
      manter_forma: {
        label: "MANUTENÇÃO DE COMPOSIÇÃO CORPORAL",
        protocol: `TDEE: ${tdee}kcal → Alvo: ${totalCals}kcal (equilíbrio calórico)
Proteína ESTÁVEL: ${proteinG}g — preservação da massa magra
Carboidratos periodizados: maiores no treino, menores no descanso
Gordura: estável — saúde hormonal e cardiovascular
Variedade alimentar: pilar fundamental para micronutrientes e adesão`,
        timingNote: isTrainingDay
          ? "PRÉ-TREINO: carboidrato complexo + proteína. PÓS-TREINO: proteína + carbo leve."
          : "Distribuição equilibrada ao longo do dia. Jantar mais leve em carboidratos.",
      },
      melhorar_condicionamento: {
        label: "CONDICIONAMENTO AERÓBICO E RESISTÊNCIA",
        protocol: `TDEE: ${tdee}kcal → Alvo: ${totalCals}kcal
CARBOIDRATOS são o combustível primário para exercício aeróbico — prioridade máxima no pré-treino
Proteína estável: ${proteinG}g — recuperação muscular e imunidade
Hidratação: fundamental — incluir orientação sobre água nas refeições
Gordura: moderada — não deve competir com carboidratos`,
        timingNote: isTrainingDay
          ? "PRÉ-TREINO (30-60min antes): carboidrato de rápida digestão (banana, tâmaras, arroz branco, tapioca). DURANTE treino longo (+60min): banana ou gel energético. PÓS-TREINO: proteína + carbo para glicogênio."
          : "Refeições equilibradas, menor volume calórico. Manter ingestão de carboidratos suficiente para reposição de glicogênio.",
      },
      ganhar_forca: {
        label: "GANHO DE FORÇA MÁXIMA E POTÊNCIA",
        protocol: `TDEE: ${tdee}kcal → Alvo: ${totalCals}kcal
Proteína ALTA: ${proteinG}g/dia (${Math.round(proteinG/weight)}g/kg) — reparação de fibras musculares em treino de força intensa
Carboidratos ALTOS no treino: ${isTrainingDay ? carbG : "reduzidos"}g — energia para levantamentos máximos
Gordura: ${fatG}g — FUNDAMENTAL para produção de testosterona e suporte hormonal anabólico
Carne vermelha magra: fonte de creatina natural, zinco e ferro — incluir 3-4x/semana`,
        timingNote: isTrainingDay
          ? "PRÉ-TREINO (90-120min antes): refeição completa com proteína de alto valor biológico + carboidrato complexo. Evitar gordura em excesso pré-treino (retarda esvaziamento gástrico). PÓS-TREINO imediato: proteína + carbo para ressíntese de glicogênio e reparo muscular."
          : "DESCANSO: proteína distribuída uniformemente (a cada 3-4h). Maior ingestão de gorduras saudáveis (azeite, abacate, castanhas) para suporte hormonal.",
      },
    }[p.main_goal] || { label: "MANUTENÇÃO", protocol: "", timingNote: "" };

    return `=== FICHA NUTRICIONAL DO PACIENTE ===
Sexo: ${p.sex} | Idade: ${p.age} anos | Peso: ${p.weight}kg | Altura: ${p.height}cm | IMC: ${bmi}
Experiência: ${p.experience_level} | Treinos: ${p.weekly_frequency}x/semana, ${p.session_duration}min/sessão
Local de treino: ${p.training_location || "não informado"} ${locationNote ? `→ ${locationNote}` : ""}
TDEE (Mifflin-St Jeor × fator atividade × biotipo): ${tdee}kcal/dia

=== BIOTIPO: ${p.biotype?.toUpperCase()} ===
${biotypeGuidance}

=== OBJETIVO: ${goalProtocol.label} ===
${goalProtocol.protocol}

=== TIMING NUTRICIONAL PARA ESTE DIA ===
${goalProtocol.timingNote}

=== DIA: ${isTrainingDay ? "⚡ TREINO — CARBOIDRATOS ELEVADOS" : "😴 DESCANSO — CARBOIDRATOS REDUZIDOS"} ===

=== METAS NUTRICIONAIS EXATAS — NÃO ALTERE ===
🔥 CALORIAS TOTAIS: ${totalCals}kcal
💪 PROTEÍNA: ${proteinG}g (${Math.round(proteinG/weight)}g/kg) — IDÊNTICA em todos os dias da semana
🍚 CARBOIDRATOS: ${carbG}g — ${isTrainingDay ? "↑ ALTO (combustível de treino)" : "↓ BAIXO (recuperação sem excesso)"}
🥑 GORDURAS: ${fatG}g — relativamente estável

${limitations}

=== RESTRIÇÕES ALIMENTARES ===
${restrictions}`;
  }

  function buildDayPrompt(day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx, usedFoods, p = profile) {
    const mealCals = isTraining ? {
      cafe_manha: Math.round(targetCals * 0.20),
      almoco:     Math.round(targetCals * 0.33),
      lanche_tarde: Math.round(targetCals * 0.17),
      jantar:     Math.round(targetCals * 0.25),
      ceia:       Math.round(targetCals * 0.05),
    } : {
      cafe_manha: Math.round(targetCals * 0.22),
      almoco:     Math.round(targetCals * 0.35),
      lanche_tarde: Math.round(targetCals * 0.13),
      jantar:     Math.round(targetCals * 0.25),
      ceia:       Math.round(targetCals * 0.05),
    };

    const mealMacros = {
      cafe_manha:   { protein: Math.round(proteinG * 0.22), carbs: Math.round(carbG * 0.25), fat: Math.round(fatG * 0.20) },
      almoco:       { protein: Math.round(proteinG * 0.30), carbs: Math.round(carbG * 0.35), fat: Math.round(fatG * 0.25) },
      lanche_tarde: { protein: Math.round(proteinG * 0.15), carbs: Math.round(carbG * (isTraining ? 0.22 : 0.15)), fat: Math.round(fatG * 0.15) },
      jantar:       { protein: Math.round(proteinG * 0.25), carbs: Math.round(carbG * (isTraining ? 0.15 : 0.20)), fat: Math.round(fatG * 0.28) },
      ceia:         { protein: Math.round(proteinG * 0.08), carbs: Math.round(carbG * 0.03), fat: Math.round(fatG * 0.12) },
    };

    const avoidStr = usedFoods.length > 0
      ? `ALIMENTOS JÁ USADOS EM OUTROS DIAS DA SEMANA — EVITE REPETIR, EXCETO itens básicos em pequena quantidade: ${usedFoods.slice(0, 60).join(", ")}`
      : "Escolha os alimentos que melhor se encaixam no objetivo e biotipo.";
    const dayVariety = DAY_MEAL_VARIETY[day] || DAY_MEAL_VARIETY.SEG;
    const varietyStr = Object.entries(dayVariety)
      .map(([meal, suggestion]) => `${meal}: ${suggestion}`)
      .join(" | ");

    return {
      mealCals,
      prompt: `Nutricionista esportivo. Plano alimentar ${DAY_FULL[day]} (${isTraining ? "DIA TREINO" : "DIA DESCANSO"}). Responda SOMENTE JSON.
Perfil: ${p.sex}, ${p.age}a, ${p.weight}kg, ${p.height}cm, ${p.biotype}, objetivo: ${p.main_goal}.
META: ${targetCals}kcal | P:${proteinG}g | C:${carbG}g | G:${fatG}g
Distribuição: café=${mealCals.cafe_manha}kcal | almoço=${mealCals.almoco}kcal | lanche=${mealCals.lanche_tarde}kcal | jantar=${mealCals.jantar}kcal | ceia=${mealCals.ceia}kcal
${p.food_restrictions?.length ? `PROIBIDO: ${p.food_restrictions.join(", ")}` : ""}
${avoidStr}
SUGESTÕES DE VARIEDADE PARA ESTE DIA (use como inspiração, ajustando macros e restrições): ${varietyStr}
${MEAL_TIMING_RULES}
Regras: quantidades em gramas exatas, alimentos brasileiros reais, sem repetir ingredientes no mesmo dia, sem repetir o mesmo cardápio dos outros dias e sem colocar comida de almoço no café da manhã/ceia.
JSON:{"daily_plan":{"cafe_manha":{"name":"str","time":"07:00","calories":${mealCals.cafe_manha},"protein":${mealMacros.cafe_manha.protein},"carbs":${mealMacros.cafe_manha.carbs},"fat":${mealMacros.cafe_manha.fat},"ingredients":[{"name":"str","quantity":"Xg","calories":0,"protein":0,"carbs":0,"fat":0}]},"almoco":{"name":"str","time":"12:00","calories":${mealCals.almoco},"protein":${mealMacros.almoco.protein},"carbs":${mealMacros.almoco.carbs},"fat":${mealMacros.almoco.fat},"ingredients":[{"name":"str","quantity":"Xg","calories":0,"protein":0,"carbs":0,"fat":0}]},"lanche_tarde":{"name":"str","time":"15:30","calories":${mealCals.lanche_tarde},"protein":${mealMacros.lanche_tarde.protein},"carbs":${mealMacros.lanche_tarde.carbs},"fat":${mealMacros.lanche_tarde.fat},"ingredients":[{"name":"str","quantity":"Xg","calories":0,"protein":0,"carbs":0,"fat":0}]},"jantar":{"name":"str","time":"19:00","calories":${mealCals.jantar},"protein":${mealMacros.jantar.protein},"carbs":${mealMacros.jantar.carbs},"fat":${mealMacros.jantar.fat},"ingredients":[{"name":"str","quantity":"Xg","calories":0,"protein":0,"carbs":0,"fat":0}]},"ceia":{"name":"str","time":"21:30","calories":${mealCals.ceia},"protein":${mealMacros.ceia.protein},"carbs":${mealMacros.ceia.carbs},"fat":${mealMacros.ceia.fat},"ingredients":[{"name":"str","quantity":"Xg","calories":0,"protein":0,"carbs":0,"fat":0}]}},"total_calories":${targetCals},"protein_grams":${proteinG},"carbs_grams":${carbG},"fat_grams":${fatG},"main_protein":"str","main_carb":"str"}`,
      schema: {
        type: "object",
        properties: {
          daily_plan: { type: "object" },
          total_calories: { type: "number" },
          protein_grams: { type: "number" },
          carbs_grams: { type: "number" },
          fat_grams: { type: "number" },
          main_protein: { type: "string" },
          main_carb: { type: "string" }
        }
      }
    };
  }

  async function handleRegenerate() {
    if (!profile || !user || regenerating) return;
    setRegenerating(true);
    setGenProgress(2);
    setGenStep("Preparando plano semanal...");

    // Timeout de segurança: se demorar mais de 3 min, sai do estado de loading
    const safetyTimeout = setTimeout(() => {
      setRegenerating(false);
      setGenProgress(0);
    }, 180000);

    const trainingDays = profile.training_days || [];

    // Variações únicas por dia para evitar calorias idênticas entre dias do mesmo tipo
    // Distribui de forma que a média semanal seja mantida (soma ≈ 0)
    const dayVariations = {
      DOM: -0.6,
      SEG: +0.8,
      TER: -0.2,
      QUA: +1.0,
      QUI: -0.8,
      SEX: +0.4,
      SAB: -0.6,
    };

    // Pré-calcula contexto e params para cada dia com variação individual
    const dayConfigs = DAYS.map(day => {
      const isTraining = trainingDays.includes(day);
      const variation = dayVariations[day] ?? 0;
      const { totalCals: targetCals, proteinG, carbG, fatG } = calcDietParams(profile, isTraining, variation);
      const dayCtx = buildContext(profile, isTraining);
      return { day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx };
    });

    const weeklyAvoids = dayConfigs.reduce((acc, config) => {
      const suggestions = Object.values(DAY_MEAL_VARIETY[config.day] || {});
      acc[config.day] = suggestions;
      return acc;
    }, {});

    // Gera os 7 dias em 2 batches para reduzir timeout
    setGenStep("Gerando dias 1-4...");
    setGenProgress(10);

    const batch1 = dayConfigs.slice(0, 4);
    const batch2 = dayConfigs.slice(4);

    const results1 = await Promise.all(
      batch1.map(({ day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx }) => {
        const usedFoods = Object.entries(weeklyAvoids)
          .filter(([otherDay]) => otherDay !== day)
          .flatMap(([, foods]) => foods);
        const { prompt, schema } = buildDayPrompt(day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx, usedFoods);
        return appClient.integrations.Core.InvokeLLM({ model: "gpt_5_mini", prompt, response_json_schema: schema })
          .then(res => ({ day, res }));
      })
    );

    setGenProgress(55);
    setGenStep("Gerando dias 5-7...");

    const results2 = await Promise.all(
      batch2.map(({ day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx }) => {
        const usedFoods = Object.entries(weeklyAvoids)
          .filter(([otherDay]) => otherDay !== day)
          .flatMap(([, foods]) => foods);
        const { prompt, schema } = buildDayPrompt(day, isTraining, targetCals, proteinG, carbG, fatG, dayCtx, usedFoods);
        return appClient.integrations.Core.InvokeLLM({ model: "gpt_5_mini", prompt, response_json_schema: schema })
          .then(res => ({ day, res }));
      })
    );

    const allResults = [...results1, ...results2];

    setGenProgress(82);
    setGenStep("Finalizando plano...");

    const week_plan = {};
    for (const { day, res } of allResults) {
      week_plan[day] = {
        daily_plan: res.daily_plan,
        total_calories: res.total_calories,
        protein_grams: res.protein_grams,
        carbs_grams: res.carbs_grams,
        fat_grams: res.fat_grams
      };
    }

    setGenStep("Gerando dicas de saúde...");
    setGenProgress(88);

    const restrictionsStr = profile.food_restrictions?.length > 0
      ? `O paciente tem as seguintes restrições alimentares: ${profile.food_restrictions.join(", ")}. As dicas NÃO devem mencionar, sugerir ou pressupor o consumo desses alimentos.`
      : "Sem restrições alimentares específicas.";

    const { tdee: tdeeForTips, proteinG: pG, carbG: cG, fatG: fG } = calcDietParams(profile, true);
    const tipsRes = await appClient.integrations.Core.InvokeLLM({
      model: "gpt_5_mini",
      prompt: `Nutricionista esportivo. 5 dicas práticas e personalizadas para: ${profile.sex}, ${profile.age}a, ${profile.weight}kg, ${profile.biotype}, objetivo ${profile.main_goal}, treino ${profile.weekly_frequency}x/sem. TDEE:${tdeeForTips}kcal, proteína:${pG}g/dia. Restrições:${profile.food_restrictions?.join(",")||"nenhuma"}. Dicas objetivas, numéricas quando possível, sem mencionar alimentos proibidos. JSON: {"health_tips":["dica 1","dica 2","dica 3","dica 4","dica 5"]}`,
      response_json_schema: { type: "object", properties: { health_tips: { type: "array", items: { type: "string" } } } }
    });

    setGenProgress(95);

    const updated = { week_plan, health_tips: tipsRes.health_tips || [], user_email: user.email, generated_at: new Date().toISOString() };

    const existingDiets = await appClient.entities.DietPlan.filter({ user_email: user.email });
    // Limpa duplicatas
    if (existingDiets.length > 1) {
      for (let i = 1; i < existingDiets.length; i++) {
        await appClient.entities.DietPlan.delete(existingDiets[i].id);
      }
    }
    const currentId = planId || existingDiets[0]?.id;
    let savedPlan;
    if (currentId) {
      await appClient.entities.DietPlan.update(currentId, updated);
      savedPlan = { ...updated, id: currentId };
    } else {
      savedPlan = await appClient.entities.DietPlan.create(updated);
    }
    // Força re-render limpando estado antes de setar novo plano
    setPlan(null);
    setPlanId(null);
    await new Promise(r => setTimeout(r, 0));
    setPlan(savedPlan);
    setPlanId(savedPlan.id);
    setGenProgress(100);
    clearTimeout(safetyTimeout);
    setRegenerating(false);
  }

  async function handleReplaceMeal(mealKey) {
    if (!profile || !planId || !dayPlan) return;
    const currentIngredients = Object.entries(dayPlan)
      .filter(([k]) => k !== mealKey)
      .flatMap(([, m]) => m.ingredients?.map(i => i.name) || []).join(", ");
    const restrictions = profile.food_restrictions?.length > 0 ? `PROIBIDO: ${profile.food_restrictions.join(", ")}.` : "";
    const isTraining = profile?.training_days?.includes(selectedDay);
    const res = await appClient.integrations.Core.InvokeLLM({
      prompt: `Substitua a refeição "${mealKey}" por alternativa equivalente. Perfil: ${buildContext(profile, isTraining)}. ${restrictions} NÃO use os mesmos alimentos já presentes nas outras refeições do dia: ${currentIngredients}. ${MEAL_TIMING_RULES} A nova refeição deve ser adequada especificamente ao horário de "${mealKey}". JSON: {"meal":{"name":"str","time":"str","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[{"name":"str","quantity":"str","calories":0,"protein":0,"carbs":0,"fat":0}]}}`,
      response_json_schema: { type: "object", properties: { meal: { type: "object" } } }
    });
    const updatedWeekPlan = JSON.parse(JSON.stringify(plan.week_plan));
    const updatedDayPlan = updatedWeekPlan[selectedDay].daily_plan;
    updatedDayPlan[mealKey] = res.meal;
    const recalc = recalcTotals(updatedDayPlan);
    updatedWeekPlan[selectedDay] = { ...updatedWeekPlan[selectedDay], ...recalc };
    await appClient.entities.DietPlan.update(planId, { week_plan: updatedWeekPlan });
    setPlan({ ...plan, week_plan: updatedWeekPlan });
  }

  async function handleReplaceIngredient(mealKey, ingredient, idx) {
    if (!profile || !planId || !plan?.week_plan?.[selectedDay]) return;
    const dayData = plan.week_plan[selectedDay];
    const currentDayPlan = dayData?.daily_plan;
    if (!currentDayPlan) return;
    const allIngredients = Object.values(currentDayPlan).flatMap(m => m.ingredients?.map(i => i.name) || []).join(", ");
    const restrictions = profile.food_restrictions?.length > 0 ? `PROIBIDO: ${profile.food_restrictions.join(", ")}.` : "";
    const isTraining2 = profile?.training_days?.includes(selectedDay);
    const res = await appClient.integrations.Core.InvokeLLM({
      prompt: `Substitua "${ingredient.name}" (${ingredient.quantity}, ${ingredient.calories}kcal) por equivalente DIFERENTE e adequado para a refeição "${mealKey}". Perfil: ${buildContext(profile, isTraining2)}. ${restrictions} NÃO use nenhum destes ingredientes já no plano: ${allIngredients}. ${MEAL_TIMING_RULES} JSON: {"ingredient":{"name":"str","quantity":"str","calories":0,"protein":0,"carbs":0,"fat":0}}`,
      response_json_schema: { type: "object", properties: { ingredient: { type: "object" } } }
    });
    const updatedWeekPlan = JSON.parse(JSON.stringify(plan.week_plan));
    const updatedDayPlan = updatedWeekPlan[selectedDay].daily_plan;
    updatedDayPlan[mealKey].ingredients[idx] = res.ingredient;
    const mealTotals = recalcMeal(updatedDayPlan[mealKey].ingredients);
    updatedDayPlan[mealKey] = { ...updatedDayPlan[mealKey], ...mealTotals };
    const recalc = recalcTotals(updatedDayPlan);
    updatedWeekPlan[selectedDay] = { ...updatedWeekPlan[selectedDay], ...recalc };
    await appClient.entities.DietPlan.update(planId, { week_plan: updatedWeekPlan });
    setPlan({ ...plan, week_plan: updatedWeekPlan });
  }

  function recalcMeal(ingredients) {
    return {
      calories: ingredients.reduce((s, i) => s + (i.calories || 0), 0),
      protein: ingredients.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: ingredients.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: ingredients.reduce((s, i) => s + (i.fat || 0), 0)
    };
  }

  function recalcTotals(dp) {
    const meals = Object.values(dp);
    return {
      total_calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
      protein_grams: meals.reduce((s, m) => s + (m.protein || 0), 0),
      carbs_grams: meals.reduce((s, m) => s + (m.carbs || 0), 0),
      fat_grams: meals.reduce((s, m) => s + (m.fat || 0), 0)
    };
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen" style={{ color: "var(--text-primary)" }}>Carregando...</div>;

  const hasWeekPlan = plan?.week_plan && Object.keys(plan.week_plan).length > 0;
  const dayData = hasWeekPlan ? plan.week_plan[selectedDay] : null;
  const dayPlan = dayData?.daily_plan || ((!hasWeekPlan && plan?.daily_plan) ? plan.daily_plan : null);

  const mealsArr = dayPlan ? Object.values(dayPlan) : [];
  const calcCals = mealsArr.reduce((s, m) => s + (m.calories || 0), 0);
  const dayTotalCalories = calcCals > 0 ? calcCals : (dayData?.total_calories || 0);

  // Usa os valores reais salvos no plano do dia selecionado
  const displayProtein = dayData?.protein_grams ?? (mealsArr.reduce((s, m) => s + (m.protein || 0), 0));
  const displayCarbs = dayData?.carbs_grams ?? (mealsArr.reduce((s, m) => s + (m.carbs || 0), 0));
  const displayFat = dayData?.fat_grams ?? (mealsArr.reduce((s, m) => s + (m.fat || 0), 0));
  const displayCals = dayTotalCalories;
  const isSelectedTraining = profile?.training_days?.includes(selectedDay);

  const totalKcalFromMacros = (displayProtein * 4) + (displayCarbs * 4) + (displayFat * 9);
  const macros = totalKcalFromMacros > 0 ? [
    { label: "Proteína", grams: displayProtein, color: "#A78BFA", pct: Math.round(((displayProtein * 4) / totalKcalFromMacros) * 100) },
    { label: "Carboidratos", grams: displayCarbs, color: "#F59E0B", pct: Math.round(((displayCarbs * 4) / totalKcalFromMacros) * 100) },
    { label: "Gorduras", grams: displayFat, color: "#FF6B35", pct: Math.round(((displayFat * 9) / totalKcalFromMacros) * 100) }
  ] : [
    { label: "Proteína", grams: 0, color: "#A78BFA", pct: 33 },
    { label: "Carboidratos", grams: 0, color: "#F59E0B", pct: 34 },
    { label: "Gorduras", grams: 0, color: "#FF6B35", pct: 33 }
  ];

  const todayIdx = new Date().getDay();

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Plano Alimentar</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Dieta personalizada para seu biotipo</p>
        </div>
        <button onClick={handleRegenerate} disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)", opacity: regenerating ? 0.5 : 1, cursor: regenerating ? "not-allowed" : "pointer", pointerEvents: regenerating ? "none" : "auto" }}>
          {regenerating ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {regenerating ? "Gerando..." : "Nova Dieta"}
        </button>
      </div>

      {regenerating ? (
        <div className="card-glass p-8 flex flex-col items-center text-center mb-4">
          {/* Animated icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,212,170,0.12), rgba(0,168,255,0.12))", border: "2px solid rgba(0,212,170,0.25)" }}>
              <span className="text-4xl" style={{ display: "inline-block", animation: "dietPulse 1.5s ease-in-out infinite" }}>🥗</span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{ borderTopColor: "#00D4AA", animation: "dietSpin 1.2s linear infinite" }} />
          </div>

          <p className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Gerando dieta personalizada</p>
          <p className="text-sm mb-1 font-medium" style={{ color: "#00D4AA" }}>{genStep}</p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>Cada dia terá refeições únicas e variadas</p>

          {/* Progress bar */}
          <div className="w-full max-w-xs mb-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(genProgress)}%`, background: "linear-gradient(90deg, #00D4AA, #00A8FF)" }} />
            </div>
          </div>

          {/* Day dots */}
          <div className="flex gap-2 mb-4">
            {DAYS.map((day, i) => {
              const stepDone = genProgress >= 5 + Math.round(((i + 1) / 7) * 80);
              const stepActive = genStep.includes(DAY_FULL[day]);
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: stepDone ? "#00D4AA" : stepActive ? "rgba(0,212,170,0.3)" : "var(--bg-surface)",
                      color: stepDone ? "#000" : stepActive ? "#00D4AA" : "var(--text-muted)",
                      border: stepActive ? "2px solid #00D4AA" : "2px solid transparent"
                    }}>
                    {stepDone ? "✓" : DAY_NAMES[day]}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{Math.round(genProgress)}% concluído</p>

          <style>{`
            @keyframes dietSpin { to { transform: rotate(360deg); } }
            @keyframes dietPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
          `}</style>
        </div>
      ) : plan ? (
        <>
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
                  <span className="text-[10px]">{isTrainingDay ? "🔥" : "🥗"}</span>
                </button>
              );
            })}
          </div>

          {dayPlan ? (
            <>
              {(() => {
                const isTrainingDay = profile?.training_days?.includes(selectedDay);
                const trainParams = profile ? calcDietParams(profile, true) : null;
                const restParams = profile ? calcDietParams(profile, false) : null;
                const calDiff = trainParams && restParams ? trainParams.totalCals - restParams.totalCals : 0;
                return (
                  <div className="card-glass p-4 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{DAY_LABELS[selectedDay]}</h2>
                      {isTrainingDay ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA" }}>🔥 Dia de treino +{calDiff}kcal</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,139,250,0.1)", color: "#A78BFA" }}>😴 Dia de descanso</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>META CALÓRICA</span>
                      <span className="text-2xl font-bold" style={{ color: "#FF6B35" }}>
                        {Math.round(dayTotalCalories)} <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>kcal</span>
                      </span>
                    </div>
                    {/* Macro bar */}
                    <div className="flex h-2.5 rounded-full overflow-hidden mb-1" style={{ background: "var(--bg-surface)" }}>
                      {macros.map(m => (
                        <div key={m.label} className="transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
                      ))}
                    </div>
                    {/* Legend with % */}
                    <div className="flex justify-between mb-3">
                      {macros.map(m => (
                        <span key={m.label} className="text-[10px]" style={{ color: m.color }}>{m.pct}%</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {macros.map(m => (
                        <div key={m.label} className="text-center rounded-xl py-2" style={{ background: "var(--bg-surface)" }}>
                          <p className="text-base font-bold" style={{ color: m.color }}>{m.grams}g</p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                          {isTrainingDay && m.label === "Carboidratos" && (
                            <p className="text-[9px] font-semibold mt-0.5" style={{ color: "#F59E0B" }}>↑ dia de treino</p>
                          )}
                          {!isTrainingDay && m.label === "Carboidratos" && (
                            <p className="text-[9px] font-semibold mt-0.5" style={{ color: "#A78BFA" }}>↓ descanso</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 mb-4">
                {MEAL_ORDER.filter(k => dayPlan[k]).map(mealKey => (
                  <CartaoRefeicao
                    key={mealKey}
                    mealKey={mealKey}
                    meal={dayPlan[mealKey]}
                    onReplaceMeal={handleReplaceMeal}
                    onReplaceIngredient={handleReplaceIngredient}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="card-glass p-8 text-center mb-4">
              <Moon size={40} className="mx-auto mb-3" style={{ color: "#A78BFA" }} />
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Sem dados para este dia</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Regenere a dieta para obter o plano semanal completo.</p>
            </div>
          )}

          {plan.health_tips?.length > 0 && (
            <div className="card-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} style={{ color: "#F59E0B" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Dicas de Saúde</h3>
              </div>
              <div className="space-y-2">
                {plan.health_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.05)" }}>
                    <span className="text-sm">💡</span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card-glass p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum plano gerado ainda.</p>
          <button onClick={handleRegenerate} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#00D4AA", color: "#000" }}>
            Gerar Dieta
          </button>
        </div>
      )}
    </div>
  );
}
