import { useCallback, useEffect, useRef, useState } from "react";
import {
  Scene, SceneObject, CharacterPose, ObjectTransform, Keyframe,
  defaultCharacterPose, defaultTransform, uid,
} from "./types";
import { processImage } from "./lib/imageUtils";
import { evaluateObjectPose, upsertKeyframePose } from "./lib/animation";
import { Header } from "./components/Header";
import { LayerPanel } from "./components/LayerPanel";
import { Stage } from "./components/Stage";
import { Timeline } from "./components/Timeline";
import { Inspector } from "./components/Inspector";
import { QuickGuide } from "./components/QuickGuide";

const STAGE_W = 960;
const STAGE_H = 540;

function createEmptyScene(): Scene {
  return {
    id: uid("scene"), name: "Untitled Scene", width: STAGE_W, height: STAGE_H,
    backgroundColor: "#f1f5f9", objects: [],
    keyframes: [{ id: uid("kf"), time: 0, label: "Rest", easing: "linear", objectPoses: {} }],
    duration: 3, loop: true,
  };
}

export default function App() {
  const [scene, setScene] = useState<Scene>(createEmptyScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<"animate" | "arrange">("arrange");
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const [liveOverride, setLiveOverride] = useState<{ objectId: string; pose: CharacterPose | ObjectTransform } | null>(null);
  const playRef = useRef({ lastTs: 0, accum: 0, time: 0 });

  const selected = scene.objects.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (!isPlaying) return;
    playRef.current = { lastTs: performance.now(), accum: 0, time: currentTime };
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - playRef.current.lastTs) / 1000);
      playRef.current.lastTs = now;
      playRef.current.accum += dt;
      if (playRef.current.accum >= 1 / 30) {
        const step = playRef.current.accum;
        playRef.current.accum = 0;
        let t = playRef.current.time + step;
        if (t >= scene.duration) {
          if (scene.loop) t %= scene.duration;
          else { setCurrentTime(scene.duration); setIsPlaying(false); return; }
        }
        playRef.current.time = t;
        setCurrentTime(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, scene.duration, scene.loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying((p) => !p); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeObject(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const addImages = useCallback(async (files: FileList | File[], kindHint?: "character" | "prop" | "background") => {
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) { setError("Please choose PNG, WebP, or JPEG images."); return; }
    try {
      const newObjects: SceneObject[] = [];
      const newPoses: Record<string, CharacterPose | ObjectTransform> = {};
      let maxZ = scene.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
      for (const file of list) {
        const asChar = kindHint === "character" || (!kindHint || (kindHint !== "prop" && kindHint !== "background"));
        const processed = await processImage(file, { removeBg, asCharacter: asChar });
        const id = uid("obj");
        const name = file.name.replace(/\.[^.]+$/, "") || "Object";
        const kind = kindHint ?? (processed.isRigged ? "character" : "prop");
        maxZ += 1;
        const obj: SceneObject = {
          id, name, kind, imageUrl: processed.imageUrl, width: processed.width, height: processed.height,
          isRigged: processed.isRigged && kind === "character",
          restJoints: processed.restJoints, mesh: processed.mesh,
          zIndex: kind === "background" ? -1000 + maxZ : maxZ, locked: false, visible: true,
        };
        newObjects.push(obj);
        const offset = (newObjects.length - 1) * 40;
        if (obj.isRigged) newPoses[id] = defaultCharacterPose(STAGE_W / 2 + offset, STAGE_H / 2 + offset * 0.3);
        else newPoses[id] = defaultTransform(STAGE_W / 2 + offset, STAGE_H / 2 + offset * 0.3);
      }
      setScene((s) => {
        const objects = [...s.objects, ...newObjects];
        let keyframes = s.keyframes.map((kf) =>
          kf.time === 0 ? { ...kf, objectPoses: { ...kf.objectPoses, ...newPoses } } : kf
        );
        if (!keyframes.some((k) => k.time === 0)) {
          keyframes = [{ id: uid("kf"), time: 0, label: "Rest", easing: "linear" as const, objectPoses: newPoses }, ...keyframes];
        }
        return { ...s, objects, keyframes };
      });
      setSelectedId(newObjects[newObjects.length - 1]?.id ?? null);
      setMode("arrange");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image(s)");
    }
  }, [removeBg, scene.objects]);

  const removeObject = useCallback((id: string) => {
    setScene((s) => ({
      ...s,
      objects: s.objects.filter((o) => o.id !== id),
      keyframes: s.keyframes.map((kf) => {
        const { [id]: _, ...rest } = kf.objectPoses;
        return { ...kf, objectPoses: rest };
      }),
    }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const updateObject = useCallback((id: string, patch: Partial<SceneObject>) => {
    setScene((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }, []);

  const reorderObject = useCallback((id: string, direction: "up" | "down") => {
    setScene((s) => {
      const sorted = [...s.objects].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((o) => o.id === id);
      if (idx < 0) return s;
      const swapWith = direction === "up" ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= sorted.length) return s;
      const a = sorted[idx], b = sorted[swapWith];
      return {
        ...s,
        objects: s.objects.map((o) => {
          if (o.id === a.id) return { ...o, zIndex: b.zIndex };
          if (o.id === b.id) return { ...o, zIndex: a.zIndex };
          return o;
        }),
      };
    });
  }, []);

  const poses: Record<string, CharacterPose | ObjectTransform> = {};
  for (const obj of scene.objects) {
    poses[obj.id] = evaluateObjectPose(scene.keyframes, obj.id, currentTime, scene.duration, obj.isRigged, scene.width, scene.height);
  }
  if (liveOverride) poses[liveOverride.objectId] = liveOverride.pose;

  const commitPose = useCallback((objectId: string, pose: CharacterPose | ObjectTransform, label?: string) => {
    setScene((s) => ({ ...s, keyframes: upsertKeyframePose(s.keyframes, currentTime, objectId, pose, label) }));
  }, [currentTime]);

  const onLivePoseChange = useCallback((objectId: string, pose: CharacterPose | ObjectTransform) => {
    setIsPlaying(false);
    setLiveOverride({ objectId, pose });
  }, []);

  const onCommitPose = useCallback((objectId: string, pose: CharacterPose | ObjectTransform) => {
    setLiveOverride(null);
    commitPose(objectId, pose);
  }, [commitPose]);

  const addKeyframeAtPlayhead = useCallback(() => {
    if (!selectedId || !poses[selectedId]) return;
    commitPose(selectedId, poses[selectedId], "Keyframe");
  }, [selectedId, poses, commitPose]);

  const deleteKeyframe = useCallback((kfId: string) => {
    setScene((s) => {
      if (s.keyframes.length <= 1) return s;
      return { ...s, keyframes: s.keyframes.filter((k) => k.id !== kfId) };
    });
  }, []);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <Header onUpload={(files, kind) => addImages(files, kind)} onOpenGuide={() => setGuideOpen(true)}
        removeBg={removeBg} onToggleRemoveBg={setRemoveBg} sceneName={scene.name}
        onRename={(name) => setScene((s) => ({ ...s, name }))} />
      {error && (
        <div role="alert" className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-red-800 shrink-0">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-1 text-red-600 hover:bg-red-100 rounded cursor-pointer">Dismiss</button>
        </div>
      )}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <LayerPanel objects={scene.objects} selectedId={selectedId} onSelect={setSelectedId}
          onRemove={removeObject} onUpdate={updateObject} onReorder={reorderObject}
          onUpload={(files) => addImages(files)} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Stage scene={scene} poses={poses} selectedId={selectedId} mode={mode}
            onSelect={setSelectedId} onLivePoseChange={onLivePoseChange} onCommitPose={onCommitPose}
            onDropFiles={(files) => addImages(files)} />
          <Timeline keyframes={scene.keyframes} currentTime={currentTime} duration={scene.duration}
            isPlaying={isPlaying} loop={scene.loop} selectedId={selectedId}
            onSeek={(t) => { setIsPlaying(false); setLiveOverride(null); setCurrentTime(t); }}
            onTogglePlay={() => { if (!isPlaying && currentTime >= scene.duration - 0.01) setCurrentTime(0); setIsPlaying((p) => !p); }}
            onToggleLoop={() => setScene((s) => ({ ...s, loop: !s.loop }))}
            onChangeDuration={(d) => { setIsPlaying(false); setScene((s) => ({ ...s, duration: d })); if (currentTime > d) setCurrentTime(d); }}
            onAddKeyframe={addKeyframeAtPlayhead} onDeleteKeyframe={deleteKeyframe}
            onSelectKeyframe={(kf) => { setIsPlaying(false); setLiveOverride(null); setCurrentTime(kf.time); }} />
        </div>
        <Inspector object={selected} pose={selected ? poses[selected.id] : null} mode={mode}
          onChangeMode={setMode}
          onLivePoseChange={selected ? (p) => onLivePoseChange(selected.id, p) : undefined}
          onCommitPose={selected ? (p) => onCommitPose(selected.id, p) : undefined}
          onUpdateObject={selected ? (patch) => updateObject(selected.id, patch) : undefined} />
      </main>
      <QuickGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
