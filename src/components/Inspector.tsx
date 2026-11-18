import type { SceneObject, CharacterPose, ObjectTransform, BoneAngles } from "../types";
import { isCharacterPose, defaultBoneAngles } from "../types";

type Props = {
  object: SceneObject | null;
  pose: CharacterPose | ObjectTransform | null;
  mode: "animate" | "arrange";
  onChangeMode: (m: "animate" | "arrange") => void;
  onLivePoseChange?: (pose: CharacterPose | ObjectTransform) => void;
  onCommitPose?: (pose: CharacterPose | ObjectTransform) => void;
  onUpdateObject?: (patch: Partial<SceneObject>) => void;
};

function Slider({ label, value, min, max, step = 1, onChange, onCommit, suffix = "" }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; onCommit: () => void; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <label className="text-slate-600">{label}</label>
        <span className="font-mono tabular-nums text-slate-500">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit}
        className="w-full cursor-pointer" />
    </div>
  );
}

export function Inspector({ object, pose, mode, onChangeMode, onLivePoseChange, onCommitPose, onUpdateObject }: Props) {
  if (!object || !pose) {
    return (
      <aside className="hidden lg:flex w-72 shrink-0 border-l border-slate-200 bg-white flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400">
          Select an object on the stage or in the layer list.
        </div>
      </aside>
    );
  }

  const t = isCharacterPose(pose) ? pose.transform : pose;
  const isChar = object.isRigged && isCharacterPose(pose);

  const updateTransform = (patch: Partial<ObjectTransform>, commit = false) => {
    const newT = { ...t, ...patch };
    const next = isCharacterPose(pose) ? { ...pose, transform: newT } : newT;
    onLivePoseChange?.(next);
    if (commit) onCommitPose?.(next);
  };

  const updateBone = (key: keyof BoneAngles, degrees: number, commit = false) => {
    if (!isCharacterPose(pose)) return;
    const next: CharacterPose = { ...pose, boneAngles: { ...pose.boneAngles, [key]: (degrees * Math.PI) / 180 } };
    onLivePoseChange?.(next);
    if (commit) onCommitPose?.(next);
  };

  const boneDeg = (key: keyof BoneAngles) =>
    isCharacterPose(pose) ? Math.round((pose.boneAngles[key] * 180) / Math.PI) : 0;

  return (
    <aside className="hidden lg:flex w-72 shrink-0 border-l border-slate-200 bg-white flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{object.name}</h2>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">{object.kind}</span>
      </div>
      <div className="flex border-b border-slate-100">
        {(["arrange", "animate"] as const).map((m) => (
          <button key={m} type="button" onClick={() => onChangeMode(m)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors cursor-pointer ${
              mode === m ? "text-blue-700 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"
            }`}>{m}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-600 mb-1 block">Name</label>
          <input type="text" value={object.name} onChange={(e) => onUpdateObject?.({ name: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
        </div>
        <section className="space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Transform</h3>
          <Slider label="X" value={Math.round(t.x)} min={-200} max={1160} onChange={(v) => updateTransform({ x: v })} onCommit={() => updateTransform({}, true)} />
          <Slider label="Y" value={Math.round(t.y)} min={-200} max={740} onChange={(v) => updateTransform({ y: v })} onCommit={() => updateTransform({}, true)} />
          <Slider label="Rotation" value={Math.round((t.rotation * 180) / Math.PI)} min={-180} max={180}
            onChange={(v) => updateTransform({ rotation: (v * Math.PI) / 180 })} onCommit={() => updateTransform({}, true)} suffix="°" />
          <Slider label="Scale" value={Math.round(t.scaleX * 100) / 100} min={0.1} max={3} step={0.05}
            onChange={(v) => updateTransform({ scaleX: v, scaleY: v })} onCommit={() => updateTransform({}, true)} />
          <Slider label="Opacity" value={Math.round(t.opacity * 100)} min={0} max={100}
            onChange={(v) => updateTransform({ opacity: v / 100 })} onCommit={() => updateTransform({}, true)} suffix="%" />
        </section>
        {isChar && (
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bones</h3>
            {([["head", "Head"], ["neck", "Neck"], ["spine", "Spine"], ["pelvis", "Pelvis"],
              ["leftUpperArm", "L Upper Arm"], ["leftLowerArm", "L Lower Arm"],
              ["rightUpperArm", "R Upper Arm"], ["rightLowerArm", "R Lower Arm"],
              ["leftThigh", "L Thigh"], ["leftShin", "L Shin"],
              ["rightThigh", "R Thigh"], ["rightShin", "R Shin"]] as [keyof BoneAngles, string][]).map(([key, label]) => (
              <Slider key={key} label={label} value={boneDeg(key)} min={-120} max={120}
                onChange={(v) => updateBone(key, v)} onCommit={() => updateBone(key, boneDeg(key), true)} suffix="°" />
            ))}
            <button type="button" onClick={() => {
              if (!isCharacterPose(pose)) return;
              const next = { ...pose, boneAngles: defaultBoneAngles() };
              onLivePoseChange?.(next); onCommitPose?.(next);
            }} className="w-full py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer">
              Reset Bones
            </button>
          </section>
        )}
        <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
          Drag on stage to move. Hold <kbd className="px-1 bg-slate-100 rounded">Alt</kbd> to rotate,{" "}
          <kbd className="px-1 bg-slate-100 rounded">Shift</kbd> to scale. Add a keyframe to capture the current pose.
        </p>
      </div>
    </aside>
  );
}
