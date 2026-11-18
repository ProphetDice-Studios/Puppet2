import { useCallback, useEffect, useRef, useState } from "react";
import type { Scene, CharacterPose, ObjectTransform, SceneObject } from "../types";
import { isCharacterPose } from "../types";

type Props = {
  scene: Scene;
  poses: Record<string, CharacterPose | ObjectTransform>;
  selectedId: string | null;
  mode: "animate" | "arrange";
  onSelect: (id: string | null) => void;
  onLivePoseChange: (objectId: string, pose: CharacterPose | ObjectTransform) => void;
  onCommitPose: (objectId: string, pose: CharacterPose | ObjectTransform) => void;
  onDropFiles: (files: FileList) => void;
};

type DragState = {
  objectId: string;
  startX: number;
  startY: number;
  origPose: CharacterPose | ObjectTransform;
  mode: "move" | "rotate" | "scale";
};

export function Stage({ scene, poses, selectedId, onSelect, onLivePoseChange, onCommitPose, onDropFiles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    for (const obj of scene.objects) {
      if (!imagesRef.current.has(obj.id)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = obj.imageUrl;
        imagesRef.current.set(obj.id, img);
      }
    }
    for (const id of imagesRef.current.keys()) {
      if (!scene.objects.find((o) => o.id === id)) imagesRef.current.delete(id);
    }
  }, [scene.objects]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth, displayH = canvas.clientHeight;
    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(displayW / scene.width, displayH / scene.height) * 0.92;
    const ox = (displayW - scene.width * scale) / 2;
    const oy = (displayH - scene.height * scale) / 2;
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.fillStyle = scene.backgroundColor;
    ctx.fillRect(0, 0, scene.width, scene.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, scene.width, scene.height);
    ctx.clip();
    const check = 16;
    for (let y = 0; y < scene.height; y += check) {
      for (let x = 0; x < scene.width; x += check) {
        if ((Math.floor(x / check) + Math.floor(y / check)) % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.03)";
          ctx.fillRect(x, y, check, check);
        }
      }
    }
    ctx.restore();
    const sorted = [...scene.objects].sort((a, b) => a.zIndex - b.zIndex);
    for (const obj of sorted) {
      if (!obj.visible) continue;
      const pose = poses[obj.id];
      if (!pose) continue;
      const t = isCharacterPose(pose) ? pose.transform : pose;
      const img = imagesRef.current.get(obj.id);
      if (!img || !img.complete) continue;
      ctx.save();
      ctx.globalAlpha = t.opacity;
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.scale(t.scaleX, t.scaleY);
      const hw = obj.width / 2, hh = obj.height / 2;
      ctx.drawImage(img, -hw, -hh, obj.width, obj.height);
      if (obj.id === selectedId) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 / Math.max(Math.abs(t.scaleX), Math.abs(t.scaleY)) / scale;
        ctx.setLineDash([6 / scale, 4 / scale]);
        ctx.strokeRect(-hw - 2, -hh - 2, obj.width + 4, obj.height + 4);
        ctx.setLineDash([]);
        if (obj.isRigged && obj.restJoints && isCharacterPose(pose)) {
          drawBoneOverlay(ctx, obj, scale);
        }
      }
      ctx.restore();
    }
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(0, 0, scene.width, scene.height);
    ctx.restore();
    (canvas as any).__view = { scale, ox, oy };
  }, [scene, poses, selectedId]);

  useEffect(() => {
    let raf = 0;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const screenToStage = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const view = (canvas as any).__view || { scale: 1, ox: 0, oy: 0 };
    return { x: (clientX - rect.left - view.ox) / view.scale, y: (clientY - rect.top - view.oy) / view.scale };
  };

  const hitTest = (sx: number, sy: number): SceneObject | null => {
    const sorted = [...scene.objects].sort((a, b) => b.zIndex - a.zIndex);
    for (const obj of sorted) {
      if (!obj.visible || obj.locked) continue;
      const pose = poses[obj.id];
      if (!pose) continue;
      const t = isCharacterPose(pose) ? pose.transform : pose;
      const dx = sx - t.x, dy = sy - t.y;
      const cos = Math.cos(-t.rotation), sin = Math.sin(-t.rotation);
      const lx = (dx * cos - dy * sin) / t.scaleX;
      const ly = (dx * sin + dy * cos) / t.scaleY;
      if (Math.abs(lx) <= obj.width / 2 && Math.abs(ly) <= obj.height / 2) return obj;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { x, y } = screenToStage(e.clientX, e.clientY);
    const hit = hitTest(x, y);
    if (!hit) { onSelect(null); return; }
    onSelect(hit.id);
    const pose = poses[hit.id];
    if (!pose) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      objectId: hit.id, startX: x, startY: y,
      origPose: JSON.parse(JSON.stringify(pose)),
      mode: e.altKey ? "rotate" : e.shiftKey ? "scale" : "move",
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = screenToStage(e.clientX, e.clientY);
    const orig = drag.origPose;
    const ot = isCharacterPose(orig) ? orig.transform : orig;
    let next: CharacterPose | ObjectTransform;
    if (drag.mode === "move") {
      const newT = { ...ot, x: ot.x + (x - drag.startX), y: ot.y + (y - drag.startY) };
      next = isCharacterPose(orig) ? { ...orig, transform: newT } : newT;
    } else if (drag.mode === "rotate") {
      const a0 = Math.atan2(drag.startY - ot.y, drag.startX - ot.x);
      const a1 = Math.atan2(y - ot.y, x - ot.x);
      const newT = { ...ot, rotation: ot.rotation + (a1 - a0) };
      next = isCharacterPose(orig) ? { ...orig, transform: newT } : newT;
    } else {
      const d0 = Math.hypot(drag.startX - ot.x, drag.startY - ot.y) || 1;
      const d1 = Math.hypot(x - ot.x, y - ot.y);
      const s = Math.max(0.1, Math.min(5, (d1 / d0) * Math.abs(ot.scaleX)));
      const newT = { ...ot, scaleX: s * Math.sign(ot.scaleX || 1), scaleY: s * Math.sign(ot.scaleY || 1) };
      next = isCharacterPose(orig) ? { ...orig, transform: newT } : newT;
    }
    onLivePoseChange(drag.objectId, next);
    (canvasRef.current as any).__lastLive = next;
  };

  const onPointerUp = () => {
    if (!drag) return;
    const last = (canvasRef.current as any).__lastLive as CharacterPose | ObjectTransform | undefined;
    if (last) onCommitPose(drag.objectId, last);
    else if (poses[drag.objectId]) onCommitPose(drag.objectId, poses[drag.objectId]);
    setDrag(null);
  };

  return (
    <div className={`flex-1 relative min-h-[280px] stage-checkerboard overflow-hidden ${dragOver ? "ring-2 ring-blue-500 ring-inset" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files); }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-default touch-none"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
      {scene.objects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-6 py-8 rounded-2xl bg-white/80 border border-slate-200 shadow-sm max-w-sm">
            <p className="text-sm font-semibold text-slate-800 mb-1">Build a scene</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drop multiple PNGs here — characters, props, backgrounds. Drag to move, Alt-drag to rotate, Shift-drag to scale.
            </p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-white/70 px-1.5 py-0.5 rounded">
        {scene.width}×{scene.height}
        {drag && <span className="ml-2 text-blue-600">{drag.mode === "move" ? "Move" : drag.mode === "rotate" ? "Rotate" : "Scale"}</span>}
      </div>
    </div>
  );
}

function drawBoneOverlay(ctx: CanvasRenderingContext2D, obj: SceneObject, viewScale: number) {
  const j = obj.restJoints!;
  ctx.strokeStyle = "rgba(37, 99, 235, 0.7)";
  ctx.lineWidth = 2 / viewScale;
  ctx.lineCap = "round";
  const pairs: [keyof typeof j, keyof typeof j][] = [
    ["head", "neck"], ["neck", "chest"], ["chest", "pelvis"],
    ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
    ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"],
    ["leftHip", "leftKnee"], ["leftKnee", "leftAnkle"],
    ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"],
  ];
  const cx = obj.width / 2, cy = obj.height / 2;
  for (const [a, b] of pairs) {
    const pa = j[a], pb = j[b];
    ctx.beginPath();
    ctx.moveTo(pa.x - cx, pa.y - cy);
    ctx.lineTo(pb.x - cx, pb.y - cy);
    ctx.stroke();
  }
  ctx.fillStyle = "#2563eb";
  for (const key of Object.keys(j) as (keyof typeof j)[]) {
    const p = j[key];
    ctx.beginPath();
    ctx.arc(p.x - cx, p.y - cy, 3 / viewScale, 0, Math.PI * 2);
    ctx.fill();
  }
}
