import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { createPageUrl } from "@/utils";
import { Camera, Upload, ChevronDown, ChevronUp } from "lucide-react";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import GeneratingLoader from "@/components/ui/feedback/GeneratingLoader";

export default function AnaliseRefeicao() {
  const [user, setUser] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await appClient.auth.me().catch(() => null);
    if (!u) { appClient.auth.redirectToLogin(createPageUrl("AnaliseRefeicao")); return; }
    setUser(u);
    const analyses = await appClient.entities.MealAnalysis.filter({ user_email: u.email }, "-analyzed_at", 20);
    setHistory(analyses);
    setLoading(false);
  }

  async function convertToJpeg(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(new File([blob], "meal.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
      };
      img.src = url;
    });
  }

  async function handleFileUpload(e) {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !user) return;
    setAnalyzing(true);
    setResult(null);

    // Convert to JPEG to ensure compatibility (handles avif, heic, webp, etc.)
    const file = await convertToJpeg(rawFile);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });

    // Etapa 1: análise visual com claude (visão)
    const visualAnalysis = await appClient.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Você é um nutricionista analisando uma foto de refeição. Analise a imagem e descreva detalhadamente:
1. Cada alimento/ingrediente visível (seja específico: "pizza de queijo com molho de tomate", "fatia de pizza margherita", etc.)
2. Estimativa de peso de cada item em gramas (use o tamanho do prato como referência)
3. Método de preparo aparente (grelhado, frito, cozido, cru, etc.)

Formato da resposta — liste cada alimento assim:
- [nome do alimento]: [peso estimado]g, [método de preparo]

Seja minucioso. Inclua TODOS os itens visíveis, mesmo molhos e guarnições.`,
      file_urls: [file_url],
    });

    // Etapa 2: calcular valores nutricionais com base na descrição visual
    const res = await appClient.integrations.Core.InvokeLLM({
      prompt: `Você é um nutricionista. Com base nesta descrição de refeição, calcule os valores nutricionais exatos.

DESCRIÇÃO DA REFEIÇÃO:
${visualAnalysis}

TABELA TACO (kcal, prot, carb, gord por 100g):
- Arroz branco cozido: 128, 2.5, 28, 0.2
- Feijão cozido: 76, 4.8, 13.6, 0.5
- Frango peito grelhado: 163, 31, 0, 3.6
- Frango frito: 242, 23, 5, 14
- Carne bovina magra grelhada: 219, 32, 0, 9.8
- Ovo cozido: 146, 13, 0.6, 9.5
- Ovo frito: 190, 12, 1, 15
- Batata frita: 304, 3.8, 37, 16
- Batata cozida: 52, 1.2, 11, 0.1
- Macarrão cozido: 131, 4.2, 26, 0.8
- Pizza queijo/molho: 266, 11, 33, 10
- Hambúrguer: 295, 20, 24, 13
- Pão francês: 299, 8, 58, 3
- Alface/folhas: 13, 1.3, 2, 0.2
- Tomate: 15, 0.9, 3.1, 0.2
- Queijo muçarela: 315, 22, 2, 25
- Banana: 89, 1.1, 23, 0.3
- Maçã: 52, 0.3, 14, 0.2
- Lasanha: 160, 9, 18, 6
- Cuscuz: 115, 2.3, 24, 0.5

INSTRUÇÕES:
- Para cada alimento da descrição, calcule: calories = (kcal_por_100g / 100) × gramas
- Se o alimento não estiver na tabela, estime com o mais similar
- Os totais DEVEM ser a soma exata de todos os itens
- NUNCA retorne zero para calorias de um alimento que tem valor calórico
- Para ai_explanation: escreva em português 3-4 frases sobre total calórico, qualidade e sugestão de melhoria`,
      response_json_schema: {
        type: "object",
        required: ["identified_foods", "total_calories", "protein_grams", "carbs_grams", "fat_grams", "ai_explanation"],
        properties: {
          identified_foods: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "quantity", "calories", "protein_grams", "carbs_grams", "fat_grams"],
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                calories: { type: "number" },
                protein_grams: { type: "number" },
                carbs_grams: { type: "number" },
                fat_grams: { type: "number" }
              }
            }
          },
          total_calories: { type: "number" },
          protein_grams: { type: "number" },
          carbs_grams: { type: "number" },
          fat_grams: { type: "number" },
          ai_explanation: { type: "string" }
        }
      }
    });

    // Recalcula totais a partir dos itens caso a estimativa retorne zeros nos totais
    const foods = res.identified_foods || [];
    const calcTotal = (field) => foods.reduce((sum, f) => sum + (f[field] || 0), 0);
    const totalCalories = res.total_calories > 0 ? res.total_calories : calcTotal("calories");
    const totalProtein = res.protein_grams > 0 ? res.protein_grams : calcTotal("protein_grams");
    const totalCarbs = res.carbs_grams > 0 ? res.carbs_grams : calcTotal("carbs_grams");
    const totalFat = res.fat_grams > 0 ? res.fat_grams : calcTotal("fat_grams");

    const analysisData = {
      user_email: user.email,
      image_url: file_url,
      identified_foods: foods,
      total_calories: totalCalories,
      protein_grams: totalProtein,
      carbs_grams: totalCarbs,
      fat_grams: totalFat,
      ai_explanation: res.ai_explanation,
      analyzed_at: new Date().toISOString()
    };

    const analysis = await appClient.entities.MealAnalysis.create(analysisData);

    // Usa os dados locais para exibição imediata, garantindo que os valores calculados apareçam
    const displayResult = { ...analysisData, id: analysis.id };
    setResult(displayResult);
    setHistory(prev => [displayResult, ...prev]);
    setAnalyzing(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={36} /></div>;

  const macroColors = { protein: "#A78BFA", carbs: "#F59E0B", fat: "#FF6B35" };

  // Normaliza campos do alimento para lidar com variações de nome retornadas pela estimativa
  function getFoodCalories(food) {
    return food.calories ?? food.kcal ?? food.calorias ?? food.energy ?? 0;
  }
  function getFoodQuantity(food) {
    return food.quantity ?? food.quantidade ?? food.amount ?? "";
  }

  return (
    <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Analisar Refeição</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Tire uma foto do seu prato para análise nutricional</p>
      </div>

      {/* Upload Area */}
      {!analyzing && (
        <label className="card-glass p-8 flex flex-col items-center justify-center gap-3 cursor-pointer mb-6 transition-all hover:opacity-80"
          style={{ border: "2px dashed var(--border-color)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)" }}>
            <Camera size={28} style={{ color: "#A78BFA" }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Enviar foto da refeição</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG ou WEBP</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium" style={{ background: "#A78BFA", color: "#000" }}>
            <Upload size={14} />
            Escolher foto
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      )}

      {/* Analyzing loader */}
      {analyzing && (
        <div className="mb-6">
          <GeneratingLoader message="Analisando sua refeição..." estimatedSeconds={30} />
        </div>
      )}

      {/* Current Result */}
      {result && !analyzing && (
        <div className="card-glass p-5 mb-6">
          <div className="flex items-start gap-4 mb-4">
            {result.image_url && (
              <img src={result.image_url} alt="Refeição" className="w-20 h-20 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>ANÁLISE CONCLUÍDA</p>
              <p className="text-2xl font-bold" style={{ color: "#FF6B35" }}>
                {Math.round(result.total_calories)} <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>kcal</span>
              </p>
              <div className="flex gap-3 mt-2">
                <span className="text-xs font-semibold" style={{ color: macroColors.protein }}>{Math.round(result.protein_grams)}g prot</span>
                <span className="text-xs font-semibold" style={{ color: macroColors.carbs }}>{Math.round(result.carbs_grams)}g carb</span>
                <span className="text-xs font-semibold" style={{ color: macroColors.fat }}>{Math.round(result.fat_grams)}g gord</span>
              </div>
            </div>
          </div>

          {result.identified_foods?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>ALIMENTOS IDENTIFICADOS</p>
              <div className="space-y-1">
                {result.identified_foods.map((food, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                    <div>
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{food.name}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{getFoodQuantity(food)}</span>
                      </div>
                       <span className="text-xs font-bold" style={{ color: "#FF6B35" }}>{Math.round(getFoodCalories(food))} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.ai_explanation && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(167,139,250,0.07)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>💡 {result.ai_explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: "var(--text-primary)" }}>Histórico</h2>
          <div className="space-y-3">
            {history.filter(h => h.id !== result?.id).map(item => (
              <div key={item.id} className="card-glass p-4">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  {item.image_url && (
                    <img src={item.image_url} alt="Refeição" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(item.total_calories)} kcal</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(item.analyzed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-2 mr-2">
                    <span className="text-xs" style={{ color: macroColors.protein }}>{Math.round(item.protein_grams)}g P</span>
                    <span className="text-xs" style={{ color: macroColors.carbs }}>{Math.round(item.carbs_grams)}g C</span>
                    <span className="text-xs" style={{ color: macroColors.fat }}>{Math.round(item.fat_grams)}g G</span>
                  </div>
                  {expandedId === item.id ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                </div>
                {expandedId === item.id && item.identified_foods?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {item.identified_foods.map((food, i) => (
                      <div key={i} className="flex items-center justify-between py-1 px-2 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{food.name} — {getFoodQuantity(food)}</span>
                        <span className="text-xs font-medium" style={{ color: "#FF6B35" }}>{Math.round(getFoodCalories(food))} kcal</span>
                      </div>
                    ))}
                    {item.ai_explanation && (
                      <div className="mt-2 p-2 rounded-lg" style={{ background: "rgba(167,139,250,0.07)" }}>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>💡 {item.ai_explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
