import { useState } from "react";
import { RefreshCw, Play, ChevronDown, ChevronUp, Clock, Repeat } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ExerciseCard({ exercise, onReplace }) {
  const [expanded, setExpanded] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [videoModal, setVideoModal] = useState(false);

  const handleReplace = async (e) => {
    e.stopPropagation();
    setReplacing(true);
    await onReplace(exercise);
    setReplacing(false);
  };

  const videoQuery = encodeURIComponent(`${exercise.name} como executar corretamente`);
  const videoUrl = `https://www.youtube.com/results?search_query=${videoQuery}`;

  return (
    <>
      <div className="card-glass overflow-hidden transition-all">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{exercise.name}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA" }}>
                  {exercise.muscle_group}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1">
                  <Repeat size={11} /> {exercise.sets} séries × {exercise.reps}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {exercise.rest_seconds}s descanso
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleReplace}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)" }}>
                {replacing ? <LoadingSpinner size={14} /> : <RefreshCw size={14} style={{ color: "var(--text-secondary)" }} />}
              </button>
              <button onClick={() => setExpanded(!expanded)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)" }}>
                {expanded ? <ChevronUp size={14} style={{ color: "var(--text-secondary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                {exercise.instructions}
              </p>
              <button
                onClick={() => window.open(videoUrl, "_blank")}
                className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.2)", color: "#FF4444" }}>
                <Play size={14} /> Ver como executar corretamente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}