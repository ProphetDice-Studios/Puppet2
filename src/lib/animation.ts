import type { CharacterPose, ObjectTransform, Keyframe, BoneAngles } from "../types";
import { defaultCharacterPose, defaultTransform, isCharacterPose } from "../types";

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function ease(t: number, mode: Keyframe["easing"]): number {
  switch (mode) {
    case "easeIn": return t * t;
    case "easeOut": return 1 - (1 - t) * (1 - t);
    case "easeInOut": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default: return t;
  }
}

function lerpTransform(a: ObjectTransform, b: ObjectTransform, t: number): ObjectTransform {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rotation: lerp(a.rotation, b.rotation, t),
    scaleX: lerp(a.scaleX, b.scaleX, t), scaleY: lerp(a.scaleY, b.scaleY, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

function lerpBones(a: BoneAngles, b: BoneAngles, t: number): BoneAngles {
  const out = {} as BoneAngles;
  for (const k of Object.keys(a) as (keyof BoneAngles)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

function lerpCharacterPose(a: CharacterPose, b: CharacterPose, t: number): CharacterPose {
  return {
    transform: lerpTransform(a.transform, b.transform, t),
    boneAngles: lerpBones(a.boneAngles, b.boneAngles, t),
    headTurnX: lerp(a.headTurnX, b.headTurnX, t), headTurnY: lerp(a.headTurnY, b.headTurnY, t),
    blink: lerp(a.blink, b.blink, t), torsoTwist: lerp(a.torsoTwist, b.torsoTwist, t),
    torsoSquash: lerp(a.torsoSquash, b.torsoSquash, t),
  };
}

export function evaluateObjectPose(
  keyframes: Keyframe[], objectId: string, time: number, duration: number,
  isCharacter: boolean, stageW: number, stageH: number
): CharacterPose | ObjectTransform {
  const relevant = keyframes
    .filter((kf) => kf.objectPoses[objectId] !== undefined)
    .sort((a, b) => a.time - b.time);
  if (relevant.length === 0) {
    return isCharacter ? defaultCharacterPose(stageW / 2, stageH / 2) : defaultTransform(stageW / 2, stageH / 2);
  }
  if (time <= relevant[0].time) return relevant[0].objectPoses[objectId];
  if (time >= relevant[relevant.length - 1].time) return relevant[relevant.length - 1].objectPoses[objectId];
  let i = 0;
  while (i < relevant.length - 1 && relevant[i + 1].time < time) i++;
  const a = relevant[i], b = relevant[i + 1];
  const span = b.time - a.time || 1e-6;
  const localT = ease((time - a.time) / span, b.easing);
  const poseA = a.objectPoses[objectId], poseB = b.objectPoses[objectId];
  if (isCharacterPose(poseA) && isCharacterPose(poseB)) return lerpCharacterPose(poseA, poseB, localT);
  const ta = isCharacterPose(poseA) ? poseA.transform : poseA;
  const tb = isCharacterPose(poseB) ? poseB.transform : poseB;
  return lerpTransform(ta, tb, localT);
}

export function upsertKeyframePose(
  keyframes: Keyframe[], time: number, objectId: string,
  pose: CharacterPose | ObjectTransform, label?: string
): Keyframe[] {
  const rounded = Math.round(time * 20) / 20;
  const existing = keyframes.find((k) => Math.abs(k.time - rounded) < 0.03);
  if (existing) {
    return keyframes.map((k) =>
      k.id === existing.id
        ? { ...k, objectPoses: { ...k.objectPoses, [objectId]: pose }, label: label ?? k.label }
        : k
    );
  }
  const newKf: Keyframe = {
    id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    time: rounded, label, easing: "easeInOut", objectPoses: { [objectId]: pose },
  };
  return [...keyframes, newKf].sort((a, b) => a.time - b.time);
}
