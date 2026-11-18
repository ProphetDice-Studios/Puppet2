export type Vec2 = { x: number; y: number };

export type ObjectTransform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
};

export type BoneAngles = {
  pelvis: number;
  spine: number;
  neck: number;
  head: number;
  leftUpperArm: number;
  leftLowerArm: number;
  leftHandBone: number;
  rightUpperArm: number;
  rightLowerArm: number;
  rightHandBone: number;
  leftThigh: number;
  leftShin: number;
  leftFootBone: number;
  rightThigh: number;
  rightShin: number;
  rightFootBone: number;
};

export type CharacterPose = {
  transform: ObjectTransform;
  boneAngles: BoneAngles;
  headTurnX: number;
  headTurnY: number;
  blink: number;
  torsoTwist: number;
  torsoSquash: number;
};

export type Keyframe = {
  id: string;
  time: number;
  label?: string;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
  objectPoses: Record<string, CharacterPose | ObjectTransform>;
};

export type RestJoints = {
  head: Vec2;
  neck: Vec2;
  chest: Vec2;
  pelvis: Vec2;
  leftShoulder: Vec2;
  leftElbow: Vec2;
  leftWrist: Vec2;
  leftHand: Vec2;
  rightShoulder: Vec2;
  rightElbow: Vec2;
  rightWrist: Vec2;
  rightHand: Vec2;
  leftHip: Vec2;
  leftKnee: Vec2;
  leftAnkle: Vec2;
  leftFoot: Vec2;
  rightHip: Vec2;
  rightKnee: Vec2;
  rightAnkle: Vec2;
  rightFoot: Vec2;
};

export type MeshData = {
  restVertices: Float32Array;
  indices: Uint16Array;
  weights: Float32Array;
};

export type SceneObjectKind = "character" | "prop" | "background";

export type SceneObject = {
  id: string;
  name: string;
  kind: SceneObjectKind;
  imageUrl: string;
  width: number;
  height: number;
  isRigged: boolean;
  restJoints?: RestJoints;
  mesh?: MeshData;
  zIndex: number;
  locked: boolean;
  visible: boolean;
};

export type Scene = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  objects: SceneObject[];
  keyframes: Keyframe[];
  duration: number;
  loop: boolean;
};

export function defaultTransform(x = 0, y = 0): ObjectTransform {
  return { x, y, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
}

export function defaultBoneAngles(): BoneAngles {
  return {
    pelvis: 0, spine: 0, neck: 0, head: 0,
    leftUpperArm: 0, leftLowerArm: 0, leftHandBone: 0,
    rightUpperArm: 0, rightLowerArm: 0, rightHandBone: 0,
    leftThigh: 0, leftShin: 0, leftFootBone: 0,
    rightThigh: 0, rightShin: 0, rightFootBone: 0,
  };
}

export function defaultCharacterPose(x = 0, y = 0): CharacterPose {
  return {
    transform: defaultTransform(x, y),
    boneAngles: defaultBoneAngles(),
    headTurnX: 0, headTurnY: 0, blink: 0, torsoTwist: 0, torsoSquash: 0,
  };
}

export function clonePose(p: CharacterPose): CharacterPose {
  return {
    transform: { ...p.transform },
    boneAngles: { ...p.boneAngles },
    headTurnX: p.headTurnX, headTurnY: p.headTurnY, blink: p.blink,
    torsoTwist: p.torsoTwist, torsoSquash: p.torsoSquash,
  };
}

export function isCharacterPose(p: CharacterPose | ObjectTransform): p is CharacterPose {
  return (p as CharacterPose).boneAngles !== undefined;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
