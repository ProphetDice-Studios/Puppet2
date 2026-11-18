import type { RestJoints, Vec2, MeshData } from "../types";

export async function loadImageFromFile(file: File): Promise<{ url: string; img: HTMLImageElement }> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  const img = await loadImage(url);
  return { url, img };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export function removeOpaqueBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance = 42
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const samples: number[][] = [];
  const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]];
  for (const [cx, cy] of corners) {
    const i = (cy * w + cx) * 4;
    if (data[i + 3] > 200) samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (samples.length < 2) return out;
  let r = 0, g = 0, b = 0;
  for (const s of samples) { r += s[0]; g += s[1]; b += s[2]; }
  r /= samples.length; g /= samples.length; b /= samples.length;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - r, dg = data[i + 1] - g, db = data[i + 2] - b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) < tolerance && data[i + 3] > 128) {
      out[i + 3] = 0;
    }
  }
  return out;
}

export function contentBounds(
  data: Uint8ClampedArray, w: number, h: number, alphaThreshold = 12
): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = w, y0 = h, x1 = 0, y1 = 0, found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        found = true;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (!found) return { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
  const pad = Math.max(4, Math.round(Math.max(w, h) * 0.02));
  return {
    x0: Math.max(0, x0 - pad), y0: Math.max(0, y0 - pad),
    x1: Math.min(w - 1, x1 + pad), y1: Math.min(h - 1, y1 + pad),
  };
}

export function estimateJoints(data: Uint8ClampedArray, w: number, h: number): RestJoints {
  const b = contentBounds(data, w, h);
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0, cx = b.x0 + bw * 0.5;
  const headY = b.y0 + bh * 0.08, neckY = b.y0 + bh * 0.16;
  const chestY = b.y0 + bh * 0.28, pelvisY = b.y0 + bh * 0.48;
  const kneeY = b.y0 + bh * 0.72, ankleY = b.y0 + bh * 0.9, footY = b.y0 + bh * 0.96;
  const shoulderSpan = bw * 0.28, hipSpan = bw * 0.14, armOut = bw * 0.38;
  const v = (x: number, y: number): Vec2 => ({ x, y });
  return {
    head: v(cx, headY), neck: v(cx, neckY), chest: v(cx, chestY), pelvis: v(cx, pelvisY),
    leftShoulder: v(cx - shoulderSpan, chestY - bh * 0.02),
    leftElbow: v(cx - armOut, chestY + bh * 0.12),
    leftWrist: v(cx - armOut * 1.05, chestY + bh * 0.22),
    leftHand: v(cx - armOut * 1.08, chestY + bh * 0.26),
    rightShoulder: v(cx + shoulderSpan, chestY - bh * 0.02),
    rightElbow: v(cx + armOut, chestY + bh * 0.12),
    rightWrist: v(cx + armOut * 1.05, chestY + bh * 0.22),
    rightHand: v(cx + armOut * 1.08, chestY + bh * 0.26),
    leftHip: v(cx - hipSpan, pelvisY), leftKnee: v(cx - hipSpan * 0.9, kneeY),
    leftAnkle: v(cx - hipSpan * 0.85, ankleY), leftFoot: v(cx - hipSpan * 0.7, footY),
    rightHip: v(cx + hipSpan, pelvisY), rightKnee: v(cx + hipSpan * 0.9, kneeY),
    rightAnkle: v(cx + hipSpan * 0.85, ankleY), rightFoot: v(cx + hipSpan * 0.7, footY),
  };
}

export function buildMesh(data: Uint8ClampedArray, w: number, h: number, cols = 12, rows = 16): MeshData {
  const b = contentBounds(data, w, h);
  const restVertices = new Float32Array((cols + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const i = (row * (cols + 1) + col) * 2;
      restVertices[i] = b.x0 + (col / cols) * (b.x1 - b.x0);
      restVertices[i + 1] = b.y0 + (row / rows) * (b.y1 - b.y0);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col, bIdx = a + 1, c = a + (cols + 1), d = c + 1;
      indices.push(a, bIdx, c, bIdx, d, c);
    }
  }
  const weights = new Float32Array(restVertices.length / 2);
  weights.fill(1);
  return { restVertices, indices: new Uint16Array(indices), weights };
}

export async function processImage(
  file: File,
  opts: { removeBg?: boolean; asCharacter?: boolean } = {}
): Promise<{
  imageUrl: string; width: number; height: number; isRigged: boolean;
  restJoints?: RestJoints; mesh?: MeshData;
}> {
  const { img } = await loadImageFromFile(file);
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(32, Math.round(img.naturalWidth * scale));
  const h = Math.max(32, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  let imageData = ctx.getImageData(0, 0, w, h);
  if (opts.removeBg !== false) {
    const cleaned = removeOpaqueBackground(new Uint8ClampedArray(imageData.data), w, h);
    imageData = new ImageData(cleaned as Uint8ClampedArray<ArrayBuffer>, w, h);
    ctx.putImageData(imageData, 0, 0);
  }
  const imageUrl = canvas.toDataURL("image/png");
  const asCharacter = opts.asCharacter !== false;
  if (asCharacter) {
    const restJoints = estimateJoints(imageData.data, w, h);
    const mesh = buildMesh(imageData.data, w, h);
    return { imageUrl, width: w, height: h, isRigged: true, restJoints, mesh };
  }
  return { imageUrl, width: w, height: h, isRigged: false };
}
