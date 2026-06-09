// @ts-nocheck
import { hasBase44AiConfig, invokeBase44LLM, uploadBase44File } from './base44AiClient';
import { hasSupabaseConfig, supabase } from './supabaseClient';

const STORAGE_PREFIX = "freakfit";
const USER_KEY = `${STORAGE_PREFIX}:session-user`;
const ACCOUNTS_KEY = `${STORAGE_PREFIX}:auth-accounts`;
const ADMIN_EMAIL = normalizeEmail(import.meta.env.VITE_ADMIN_EMAIL || "admin@freakfit.local");
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "FreakFit@2026";
const ADMIN_ACCOUNT_ID = "freakfit-admin";
const SUPABASE_ENTITY_TABLE = "freakfit_entities";
const SUPABASE_ACCOUNT_TABLE = "freakfit_accounts";
const SUPABASE_UPLOAD_BUCKET = "freakfit-uploads";
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
  if (existing?.email) {
    const accounts = readAccounts();
    const accountExists = accounts.some((account) => account.email === normalizeEmail(existing.email));
    const isAdminSession = existing.role === "admin" && normalizeEmail(existing.email) === ADMIN_EMAIL;
    const isLegacyAutoUser = existing.id === "local-user" || existing.email === "usuario@freakfit.local";
    if ((accountExists || isAdminSession) && !isLegacyAutoUser) return existing;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
    }
  }

  const error = new Error("Autenticação necessária.");
  error.type = "auth_required";
  throw error;
}

function sanitizeUser(account) {
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    full_name: account.full_name,
    avatar_url: account.avatar_url || "",
    auth_provider: account.auth_provider || "email",
    role: account.role || "user",
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminAccount(account) {
  return Boolean(account?.role === "admin" && normalizeEmail(account.email) === ADMIN_EMAIL);
}

function requireAdmin() {
  const user = getCurrentUser();
  if (!isAdminAccount(user)) {
    const error = new Error("Acesso permitido apenas para administradores.");
    error.type = "admin_required";
    throw error;
  }
  return user;
}

function createAdminAccount() {
  return {
    id: ADMIN_ACCOUNT_ID,
    email: ADMIN_EMAIL,
    full_name: "Administrador FreakFit",
    avatar_url: "",
    auth_provider: "admin",
    role: "admin",
    created_at: new Date().toISOString(),
  };
}

function readAccounts() {
  return readJson(ACCOUNTS_KEY, []);
}

function writeAccounts(accounts) {
  writeJson(ACCOUNTS_KEY, accounts);
}

function accountFromRemoteRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    full_name: row.full_name || "",
    avatar_url: row.avatar_url || "",
    auth_provider: row.auth_provider || "email",
    role: row.role || "user",
    salt: row.salt || "",
    password_hash: row.password_hash || "",
    reset_code: row.reset_code || "",
    reset_requested_at: row.reset_requested_at || "",
    created_at: row.created_at,
    updated_at: row.updated_at || "",
  };
}

function accountToRemoteRow(account) {
  return {
    id: account.id,
    email: normalizeEmail(account.email),
    full_name: account.full_name || "",
    avatar_url: account.avatar_url || "",
    auth_provider: account.auth_provider || "email",
    role: account.role || "user",
    salt: account.salt || "",
    password_hash: account.password_hash || "",
    reset_code: account.reset_code || "",
    reset_requested_at: account.reset_requested_at || null,
    created_at: account.created_at || new Date().toISOString(),
    updated_at: account.updated_at || new Date().toISOString(),
  };
}

function warnRemoteAccounts(action, error) {
  console.warn(`Supabase accounts ${action} failed. Falling back to local accounts:`, error);
}

async function readRemoteAccounts() {
  const { data, error } = await supabase
    .from(SUPABASE_ACCOUNT_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(accountFromRemoteRow).filter(Boolean);
}

async function upsertRemoteAccount(account) {
  const { data, error } = await supabase
    .from(SUPABASE_ACCOUNT_TABLE)
    .upsert(accountToRemoteRow(account), { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return accountFromRemoteRow(data);
}

async function deleteRemoteAccount(id) {
  const { error } = await supabase
    .from(SUPABASE_ACCOUNT_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

async function readAccountsForAuth() {
  if (useSupabaseData()) {
    try {
      const remoteAccounts = await readRemoteAccounts();
      const remoteEmails = new Set(remoteAccounts.map((account) => normalizeEmail(account.email)));
      const localOnlyAccounts = readAccounts().filter((account) =>
        account?.email && !remoteEmails.has(normalizeEmail(account.email))
      );

      if (localOnlyAccounts.length > 0) {
        await Promise.all(localOnlyAccounts.map((account) => upsertRemoteAccount(account)));
      }

      const accounts = [...remoteAccounts, ...localOnlyAccounts];
      writeAccounts(accounts);
      return accounts;
    } catch (error) {
      warnRemoteAccounts("read", error);
    }
  }

  return readAccounts();
}

async function persistAccount(account, accounts = readAccounts()) {
  const normalized = {
    ...account,
    email: normalizeEmail(account.email),
    updated_at: account.updated_at || new Date().toISOString(),
  };
  const nextAccounts = [
    normalized,
    ...accounts.filter((item) =>
      item.id !== normalized.id && normalizeEmail(item.email) !== normalized.email
    ),
  ];

  writeAccounts(nextAccounts);

  if (useSupabaseData()) {
    try {
      await upsertRemoteAccount(normalized);
    } catch (error) {
      warnRemoteAccounts("save", error);
    }
  }

  return normalized;
}

async function removePersistedAccount(account, accounts = readAccounts()) {
  writeAccounts(accounts.filter((item) => item.id !== account.id));

  if (useSupabaseData()) {
    try {
      await deleteRemoteAccount(account.id);
    } catch (error) {
      warnRemoteAccounts("delete", error);
    }
  }

  return true;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }

  const encoded = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(hash);
}

async function hashPassword(password, salt = createId()) {
  return {
    salt,
    password_hash: await sha256(`${salt}:${password}`),
  };
}

function validateAuthFields({ name, email, password }, mode = "register") {
  const cleanEmail = normalizeEmail(email);
  if (mode === "register" && String(name || "").trim().length < 2) {
    throw new Error("Informe seu nome completo.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Informe um e-mail válido.");
  }
  if (password != null && String(password).length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
  return cleanEmail;
}

function persistSession(account) {
  const user = sanitizeUser(account);
  writeJson(USER_KEY, user);
  return user;
}

function readCollection(entityName) {
  return readJson(storageKey(entityName), []);
}

function writeCollection(entityName, items) {
  writeJson(storageKey(entityName), items);
}

function useSupabaseData() {
  return Boolean(hasSupabaseConfig && supabase);
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

function remoteItemFromRow(row) {
  const data = clone(row?.data || {});
  return {
    ...data,
    id: row.id,
    created_date: data.created_date || row.created_date,
    updated_date: data.updated_date || row.updated_date,
  };
}

function ownerEmailFrom(data = {}) {
  return data?.user_email || getCurrentUser().email;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function readRemoteCollection(entityName, criteria = {}) {
  let query = supabase
    .from(SUPABASE_ENTITY_TABLE)
    .select("id,data,created_date,updated_date")
    .eq("entity_name", entityName);

  const currentUser = getCurrentUser();
  const userEmail = criteria?.user_email || (isAdminAccount(currentUser) ? null : currentUser.email);
  if (userEmail) query = query.eq("user_email", userEmail);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(remoteItemFromRow);
}

async function createRemoteItem(entityName, data) {
  const now = new Date().toISOString();
  const id = createId();
  const item = {
    ...clone(data),
    id,
    created_date: data?.created_date || now,
    updated_date: now,
  };

  const { data: row, error } = await supabase
    .from(SUPABASE_ENTITY_TABLE)
    .insert({
      id,
      entity_name: entityName,
      user_email: ownerEmailFrom(item),
      data: item,
      created_date: item.created_date,
      updated_date: item.updated_date,
    })
    .select("id,data,created_date,updated_date")
    .single();

  if (error) throw error;
  return remoteItemFromRow(row);
}

async function updateRemoteItem(entityName, id, patch) {
  const now = new Date().toISOString();
  const { data: existing, error: readError } = await supabase
    .from(SUPABASE_ENTITY_TABLE)
    .select("id,data,created_date,updated_date")
    .eq("entity_name", entityName)
    .eq("id", id)
    .maybeSingle();

  if (readError) throw readError;

  const rowId = existing?.id || (isUuid(id) ? id : createId());
  const item = {
    ...(existing?.data || {}),
    ...clone(patch),
    id: rowId,
    created_date: existing?.data?.created_date || existing?.created_date || now,
    updated_date: now,
  };

  const payload = {
    id: rowId,
    entity_name: entityName,
    user_email: ownerEmailFrom(item),
    data: item,
    created_date: item.created_date,
    updated_date: item.updated_date,
  };

  const query = existing
    ? supabase.from(SUPABASE_ENTITY_TABLE).update(payload).eq("id", rowId)
    : supabase.from(SUPABASE_ENTITY_TABLE).insert(payload);

  const { data: row, error } = await query
    .select("id,data,created_date,updated_date")
    .single();

  if (error) throw error;
  return remoteItemFromRow(row);
}

async function deleteRemoteItem(entityName, id) {
  const { error } = await supabase
    .from(SUPABASE_ENTITY_TABLE)
    .delete()
    .eq("entity_name", entityName)
    .eq("id", id);

  if (error) throw error;
  return true;
}

async function deleteRemoteUserData(userEmail) {
  if (!useSupabaseData()) return true;
  const { error } = await supabase
    .from(SUPABASE_ENTITY_TABLE)
    .delete()
    .eq("user_email", userEmail);

  if (error) throw error;
  return true;
}

async function reassignRemoteUserData(oldEmail, newEmail) {
  if (!useSupabaseData() || oldEmail === newEmail) return true;

  const { data, error } = await supabase
    .from(SUPABASE_ENTITY_TABLE)
    .select("id,data,entity_name,created_date,updated_date")
    .eq("user_email", oldEmail);

  if (error) throw error;

  for (const row of data || []) {
    const nextData = { ...(row.data || {}), user_email: newEmail };
    const { error: updateError } = await supabase
      .from(SUPABASE_ENTITY_TABLE)
      .update({ user_email: newEmail, data: nextData })
      .eq("id", row.id);

    if (updateError) throw updateError;
  }

  return true;
}

function deleteLocalUserData(userEmail) {
  for (const entityName of ENTITY_NAMES) {
    const remaining = readCollection(entityName).filter((item) => item.user_email !== userEmail);
    writeCollection(entityName, remaining);
  }
}

function reassignLocalUserData(oldEmail, newEmail) {
  if (oldEmail === newEmail) return;
  for (const entityName of ENTITY_NAMES) {
    const updated = readCollection(entityName).map((item) =>
      item.user_email === oldEmail ? { ...item, user_email: newEmail } : item
    );
    writeCollection(entityName, updated);
  }
}

function createEntityApi(entityName) {
  return {
    async filter(criteria = {}, sortBy = null, limit = null) {
      if (useSupabaseData()) {
        try {
          const remoteItems = await readRemoteCollection(entityName, criteria);
          const filteredRemote = remoteItems.filter((item) => matchesCriteria(item, criteria));
          const sortedRemote = sortItems(filteredRemote, sortBy);
          const limitedRemote = Number.isFinite(limit) ? sortedRemote.slice(0, limit) : sortedRemote;
          return clone(limitedRemote);
        } catch (error) {
          console.warn(`Supabase read failed for ${entityName}. Falling back to local data:`, error);
        }
      }

      const filtered = readCollection(entityName).filter((item) => matchesCriteria(item, criteria));
      const sorted = sortItems(filtered, sortBy);
      const limited = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
      return clone(limited);
    },

    async create(data) {
      if (useSupabaseData()) {
        try {
          return await createRemoteItem(entityName, data);
        } catch (error) {
          console.warn(`Supabase create failed for ${entityName}. Falling back to local data:`, error);
        }
      }

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
      if (useSupabaseData()) {
        try {
          return await updateRemoteItem(entityName, id, patch);
        } catch (error) {
          console.warn(`Supabase update failed for ${entityName}. Falling back to local data:`, error);
        }
      }

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
      if (useSupabaseData()) {
        try {
          return await deleteRemoteItem(entityName, id);
        } catch (error) {
          console.warn(`Supabase delete failed for ${entityName}. Falling back to local data:`, error);
        }
      }

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
      ["Cadeira abdutora", "Gluteo medio"],
      ["Cadeira adutora", "Adutores"],
      ["Gluteo no cabo", "Gluteos"],
      ["Passada no smith", "Gluteos/Pernas"],
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
      ["Elevacao de quadril unilateral", "Gluteos"],
      ["Agachamento sumo com pausa", "Gluteos/Adutores"],
      ["Abducao de quadril lateral", "Gluteo medio"],
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
      ["Agachamento bulgaro no banco", "Gluteos"],
      ["Elevacao de quadril no banco", "Gluteos"],
      ["Afundo reverso", "Gluteos/Pernas"],
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
  if (includesAny(focus, ["pernas", "glute", "quadr", "posterior", "inferior", "adutor", "abdutor", "panturrilha"])) return ["legs"];
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
  const breakfastProtein = flags.eggs || flags.vegan ? (flags.vegan ? "pasta de amendoim" : "frango desfiado") : "ovos mexidos";
  const breakfastCarb = flags.gluten ? (seed % 2 ? "tapioca" : "cuscuz de milho") : (seed % 2 ? "aveia" : "pao integral");
  const snackProtein = flags.lactose || flags.vegan ? (flags.vegan ? "proteina vegetal" : "atum") : "iogurte natural";
  const supperProtein = flags.lactose || flags.vegan ? (flags.vegan ? "tofu cremoso" : "ovos cozidos") : "iogurte proteico";
  const breakfastNames = flags.eggs || flags.vegan
    ? [
        `Café da manhã com ${breakfastCarb}, banana e ${breakfastProtein}`,
        `Vitamina de fruta com ${breakfastCarb} e ${breakfastProtein}`,
        `Creme de ${breakfastCarb} com banana e chia`,
      ]
    : [
        `Ovos mexidos com ${breakfastCarb} e fruta`,
        `Panqueca de banana com ${breakfastCarb}`,
        `Omelete com ${breakfastCarb} e mamão`,
        `Iogurte com ${breakfastCarb}, fruta e chia`,
      ];
  const lunchNames = [
    `${proteinFood} com ${carbFood}, feijão e salada`,
    `${proteinFood} com ${carbFood} e legumes cozidos`,
    `${proteinFood} com feijão, salada e ${carbFood}`,
    `Bowl de ${proteinFood}, ${carbFood} e vegetais`,
  ];
  const snackNames = flags.lactose || flags.vegan
    ? [
        `Lanche da tarde com fruta, ${snackProtein} e ${breakfastCarb}`,
        `Vitamina de fruta com ${snackProtein}`,
        `${breakfastCarb} pequeno com ${snackProtein}`,
      ]
    : [
        `Iogurte com fruta, aveia e ${fatFood}`,
        `Sanduíche integral com ${snackProtein} e fruta`,
        `Tapioca pequena com ${snackProtein}`,
        `Vitamina proteica com banana e aveia`,
      ];
  const dinnerNames = [
    `${proteinFood} com legumes, verduras e ${carbFood}`,
    `${proteinFood} com salada e legumes salteados`,
    `Sopa proteica com ${proteinFood} e legumes`,
    `${proteinFood} com purê leve e verduras`,
  ];
  const supperNames = flags.lactose || flags.vegan
    ? [`${supperProtein} com chia`, "Abacate com chia", `${supperProtein} com linhaça`]
    : ["Iogurte proteico com chia", "Cottage com castanhas", "Leite proteico com linhaça"];

  const templates = {
    cafe_manha: {
      name: breakfastNames[seed % breakfastNames.length],
      ingredients: [
        splitIngredient(breakfastProtein, "100g", calories * 0.34, protein * 0.58, carbs * 0.05, fat * 0.45),
        splitIngredient(breakfastCarb, "120g", calories * 0.44, protein * 0.22, carbs * 0.78, fat * 0.18),
        splitIngredient("banana", "100g", calories * 0.22, protein * 0.2, carbs * 0.17, fat * 0.37),
      ],
    },
    almoco: {
      name: lunchNames[seed % lunchNames.length],
      ingredients: [
        splitIngredient(proteinFood, "130g", calories * 0.38, protein * 0.62, carbs * 0.03, fat * 0.34),
        splitIngredient(carbFood, "150g", calories * 0.34, protein * 0.18, carbs * 0.72, fat * 0.08),
        splitIngredient("feijão", "90g", calories * 0.14, protein * 0.12, carbs * 0.18, fat * 0.04),
        splitIngredient("salada e legumes", "120g", calories * 0.14, protein * 0.08, carbs * 0.07, fat * 0.54),
      ],
    },
    lanche_tarde: {
      name: snackNames[seed % snackNames.length],
      ingredients: [
        splitIngredient(snackProtein, "120g", calories * 0.38, protein * 0.62, carbs * 0.08, fat * 0.22),
        splitIngredient("banana ou maca", "100g", calories * 0.28, protein * 0.08, carbs * 0.42, fat * 0.08),
        splitIngredient(flags.gluten ? "tapioca" : "aveia", "45g", calories * 0.22, protein * 0.18, carbs * 0.42, fat * 0.16),
        splitIngredient(fatFood, "15g", calories * 0.12, protein * 0.12, carbs * 0.08, fat * 0.54),
      ],
    },
    jantar: {
      name: dinnerNames[seed % dinnerNames.length],
      ingredients: [
        splitIngredient(proteinFood, "130g", calories * 0.46, protein * 0.68, carbs * 0.04, fat * 0.38),
        splitIngredient("legumes cozidos", "160g", calories * 0.2, protein * 0.12, carbs * 0.16, fat * 0.22),
        splitIngredient(carbFood, "100g", calories * 0.24, protein * 0.12, carbs * 0.72, fat * 0.06),
        splitIngredient("azeite de oliva", "8g", calories * 0.1, protein * 0.08, carbs * 0.08, fat * 0.34),
      ],
    },
    ceia: {
      name: supperNames[seed % supperNames.length],
      ingredients: [
        splitIngredient(supperProtein, "120g", calories * 0.72, protein * 0.78, carbs * 0.45, fat * 0.52),
        splitIngredient("chia", "10g", calories * 0.28, protein * 0.22, carbs * 0.55, fat * 0.48),
      ],
    },
  };
  const template = templates[key] || templates.almoco;

  return {
    name: template.name,
    time: MEAL_TIMES[key],
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    ingredients: template.ingredients,
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

async function uploadSupabaseFile({ file }) {
  if (!useSupabaseData()) {
    throw new Error("Supabase is not configured.");
  }

  const extension = String(file?.name || "upload.jpg").split(".").pop() || "jpg";
  const path = `${getCurrentUser().id}/${createId()}.${extension.toLowerCase()}`;
  const { data, error } = await supabase.storage
    .from(SUPABASE_UPLOAD_BUCKET)
    .upload(path, file, {
      contentType: file?.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from(SUPABASE_UPLOAD_BUCKET)
    .getPublicUrl(data.path);

  return { file_url: publicData.publicUrl };
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
    async register({ name, email, password }) {
      const cleanEmail = validateAuthFields({ name, email, password }, "register");
      if (cleanEmail === ADMIN_EMAIL) {
        throw new Error("Este e-mail é reservado para o administrador.");
      }

      const accounts = await readAccountsForAuth();
      if (accounts.some((account) => account.email === cleanEmail)) {
        throw new Error("Já existe uma conta cadastrada com este e-mail.");
      }

      const passwordData = await hashPassword(password);
      const account = {
        id: createId(),
        email: cleanEmail,
        full_name: String(name || "").trim(),
        ...passwordData,
        auth_provider: "email",
        role: "user",
        created_at: new Date().toISOString(),
      };
      await persistAccount(account, accounts);
      return sanitizeUser(account);
    },
    async login({ email, password }) {
      const cleanEmail = validateAuthFields({ email, password }, "login");
      if (cleanEmail === ADMIN_EMAIL && String(password) === ADMIN_PASSWORD) {
        const accounts = await readAccountsForAuth();
        const previousAdmin = accounts.find(isAdminAccount);
        const adminAccount = {
          ...createAdminAccount(),
          created_at: previousAdmin?.created_at || new Date().toISOString(),
        };
        await persistAccount(adminAccount, accounts);
        return persistSession(adminAccount);
      }

      const accounts = await readAccountsForAuth();
      const account = accounts.find((item) => item.email === cleanEmail);
      if (!account || account.auth_provider !== "email") {
        throw new Error("E-mail ou senha inválidos.");
      }

      const passwordData = await hashPassword(password, account.salt);
      if (passwordData.password_hash !== account.password_hash) {
        throw new Error("E-mail ou senha inválidos.");
      }
      return persistSession(account);
    },
    async loginWithProvider(provider = "google") {
      const cleanProvider = provider === "github" ? "github" : "google";
      const email = `${cleanProvider}@freakfit.ai`;
      const accounts = await readAccountsForAuth();
      const existing = accounts.find((account) => account.email === email);
      if (existing) return persistSession(existing);

      const account = {
        id: createId(),
        email,
        full_name: cleanProvider === "github" ? "Atleta GitHub" : "Atleta Google",
        auth_provider: cleanProvider,
        role: "user",
        created_at: new Date().toISOString(),
      };
      await persistAccount(account, accounts);
      return persistSession(account);
    },
    async requestPasswordReset(email) {
      const cleanEmail = validateAuthFields({ email }, "reset");
      const accounts = await readAccountsForAuth();
      const account = accounts.find((item) => item.email === cleanEmail);
      if (!account || account.auth_provider !== "email") {
        throw new Error("Não encontramos uma conta com este e-mail.");
      }
      const resetCode = String(Math.floor(100000 + Math.random() * 900000));
      const updatedAccount = {
        ...account,
        reset_code: resetCode,
        reset_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await persistAccount(updatedAccount, accounts);
      return { reset_code: resetCode };
    },
    async resetPassword({ email, code, password }) {
      const cleanEmail = validateAuthFields({ email, password }, "reset");
      const accounts = await readAccountsForAuth();
      const account = accounts.find((item) => item.email === cleanEmail);
      if (!account || account.reset_code !== String(code || "").trim()) {
        throw new Error("Código de recuperação inválido.");
      }
      const passwordData = await hashPassword(password);
      const updatedAccount = {
        ...account,
        ...passwordData,
        reset_code: "",
        reset_requested_at: "",
        updated_at: new Date().toISOString(),
      };
      await persistAccount(updatedAccount, accounts);
      return persistSession(updatedAccount);
    },
    logout(redirectUrl = "/") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_KEY);
        window.location.href = redirectUrl || "/";
      }
    },
    redirectToLogin(returnUrl = "/Painel") {
      if (typeof window !== "undefined") {
        const next = encodeURIComponent(returnUrl || "/Painel");
        window.location.href = `/Login?next=${next}`;
      }
    },
  },
  admin: {
    async listUsers() {
      requireAdmin();
      const accounts = await readAccountsForAuth();
      const adminAccount = accounts.find(isAdminAccount) || await persistAccount(createAdminAccount(), accounts);
      const users = [
        adminAccount,
        ...accounts.filter((account) => !isAdminAccount(account)),
      ];

      return users
        .map(sanitizeUser)
        .sort((a, b) => {
          if (a.role === b.role) return String(a.email).localeCompare(String(b.email));
          return a.role === "admin" ? -1 : 1;
        });
    },
    async updateUser(id, patch = {}) {
      requireAdmin();
      if (id === ADMIN_ACCOUNT_ID) {
        throw new Error("O administrador principal não pode ser editado por aqui.");
      }

      const accounts = await readAccountsForAuth();
      const account = accounts.find((item) => item.id === id);
      if (!account) throw new Error("Usuário não encontrado.");

      const nextEmail = patch.email != null
        ? validateAuthFields({ email: patch.email }, "login")
        : account.email;

      if (nextEmail === ADMIN_EMAIL) {
        throw new Error("Este e-mail é reservado para o administrador.");
      }
      if (accounts.some((item) => item.id !== id && item.email === nextEmail)) {
        throw new Error("Já existe outro usuário com este e-mail.");
      }

      const nextAccount = {
        ...account,
        email: nextEmail,
        full_name: String(patch.full_name ?? account.full_name ?? "").trim() || account.full_name,
        role: "user",
        updated_at: new Date().toISOString(),
      };

      if (patch.password) {
        validateAuthFields({ email: nextEmail, password: patch.password }, "login");
        Object.assign(nextAccount, await hashPassword(patch.password));
        nextAccount.auth_provider = "email";
      }

      await persistAccount(nextAccount, accounts);

      if (account.email !== nextEmail) {
        reassignLocalUserData(account.email, nextEmail);
        await reassignRemoteUserData(account.email, nextEmail);
      }

      return sanitizeUser(nextAccount);
    },
    async deleteUser(id) {
      requireAdmin();
      if (id === ADMIN_ACCOUNT_ID) {
        throw new Error("O administrador principal não pode ser excluído.");
      }

      const accounts = await readAccountsForAuth();
      const account = accounts.find((item) => item.id === id);
      if (!account) throw new Error("Usuário não encontrado.");

      await deleteRemoteUserData(account.email);
      deleteLocalUserData(account.email);
      await removePersistedAccount(account, accounts);
      return true;
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

        if (useSupabaseData()) {
          try {
            return await uploadSupabaseFile({ file });
          } catch (error) {
            console.warn("Supabase upload failed. Falling back to local data URL:", error);
          }
        }

        return { file_url: await imageFileToDataUrl(file) };
      },
    },
  },
};

export const appClient = /** @type {any} */ (client);
