import { useState, useEffect } from "react";

const MESSAGES = [
  "Analisando seu perfil...",
  "Calculando macronutrientes ideais...",
  "Personalizando para seu biotipo...",
  "Montando o plano completo...",
  "Quase pronto...",
];

export default function GeneratingLoader({ message = "Gerando seu plano personalizado...", estimatedSeconds = 60, progress: externalProgress = null }) {
  const [elapsed, setElapsed] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const idx = Math.min(Math.floor((elapsed / estimatedSeconds) * MESSAGES.length), MESSAGES.length - 1);
    setMsgIndex(idx);
  }, [elapsed, estimatedSeconds]);

  const progress = externalProgress !== null ? externalProgress : Math.min(95, (elapsed / estimatedSeconds) * 100);
  const remaining = Math.max(0, estimatedSeconds - elapsed);

  return (
    <div className="card-glass p-8 text-center mb-4 flex flex-col items-center">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,168,255,0.15))", border: "2px solid rgba(0,212,170,0.3)" }}>
          <span className="text-4xl" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>⚡</span>
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "#00D4AA",
            animation: "spin 1.2s linear infinite"
          }} />
      </div>

      <p className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{message}</p>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{MESSAGES[msgIndex]}</p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-2">
        <div className="h-2 rounded-full" style={{ background: "var(--bg-surface)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round(progress)}%`,
              background: "linear-gradient(90deg, #00D4AA, #00A8FF)"
            }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{Math.round(progress)}%</span>
        <span>•</span>
        <span>~{remaining}s restantes</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
  );
}