import { useRef } from "react";
import { Play, Pause, SkipBack, Plus, Trash2, Repeat } from "lucide-react";
import type { Keyframe } from "../types";

type Props = {
  keyframes: Keyframe[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loop: boolean;
  selectedId: string | null;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onChangeDuration: (d: number) => void;
  onAddKeyframe: () => void;
  onDeleteKeyframe: (id: string) => void;
  onSelectKeyframe: (kf: Keyframe) => void;
};

export function Timeline({
  keyframes, currentTime, duration, isPlaying, loop, selectedId,
  onSeek, onTogglePlay, onToggleLoop, onChangeDuration, onAddKeyframe, onDeleteKeyframe, onSelectKeyframe,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timeFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  return (
    <div className="border-t border-slate-200 bg-white shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <button type="button" onClick={() => onSeek(0)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer" title="Go to start">
          <SkipBack className="w-4 h-4" />
        </button>
        <button type="button" onClick={onTogglePlay} className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onToggleLoop}
          className={`p-1.5 rounded cursor-pointer ${loop ? "text-blue-600 bg-blue-50" : "text-slate-500 hover:bg-slate-100"}`} title="Loop">
          <Repeat className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-slate-500 tabular-nums w-16">{currentTime.toFixed(2)}s</span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Duration
          <input type="number" min={0.5} max={60} step={0.5} value={duration}
            onChange={(e) => onChangeDuration(Number(e.target.value) || 1)}
            className="w-14 px-1.5 py-0.5 text-xs border border-slate-200 rounded font-mono" />
          s
        </label>
        <button type="button" onClick={onAddKeyframe} disabled={!selectedId}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          title="Add keyframe at playhead for selected object">
          <Plus className="w-3.5 h-3.5" /> Keyframe
        </button>
      </div>
      <div className="px-3 py-3">
        <div ref={trackRef} className="relative h-10 bg-slate-100 rounded-lg cursor-pointer select-none"
          onPointerDown={(e) => {
            onSeek(timeFromEvent(e.clientX));
            const move = (ev: PointerEvent) => onSeek(timeFromEvent(ev.clientX));
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}>
          {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-slate-300/60" style={{ left: `${(i / duration) * 100}%` }} />
          ))}
          {sorted.map((kf) => {
            const hasSelected = selectedId && kf.objectPoses[selectedId];
            return (
              <div key={kf.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group" style={{ left: `${(kf.time / duration) * 100}%` }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); onSelectKeyframe(kf); }}
                  className={`w-3 h-3 rotate-45 border-2 bg-white shadow-sm cursor-pointer transition-transform hover:scale-125 ${hasSelected ? "border-blue-600" : "border-slate-400"}`}
                  title={`${kf.label || "Keyframe"} @ ${kf.time.toFixed(2)}s`} />
                {sorted.length > 1 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteKeyframe(kf.id); }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 p-0.5 bg-white border border-slate-200 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Trash2 className="w-2.5 h-2.5 text-red-600" />
                  </button>
                )}
              </div>
            );
          })}
          <div className="absolute top-0 bottom-0 w-0.5 bg-blue-600 pointer-events-none z-10" style={{ left: `${(currentTime / duration) * 100}%` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-600 rounded-sm rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}
