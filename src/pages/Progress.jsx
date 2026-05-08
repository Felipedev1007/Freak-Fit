import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { Plus, TrendingUp, Scale, Ruler, Flame } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, subWeeks, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";

const PERIODS = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" }
];

export default function Progress() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [activeMetric, setActiveMetric] = useState("weight");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ log_date: new Date().toISOString().split("T")[0], weight: "", waist: "", chest: "", hips: "", calories_consumed: "", notes: "" });

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await appClient.auth.me().catch(() => null);
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("Progress")); return; }
    setUser(u);
    const data = await appClient.entities.ProgressLog.filter({ user_email: u.email }, "-log_date", 100);
    setLogs(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const entry = { user_email: user.email, ...formData, weight: parseFloat(formData.weight) || null, waist: parseFloat(formData.waist) || null, chest: parseFloat(formData.chest) || null, hips: parseFloat(formData.hips) || null, calories_consumed: parseFloat(formData.calories_consumed) || null };
    await appClient.entities.ProgressLog.create(entry);
    const data = await appClient.entities.ProgressLog.filter({ user_email: user.email }, "-log_date", 100);
    setLogs(data);
    setShowForm(false);
    setSaving(false);
  }

  const filterByPeriod = (data) => {
    const now = new Date();
    let cutoff;
    if (period === "week") cutoff = subWeeks(now, 1);
    else if (period === "month") cutoff = subMonths(now, 1);
    else cutoff = subYears(now, 1);
    return data.filter(l => new Date(l.log_date) >= cutoff);
  };

  const filtered = filterByPeriod(logs).sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = filtered.map(l => ({
    date: format(new Date(l.log_date), "dd/MM"),
    weight: l.weight || null,
    waist: l.waist || null,
    chest: l.chest || null,
    hips: l.hips || null,
    calories: l.calories_consumed || null
  }));

  const metrics = [
    { key: "weight", label: "Peso", unit: "kg", color: "#00D4AA", icon: Scale },
    { key: "waist", label: "Cintura", unit: "cm", color: "#A78BFA", icon: Ruler },
    { key: "chest", label: "Peito", unit: "cm", color: "#38BDF8", icon: Ruler },
    { key: "hips", label: "Quadril", unit: "cm", color: "#F59E0B", icon: Ruler },
    { key: "calories", label: "Calorias", unit: "kcal", color: "#FF6B35", icon: Flame },
  ].filter(m => filtered.some(l => l[m.key === "calories" ? "calories_consumed" : m.key]));

  const CustomTooltip = (props) => {
    const { active, payload, label } = props || {};
    if (active && payload?.length) {
      return (
        <div className="card-glass px-3 py-2 text-xs" style={{ border: "1px solid var(--border-color)" }}>
          <p style={{ color: "var(--text-muted)" }}>{label}</p>
          {payload.map(p => (
            <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={36} /></div>;

  const latestWeight = logs.find(l => l.weight)?.weight;
  const firstWeight = [...logs].reverse().find(l => l.weight)?.weight;
  const weightChange = latestWeight && firstWeight ? Number((latestWeight - firstWeight).toFixed(1)) : null;

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Progresso</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Acompanhe sua evolução</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#00D4AA", color: "#000" }}>
          <Plus size={16} /> Registrar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Peso Atual", value: latestWeight ? `${latestWeight}kg` : "–", color: "#00D4AA" },
          { label: "Variação", value: weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange}kg` : "–", color: weightChange !== null && weightChange < 0 ? "#00D4AA" : "#FF6B35" },
          { label: "Registros", value: logs.length, color: "#A78BFA" }
        ].map(s => (
          <div key={s.label} className="card-glass p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="card-glass p-4 mb-4">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Novo Registro</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: "log_date", label: "Data", type: "date" },
              { key: "weight", label: "Peso (kg)", type: "number", placeholder: "70.5" },
              { key: "waist", label: "Cintura (cm)", type: "number", placeholder: "80" },
              { key: "chest", label: "Peito (cm)", type: "number", placeholder: "95" },
              { key: "hips", label: "Quadril (cm)", type: "number", placeholder: "90" },
              { key: "calories_consumed", label: "Calorias consumidas", type: "number", placeholder: "2000" }
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={formData[f.key]} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
            ))}
          </div>
          <textarea placeholder="Observações..." value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            rows={2} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none mb-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm border"
              style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#00D4AA", color: "#000" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Period Filter */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all border"
            style={{
              background: period === p.key ? "#00D4AA" : "var(--bg-card)",
              borderColor: period === p.key ? "#00D4AA" : "var(--border-color)",
              color: period === p.key ? "#000" : "var(--text-secondary)"
            }}>{p.label}</button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && metrics.length > 0 && (
        <div className="card-glass p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: "#00D4AA" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Evolução</h3>
            </div>
          </div>

          {/* Metric selector tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {metrics.map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                style={{
                  background: activeMetric === m.key ? m.color : "var(--bg-surface)",
                  borderColor: activeMetric === m.key ? m.color : "var(--border-color)",
                  color: activeMetric === m.key ? "#000" : "var(--text-secondary)"
                }}>
                <m.icon size={11} />
                {m.label}
              </button>
            ))}
          </div>

          {(() => {
            const m = metrics.find(x => x.key === activeMetric) || metrics[0];
            if (!m) return null;
            const validData = chartData.filter(d => d[m.key] != null);
            if (validData.length < 1) return <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sem dados suficientes</p>;

            const values = validData.map(d => d[m.key]);
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            const firstVal = values[0];
            const lastVal = values[values.length - 1];
            const diff = (lastVal - firstVal).toFixed(1);
            const diffPositive = parseFloat(diff) > 0;

            return (
              <>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Inicial", value: `${firstVal}${m.unit}` },
                    { label: "Atual", value: `${lastVal}${m.unit}`, bold: true, color: m.color },
                    { label: "Variação", value: `${diffPositive ? "+" : ""}${diff}${m.unit}`, color: m.key === "weight" ? (diffPositive ? "#FF6B35" : "#00D4AA") : m.color }
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: "var(--bg-surface)" }}>
                      <p className="text-sm font-bold" style={{ color: s.color || "var(--text-primary)" }}>{s.value}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2.5}
                      fill={`url(#grad-${m.key})`} dot={{ fill: m.color, r: 4, strokeWidth: 2, stroke: "var(--bg-card)" }}
                      activeDot={{ r: 6 }} name={`${m.label} (${m.unit})`} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            );
          })()}
        </div>
      )}

      {/* Log History */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card-glass p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum registro no período selecionado.</p>
          </div>
        ) : (
          [...filtered].reverse().map(log => (
            <div key={log.id} className="card-glass p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {format(new Date(log.log_date), "dd 'de' MMMM", { locale: ptBR })}
                </span>
                {log.weight && <span className="text-sm font-bold" style={{ color: "#00D4AA" }}>{log.weight}kg</span>}
              </div>
              <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                {log.waist && <span>Cin: {log.waist}cm</span>}
                {log.chest && <span>Pei: {log.chest}cm</span>}
                {log.hips && <span>Qua: {log.hips}cm</span>}
                {log.calories_consumed && <span>🔥 {log.calories_consumed}kcal</span>}
              </div>
              {log.notes && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{log.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
