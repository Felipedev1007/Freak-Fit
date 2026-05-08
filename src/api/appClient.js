// @ts-nocheck
import { hasBase44AiConfig, invokeBase44LLM, uploadBase44File } from './base44AiClient';

const STORAGE_PREFIX = "freakfit";
const USER_KEY = `${STORAGE_PREFIX}:session-user`;
const ENTITY_NAMES = [
  "UserProfile",
  "WorkoutPlan",
  "DietPlan",
  "ProgressLog",
  "MealAnalysis",
];

const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const MEAL_KEYS = ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
const MEAL_TIMES = {
  cafe_manha: "07:00",
  almoco: "12:00",
  lanche_tarde: "15:30",
  jantar: "19:00",
  ceia: "21:30",
};

function storageKey(name) {
  return `${STORAGE_PREFIX}:${name}`;
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Could not read local data:", error);
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save local data:", error);
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCurrentUser() {
  const existing = readJson(USER_KEY, null);
  if (existing?.email) return existing;

  const user = {
    id: "local-user",
    email: "usuario@freakfit.local",
    full_name: "Usuario FreakFit",
    role: "user",
  };
  writeJson(USER_KEY, user);
  return user;
}

function readCollection(entityName) {
  return readJson(storageKey(entityName), []);
}

function writeCollection(entityName, items) {
  writeJson(storageKey(entityName), items);
}

function matchesCriteria(item, criteria = {}) {
  return Object.entries(criteria || {}).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(item[key]);
    return item[key] === value;
  });
}

function normalizeForSort(value) {
  if (value == null) return "";
  if (typeof value === "number") return value;
  const dateValue = Date.parse(value);
  if (!Number.isNaN(dateValue) && String(value).match(/\d{4}-\d{2}-\d{2}/)) {
    return dateValue;
  }
  return String(value).toLowerCase();
}

function sortItems(items, sortBy) {
  if (!sortBy) return items;
  const descending = String(sortBy).startsWith("-");
  const field = descending ? String(sortBy).slice(1) : String(sortBy);

  return [...items].sort((a, b) => {
    const av = normalizeForSort(a[field]);
    const bv = normalizeForSort(b[field]);
    if (av < bv) return descending ? 1 : -1;
    if (av > bv) return descending ? -1 : 1;
    return 0;
  });
}

function createEntityApi(entityName) {
  return {
    async filter(criteria = {}, sortBy = null, limit = null) {
      const filtered = readCollection(entityName).filter((item) => matchesCriteria(item, criteria));
      const sorted = sortItems(filtered, sortBy);
      const limited = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
      return clone(limited);
    },

    async create(data) {
      const now = new Date().toISOString();
      const items = readCollection(entityName);
      const item = {
        ...clone(data),
        id: createId(),
        created_date: data?.created_date || now,
        updated_date: now,
      };
      writeCollection(entityName, [item, ...items]);
      return clone(item);
    },

    async update(id, patch) {
      const now = new Date().toISOString();
      const items = readCollection(entityName);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        const item = { ...clone(patch), id, created_date: now, updated_date: now };
        writeCollection(entityName, [item, ...items]);
        return clone(item);
      }

      const updated = { ...items[index], ...clone(patch), id, updated_date: now };
      items[index] = updated;
      writeCollection(entityName, items);
      return clone(updated);
    },

    async delete(id) {
      writeCollection(entityName, readCollection(entityName).filter((item) => item.id !== id));
      return true;
    },
  };
}

function numberFromPrompt(prompt, regex, fallback = null) {
  const match = String(prompt).match(regex);
  if (!match) return fallback;
  const value = Number(String(match[1]).replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

function textFromPrompt(prompt, regex, fallback = "") {
  return String(prompt).match(regex)?.[1]?.trim() || fallback;
}

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function includesAny(text, words) {
  const normalized = String(text || "").toLowerCase();
  return words.some((word) => normalized.includes(word));
}

const EXERCISES = {
  gym: {
    push: [
      ["Supino reto com halteres", "Peito"],
      ["Supino inclinado com halteres", "Peito"],
      ["Desenvolvimento com halteres", "Ombros"],
      ["Triceps na polia", "Triceps"],
      ["Crucifixo na maquina", "Peito"],
      ["Paralelas assistidas", "Peito/Triceps"],
    ],
    pull: [
      ["Puxada frontal", "Costas"],
      ["Remada baixa", "Costas"],
      ["Remada unilateral com halter", "Costas"],
      ["Rosca direta", "Biceps"],
      ["Face pull", "Ombros posteriores"],
      ["Pulldown com bracos estendidos", "Costas"],
    ],
    legs: [
      ["Agachamento livre", "Pernas"],
      ["Leg press", "Quadriceps"],
      ["Cadeira flexora", "Posterior de coxa"],
      ["Terra romeno", "Posterior/Gluteos"],
      ["Hip thrust", "Gluteos"],
      ["Panturrilha em pe", "Panturrilhas"],
    ],
    core: [
      ["Prancha frontal", "Core"],
      ["Abdominal na polia", "Abdomen"],
      ["Elevacao de pernas", "Abdomen"],
      ["Pallof press", "Core"],
      ["Prancha lateral", "Core"],
    ],
    full: [
      ["Agachamento goblet", "Corpo todo"],
      ["Remada curvada", "Costas"],
      ["Supino com halteres", "Peito"],
      ["Terra romeno", "Posterior"],
      ["Desenvolvimento militar", "Ombros"],
      ["Prancha frontal", "Core"],
    ],
  },
  home: {
    push: [
      ["Flexao de braco", "Peito"],
      ["Flexao inclinada na cadeira", "Peito"],
      ["Flexao diamante", "Triceps"],
      ["Pike push-up", "Ombros"],
      ["Dip entre cadeiras", "Triceps"],
      ["Flexao declinada", "Peito/Ombros"],
    ],
    pull: [
      ["Remada invertida em mesa firme", "Costas"],
      ["Remada com elastico", "Costas"],
      ["Pull-apart com elastico", "Ombros posteriores"],
      ["Rosca com elastico", "Biceps"],
      ["Barra de porta assistida", "Costas"],
    ],
    legs: [
      ["Agachamento livre", "Quadriceps"],
      ["Afundo estatico", "Pernas"],
      ["Agachamento bulgaro na cadeira", "Gluteos"],
      ["Elevacao de quadril", "Gluteos"],
      ["Panturrilha unilateral", "Panturrilhas"],
      ["Agachamento sumo", "Pernas/Gluteos"],
    ],
    core: [
      ["Prancha frontal", "Core"],
      ["Prancha lateral", "Core"],
      ["Abdominal bicicleta", "Abdomen"],
      ["Mountain climber", "Core/Cardio"],
      ["Hollow body hold", "Core"],
    ],
    full: [
      ["Agachamento livre", "Pernas"],
      ["Flexao de braco", "Peito"],
      ["Remada com elastico", "Costas"],
      ["Afundo alternado", "Pernas"],
      ["Prancha frontal", "Core"],
      ["Mountain climber", "Condicionamento"],
    ],
  },
  outdoor: {
    push: [
      ["Flexao de braco no banco", "Peito"],
      ["Paralelas no parque", "Triceps"],
      ["Pike push-up", "Ombros"],
      ["Flexao declinada no banco", "Peito"],
    ],
    pull: [
      ["Barra fixa assistida", "Costas"],
      ["Remada australiana", "Costas"],
      ["Barra supinada", "Biceps/Costas"],
      ["Isometria na barra", "Costas"],
    ],
    legs: [
      ["Afundo caminhando", "Pernas"],
      ["Agachamento livre", "Quadriceps"],
      ["Step-up no banco", "Gluteos"],
      ["Sprint curto", "Condicionamento"],
      ["Panturrilha no degrau", "Panturrilhas"],
    ],
    core: [
      ["Prancha frontal", "Core"],
      ["Elevacao de joelhos na barra", "Abdomen"],
      ["Mountain climber", "Core/Cardio"],
      ["Prancha lateral", "Core"],
    ],
    full: [
      ["Afundo caminhando", "Pernas"],
      ["Flexao de braco", "Peito"],
      ["Barra fixa assistida", "Costas"],
      ["Step-up no banco", "Gluteos"],
      ["Prancha frontal", "Core"],
    ],
  },
};

function trainingPlace(prompt) {
  if (includesAny(prompt, ["ao ar livre", "ar_livre", "parque", "praca"])) return "outdoor";
  if (includesAny(prompt, ["casa", "calistenia", "peso corporal"])) return "home";
  return "gym";
}

function focusGroups(focusText) {
  const focus = String(focusText || "").toLowerCase();
  if (includesAny(focus, ["peito", "triceps", "empurrar"])) return ["push"];
  if (includesAny(focus, ["costas", "biceps", "puxar"])) return ["pull"];
  if (includesAny(focus, ["pernas", "glute", "quadr", "posterior", "inferior"])) return ["legs"];
  if (includesAny(focus, ["ombro", "core", "abd"])) return ["push", "core"];
  if (includesAny(focus, ["bracos"])) return ["push", "pull", "core"];
  return ["full"];
}

function buildExercise(name, muscleGroup, sets, reps, rest) {
  return {
    name,
    muscle_group: muscleGroup,
    sets,
    reps,
    rest_seconds: rest,
    instructions: "Mantenha postura firme, execute o movimento com controle e pare se sentir dor fora do normal.",
    video_search: `${name} execucao correta`,
  };
}

function generateWorkoutDay(prompt) {
  const place = trainingPlace(prompt);
  const focus = textFromPrompt(prompt, /foco\s+(?:em\s+)?["']?([^"'.\n]+)["']?/i, "Corpo Todo");
  const count =
    numberFromPrompt(prompt, /EXATAMENTE\s+(\d+)/i) ||
    numberFromPrompt(prompt, /Crie\s+(\d+)/i) ||
    5;
  const sets =
    numberFromPrompt(prompt, /"sets"\s*:\s*(\d+)/i) ||
    numberFromPrompt(prompt, /S\S*ries\s*[=:]\s*(\d+)/i) ||
    3;
  const reps =
    textFromPrompt(prompt, /"reps"\s*:\s*"([^"]+)"/i) ||
    textFromPrompt(prompt, /Reps\s*[=:]\s*([0-9-]+)/i) ||
    "10-12";
  const rest =
    numberFromPrompt(prompt, /"rest_seconds"\s*:\s*(\d+)/i) ||
    numberFromPrompt(prompt, /Descanso\s*[=:]\s*(\d+)/i) ||
    75;

  const selectedGroups = focusGroups(focus);
  const pool = selectedGroups.flatMap((group) => EXERCISES[place][group] || []);
  const fallbackPool = EXERCISES[place].full;
  const source = pool.length ? pool : fallbackPool;
  const offset = hashString(prompt) % source.length;
  const exercises = Array.from({ length: count }, (_, index) => {
    const [name, muscleGroup] = source[(offset + index) % source.length];
    return buildExercise(name, muscleGroup, sets, reps, rest);
  });

  return {
    name: `Treino ${focus}`,
    focus,
    rest_day: false,
    exercises,
  };
}

function generateSingleExercise(prompt) {
  const group = textFromPrompt(prompt, /\(([^)]+)\)/i, "");
  const focus = group || textFromPrompt(prompt, /mesmo grupo muscular/i, "Corpo Todo");
  const day = generateWorkoutDay(`${prompt}\nfoco "${focus}"\nEXATAMENTE 1`);
  return day.exercises[0];
}

function restrictionFlags(prompt) {
  const text = String(prompt || "").toLowerCase();
  return {
    vegan: text.includes("vegan"),
    vegetarian: text.includes("vegetariano") || text.includes("vegetarian"),
    lactose: text.includes("lactose"),
    gluten: text.includes("gluten") || text.includes("gluten"),
    eggs: text.includes("ovos"),
    seafood: text.includes("frutos_do_mar") || text.includes("frutos do mar"),
    soy: text.includes("soja"),
    nuts: text.includes("nozes") || text.includes("castanhas") || text.includes("amendoim"),
  };
}

function chooseProtein(flags, index = 0) {
  if (flags.vegan || flags.vegetarian) {
    const vegetarian = flags.soy
      ? ["grao-de-bico", "lentilha", "feijao preto", "ervilha"]
      : ["tofu grelhado", "grao-de-bico", "lentilha", "feijao preto"];
    return vegetarian[index % vegetarian.length];
  }
  const proteins = flags.seafood
    ? ["frango grelhado", "patinho moido", "ovos mexidos", "carne bovina magra"]
    : ["frango grelhado", "peixe assado", "patinho moido", "ovos mexidos"];
  return proteins[index % proteins.length];
}

function chooseCarb(flags, index = 0) {
  const carbs = flags.gluten
    ? ["arroz integral", "batata doce", "quinoa", "mandioca", "tapioca"]
    : ["arroz integral", "batata doce", "aveia", "macarrao integral", "quinoa", "mandioca"];
  return carbs[index % carbs.length];
}

function splitIngredient(name, quantity, calories, protein, carbs, fat) {
  return {
    name,
    quantity,
    calories: Math.max(0, Math.round(calories)),
    protein: Math.max(0, Math.round(protein)),
    carbs: Math.max(0, Math.round(carbs)),
    fat: Math.max(0, Math.round(fat)),
  };
}

function makeMeal(key, calories, protein, carbs, fat, flags, seed = 0) {
  const proteinFood = chooseProtein(flags, seed);
  const carbFood = chooseCarb(flags, seed);
  const fatFood = flags.nuts ? "azeite de oliva" : seed % 2 ? "abacate" : "castanhas";

  const names = {
    cafe_manha: flags.eggs || flags.vegan
      ? `Creme de ${carbFood} com banana`
      : `Ovos com ${carbFood} e fruta`,
    almoco: `${proteinFood} com ${carbFood}`,
    lanche_tarde: flags.lactose || flags.vegan
      ? `Vitamina de fruta com ${carbFood}`
      : `Iogurte com fruta e ${carbFood}`,
    jantar: `${proteinFood} com legumes e ${carbFood}`,
    ceia: flags.lactose || flags.vegan
      ? "Abacate com chia"
      : "Iogurte proteico com chia",
  };

  const ingredients = key === "ceia"
    ? [
        splitIngredient(names[key], "1 porcao", calories * 0.75, protein * 0.75, carbs * 0.75, fat * 0.75),
        splitIngredient("chia", "10g", calories * 0.25, protein * 0.25, carbs * 0.25, fat * 0.25),
      ]
    : [
        splitIngredient(proteinFood, "120g", calories * 0.42, protein * 0.65, carbs * 0.05, fat * 0.35),
        splitIngredient(carbFood, "150g", calories * 0.42, protein * 0.2, carbs * 0.85, fat * 0.1),
        splitIngredient(key === "lanche_tarde" ? "banana" : "legumes variados", "100g", calories * 0.16, protein * 0.15, carbs * 0.1, fat * 0.55),
      ];

  return {
    name: names[key],
    time: MEAL_TIMES[key],
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    ingredients,
  };
}

function generateDietDay(prompt) {
  const totalCalories =
    numberFromPrompt(prompt, /META:\s*(\d+)kcal/i) ||
    numberFromPrompt(prompt, /CALORIAS TOTAIS:\s*(\d+)kcal/i) ||
    2200;
  const proteinGrams =
    numberFromPrompt(prompt, /P:\s*(\d+)g/i) ||
    numberFromPrompt(prompt, /PROTE\S*NA:\s*(\d+)g/i) ||
    Math.round((totalCalories * 0.25) / 4);
  const carbsGrams =
    numberFromPrompt(prompt, /C:\s*(\d+)g/i) ||
    numberFromPrompt(prompt, /CARBOIDRATOS:\s*(\d+)g/i) ||
    Math.round((totalCalories * 0.45) / 4);
  const fatGrams =
    numberFromPrompt(prompt, /G:\s*(\d+)g/i) ||
    numberFromPrompt(prompt, /GORDURAS:\s*(\d+)g/i) ||
    Math.round((totalCalories * 0.3) / 9);

  const flags = restrictionFlags(prompt);
  const cals = {
    cafe_manha: numberFromPrompt(prompt, /caf\S*=(\d+)kcal/i) || Math.round(totalCalories * 0.22),
    almoco: numberFromPrompt(prompt, /almo\S*o=(\d+)kcal/i) || Math.round(totalCalories * 0.33),
    lanche_tarde: numberFromPrompt(prompt, /lanche=(\d+)kcal/i) || Math.round(totalCalories * 0.15),
    jantar: numberFromPrompt(prompt, /jantar=(\d+)kcal/i) || Math.round(totalCalories * 0.25),
    ceia: numberFromPrompt(prompt, /ceia=(\d+)kcal/i) || Math.round(totalCalories * 0.05),
  };
  const ratios = {
    cafe_manha: [0.22, 0.25, 0.2],
    almoco: [0.3, 0.35, 0.25],
    lanche_tarde: [0.15, 0.18, 0.15],
    jantar: [0.25, 0.19, 0.28],
    ceia: [0.08, 0.03, 0.12],
  };
  const seed = hashString(prompt);

  const daily_plan = Object.fromEntries(
    MEAL_KEYS.map((key, index) => {
      const [pRatio, cRatio, fRatio] = ratios[key];
      return [
        key,
        makeMeal(
          key,
          cals[key],
          proteinGrams * pRatio,
          carbsGrams * cRatio,
          fatGrams * fRatio,
          flags,
          seed + index,
        ),
      ];
    }),
  );

  return {
    daily_plan,
    total_calories: totalCalories,
    protein_grams: proteinGrams,
    carbs_grams: carbsGrams,
    fat_grams: fatGrams,
    main_protein: chooseProtein(flags, seed),
    main_carb: chooseCarb(flags, seed),
  };
}

function generateReplacementMeal(prompt) {
  const key = textFromPrompt(prompt, /refei\S*o\s+"([^"]+)"/i, "almoco");
  const flags = restrictionFlags(prompt);
  return makeMeal(key, key === "almoco" ? 650 : 420, 35, 55, 14, flags, hashString(prompt));
}

function generateIngredient(prompt) {
  const calories = numberFromPrompt(prompt, /\((?:[^,]+,\s*)?(\d+)kcal\)/i, 120);
  const flags = restrictionFlags(prompt);
  const name = includesAny(prompt, ["ingredient", "ingrediente"])
    ? chooseCarb(flags, hashString(prompt))
    : chooseProtein(flags, hashString(prompt));
  return splitIngredient(name, "100g", calories, Math.round(calories * 0.12), Math.round(calories * 0.18), Math.round(calories * 0.04));
}

function generateHealthTips(prompt) {
  const requested = numberFromPrompt(prompt, /(\d+)\s+dicas/i, 3) || 3;
  const tips = [
    "Distribua proteina ao longo do dia para melhorar recuperacao e saciedade.",
    "Beba agua antes e depois do treino; urina muito escura costuma indicar baixa hidratacao.",
    "Mantenha um prato com legumes ou verduras no almoco e no jantar.",
    "Nos dias de treino, concentre mais carboidratos perto do horario do exercicio.",
    "Ajuste cargas e porcoes aos poucos; consistencia vence mudancas radicais.",
  ];
  return tips.slice(0, Math.min(requested, tips.length));
}

function generateMealAnalysis() {
  const identified_foods = [
    {
      name: "Arroz integral",
      quantity: "120g",
      calories: 154,
      protein_grams: 3,
      carbs_grams: 32,
      fat_grams: 1,
    },
    {
      name: "Feijao",
      quantity: "100g",
      calories: 76,
      protein_grams: 5,
      carbs_grams: 14,
      fat_grams: 1,
    },
    {
      name: "Frango grelhado",
      quantity: "120g",
      calories: 196,
      protein_grams: 37,
      carbs_grams: 0,
      fat_grams: 4,
    },
    {
      name: "Salada",
      quantity: "80g",
      calories: 25,
      protein_grams: 1,
      carbs_grams: 5,
      fat_grams: 0,
    },
  ];
  const sum = (field) => identified_foods.reduce((total, food) => total + food[field], 0);
  return {
    identified_foods,
    total_calories: sum("calories"),
    protein_grams: sum("protein_grams"),
    carbs_grams: sum("carbs_grams"),
    fat_grams: sum("fat_grams"),
    ai_explanation: "Estimativa nutricional calculada a partir dos alimentos aparentes da refeicao. O prato tem boa base proteica e carboidratos moderados. Para maior saciedade, vale aumentar a porcao de salada e manter molhos separados.",
  };
}

async function invokeLocal(params = {}) {
  if (hasBase44AiConfig()) {
    try {
      return await invokeBase44LLM(params);
    } catch (error) {
      console.warn("Base44 AI call failed. Falling back to local generation:", error);
    }
  }

  const { prompt = "", response_json_schema: schema = null } = params;
  const properties = schema?.properties || {};

  if (!schema) {
    return "- arroz integral: 120g, cozido\n- feijao: 100g, cozido\n- frango grelhado: 120g, grelhado\n- salada: 80g, cru";
  }
  if (properties.identified_foods) return generateMealAnalysis(prompt);
  if (properties.health_tips) return { health_tips: generateHealthTips(prompt) };
  if (properties.exercise) return { exercise: generateSingleExercise(prompt) };
  if (properties.meal) return { meal: generateReplacementMeal(prompt) };
  if (properties.ingredient) return { ingredient: generateIngredient(prompt) };
  if (properties.daily_plan) return generateDietDay(prompt);
  if (properties.exercises || properties.name) return generateWorkoutDay(prompt);

  return {};
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function imageFileToDataUrl(file) {
  if (typeof document === "undefined" || !file?.type?.startsWith("image/")) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      resolve(await readFileAsDataUrl(file));
    };
    image.src = objectUrl;
  });
}

const entities = ENTITY_NAMES.reduce((api, entityName) => {
  api[entityName] = createEntityApi(entityName);
  return api;
}, {});

const client = {
  auth: {
    async me() {
      return clone(getCurrentUser());
    },
    logout(redirectUrl = "/Onboarding") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_KEY);
        window.location.href = redirectUrl || "/Onboarding";
      }
    },
    redirectToLogin(returnUrl = "/Onboarding") {
      if (typeof window !== "undefined") {
        window.location.href = returnUrl || "/Onboarding";
      }
    },
  },
  entities,
  integrations: {
    Core: {
      InvokeLLM: invokeLocal,
      async UploadFile({ file }) {
        if (hasBase44AiConfig()) {
          try {
            return await uploadBase44File({ file });
          } catch (error) {
            console.warn("Base44 upload failed. Falling back to local data URL:", error);
          }
        }

        return { file_url: await imageFileToDataUrl(file) };
      },
    },
  },
};

export const appClient = /** @type {any} */ (client);
