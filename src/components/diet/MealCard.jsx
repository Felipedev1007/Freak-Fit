import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";

const MEAL_ICONS = {
  cafe_manha: "☀️",
  almoco: "🍽️",
  lanche_tarde: "🍎",
  jantar: "🌙",
  ceia: "🌛"
};

const MEAL_NAMES = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia"
};

export default function MealCard({ mealKey, meal, onReplaceMeal, onReplaceIngredient }) {
  const [expanded, setExpanded] = useState(false);
  const [replacingMeal, setReplacingMeal] = useState(false);
  const [replacingIngredient, setReplacingIngredient] = useState(null);

  const handleReplaceMeal = async (e) => {
    e.stopPropagation();
    setReplacingMeal(true);
    await onReplaceMeal(mealKey);
    setReplacingMeal(false);
  };

  const handleReplaceIngredient = async (ingredient, idx) => {
    setReplacingIngredient(idx);
    await onReplaceIngredient(mealKey, ingredient, idx);
    setReplacingIngredient(null);
  };

  const macroTotal = { p: Math.round(meal.protein || 0), c: Math.round(meal.carbs || 0), f: Math.round(meal.fat || 0) };

  return (
    <div className="card-glass overflow-hidden transition-all">
      <button className="w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            {MEAL_ICONS[mealKey] || "🍴"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{MEAL_NAMES[mealKey]}</h4>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{meal.time}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "#FF6B35" }}>{Math.round(meal.calories)} kcal</span>
                {expanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
              </div>
            </div>
            <div className="flex gap-3 mt-1.5">
              {[
                { label: "P", value: macroTotal.p, color: "#A78BFA" },
                { label: "C", value: macroTotal.c, color: "#F59E0B" },
                { label: "G", value: macroTotal.f, color: "#FF6B35" }
              ].map(m => (
                <span key={m.label} className="text-xs" style={{ color: m.color }}>
                  {m.label}: {m.value}g
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="pt-3 space-y-2">
            {(meal.ingredients || []).map((ing, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{ing.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {ing.quantity} · {Math.round(ing.calories)} kcal
                    <span style={{ color: "#A78BFA" }}> · P:{Math.round(ing.protein || 0)}g</span>
                    <span style={{ color: "#F59E0B" }}> C:{Math.round(ing.carbs || 0)}g</span>
                    <span style={{ color: "#FF6B35" }}> G:{Math.round(ing.fat || 0)}g</span>
                  </p>
                </div>
                <button onClick={() => handleReplaceIngredient(ing, idx)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)" }}>
                  {replacingIngredient === idx ? <LoadingSpinner size={12} /> : <RefreshCw size={12} style={{ color: "var(--text-muted)" }} />}
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleReplaceMeal} disabled={replacingMeal}
            className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl text-xs font-medium transition-all border"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
            {replacingMeal ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
            {replacingMeal ? "Substituindo refeição..." : "Substituir refeição completa"}
          </button>
        </div>
      )}
    </div>
  );
}