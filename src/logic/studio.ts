export const studioBackgrounds = [
  { value: "paper", label: "Giấy trắng" },
  { value: "grid", label: "Lưới" },
  { value: "transparent", label: "Trong suốt" },
] as const;

export type StudioBackground = (typeof studioBackgrounds)[number]["value"];

export const studioBrushes = [
  { value: "soft", label: "Bút mềm" },
  { value: "pencil", label: "Bút chì" },
  { value: "marker", label: "Bút marker" },
  { value: "stipple", label: "Cọ hạt" },
  { value: "blob", label: "Cọ mảng" },
  { value: "chalk", label: "Phấn khô" },
  { value: "hatch", label: "Cọ gạch" },
  { value: "spark", label: "Cọ tia" },
] as const;

export type StudioBrush = (typeof studioBrushes)[number]["value"];

export type StudioDraft = {
  background: StudioBackground;
  brush: StudioBrush;
  image: string;
  frames?: string[];
  animatedBrush?: boolean;
  motionDelay?: number;
  motionStrength?: number;
};

export const MOTION_FRAME_COUNT = 3;
export const MOTION_FRAME_DELAY = 120;

export const studioColors = [
  { value: "#26332b", label: "Mực đen" },
  { value: "#c0403e", label: "Đỏ gạch" },
  { value: "#e39831", label: "Vàng nghệ" },
  { value: "#397c62", label: "Xanh lá" },
  { value: "#3965a1", label: "Xanh lam" },
  { value: "#8e4b83", label: "Tím mận" },
] as const;

export const studioMotionStrengths = [
  { value: 0.55, label: "Nhẹ" },
  { value: 1, label: "Vừa" },
  { value: 1.7, label: "Mạnh" },
] as const;

export const studioMotionSpeeds = [
  { value: 180, label: "Chậm" },
  { value: MOTION_FRAME_DELAY, label: "Vừa" },
  { value: 80, label: "Nhanh" },
] as const;

export type StudioPixelStamp = readonly [x: number, y: number, length: number][];

function pixelStamp(rows: string[]): StudioPixelStamp {
  return rows.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run): [number, number, number] =>
    [run.index - Math.floor(row.length / 2), y - Math.floor(rows.length / 2), run[0].length]));
}

const pixelBrushes = {
  soft: { spacing: 1, stamps: [
    [".###.", "#####", "#####", "#####", ".##.."],
    ["..##.", ".####", "#####", "#####", ".###."],
    [".##..", "#####", "#####", "####.", ".###."],
  ] },
  pencil: { spacing: 1, stamps: [
    [".#.", "##.", ".#."], ["...", ".##", ".#."], [".#.", ".##", "..."],
  ] },
  marker: { spacing: 2, stamps: [
    ["#####", "#####", "#####", "#####", ".####"],
    [".####", "#####", "#####", "#####", "####."],
    ["####.", "#####", "#####", "#####", "#####"],
  ] },
  stipple: { spacing: 4, stamps: [
    ["....#..", ".#.....", "...#...", ".......", "#...#..", "......#", "..#...."],
    ["..#....", ".....#.", ".......", ".#...#.", "...#...", "#......", "....#.."],
    ["......#", "...#...", ".#.....", "....#..", ".......", "..#...#", ".#....."],
  ] },
  blob: { spacing: 4, stamps: [
    ["..###..", ".#####.", "######.", "#######", "#######", ".#####.", "..##..."],
    ["...##..", "..####.", ".#####.", "#######", "#######", ".######", "..####."],
    ["..###..", ".#####.", ".######", "#######", "######.", "#####..", "..###.."],
  ] },
  chalk: { spacing: 3, stamps: [
    ["..##...", ".#.###.", "###..#.", ".####..", "#.##.##", "..#.#..", "....#.."],
    ["...#...", ".##.##.", "#.###.#", ".##.##.", ".###...", "#..#.#.", "...##.."],
    ["..#.#..", ".#..##.", "###.#.#", "..####.", "#.###..", ".#...#.", "..##..."],
  ] },
  hatch: { spacing: 5, stamps: [
    ["....##.", "...##..", "..##...", ".##....", "##.....", ".......", "......."],
    [".....##", "....##.", "...##..", "..##...", ".##....", ".......", "......."],
    [".......", "....##.", "...##..", "..##...", ".##....", "##.....", "......."],
  ] },
  spark: { spacing: 8, stamps: [
    ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
    ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
    ["...#...", ".#.#.#.", "..###..", "#######", "..###..", ".#.#.#.", "...#..."],
  ] },
} satisfies Record<StudioBrush, { spacing: number; stamps: string[][] }>;

export function hasStudioStampShape(brush: StudioBrush) {
  return brush !== "soft" && brush !== "pencil" && brush !== "marker";
}

const compactPixelStamps = {
  soft: [["##", "#."], [".#", "##"], ["##", ".#"]],
  pencil: [["#.", ".#"], [".#", "#."], ["..", "##"]],
  marker: [["###", "###", ".##"], ["###", "###", "##."], [".##", "###", "###"]],
};

export function getStudioPixelBrush(brush: StudioBrush, width: number, animated = false) {
  const definition = pixelBrushes[brush];
  // Motion brushes share a visible pixel grid on the high-resolution Studio canvas.
  const grid = animated ? 3 : 1;
  const compact = animated && width < 12 && (brush === "soft" || brush === "pencil" || brush === "marker");
  const masks = compact ? compactPixelStamps[brush] : definition.stamps;
  const pixel = grid * Math.max(1, Math.round(width / (masks[0].length * grid)));
  return {
    pixel,
    padding: pixel * (Math.ceil(masks[0].length / 2) + 2),
    spacing: pixel * definition.spacing,
    stamps: masks.map(pixelStamp),
  };
}

export function getStudioStampVariant(seed: number, step: number, frame: number, strength: number) {
  const hash = Math.imul(seed ^ Math.imul(step + 1, 0x9e3779b1), 0x85ebca6b);
  const bits = (hash ^ (hash >>> 16)) >>> 0;
  const variant = (bits % 3 + frame) % 3;
  const offset = frame === 0 ? 0 : (frame === 1 ? 1 : -1);
  const shift = strength >= 1.7 ? 1 : Number(strength >= 1 && (bits & 3) === 0);
  return { variant, x: offset * shift * ((bits & 4) ? 1 : -1), y: offset * shift * ((bits & 8) ? 1 : -1) };
}

export type StudioBrushSettings = {
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineWidth: number;
  alpha: number;
};

const backgroundValues: readonly string[] = studioBackgrounds.map((item) => item.value);
const brushValues: readonly string[] = studioBrushes.map((item) => item.value);

function isBackground(value: unknown): value is StudioBackground {
  return typeof value === "string" && backgroundValues.includes(value);
}

function isBrush(value: unknown): value is StudioBrush {
  return typeof value === "string" && brushValues.includes(value);
}

export function studioCanvasClass(background: StudioBackground): string {
  return `is-${background}`;
}

export function getBrushSettings(brush: StudioBrush, size: number, opacity: number): StudioBrushSettings {
  const width = Math.min(48, Math.max(1, Number.isFinite(size) ? size : 6));
  const alpha = Math.min(1, Math.max(0.1, Number.isFinite(opacity) ? opacity : 1));
  if (brush === "pencil") {
    return { lineCap: "round", lineJoin: "round", lineWidth: Math.max(1, width * 0.55), alpha: alpha * 0.75 };
  }
  if (brush === "marker") {
    return { lineCap: "square", lineJoin: "bevel", lineWidth: width * 1.6, alpha: alpha * 0.9 };
  }
  return { lineCap: "round", lineJoin: "round", lineWidth: width, alpha };
}

export function parseStudioDraft(raw: string | null): StudioDraft | null {
  if (!raw) return null;
  if (raw.startsWith("data:image/")) {
    return { background: "paper", brush: "soft", image: raw };
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const image = record.image;
    if (typeof image !== "string" || !image.startsWith("data:image/")) return null;
    return {
      background: isBackground(record.background) ? record.background : "paper",
      brush: isBrush(record.brush) ? record.brush : "soft",
      image,
      ...(Array.isArray(record.frames)
        && record.frames.length === MOTION_FRAME_COUNT - 1
        && record.frames.every((frame) => typeof frame === "string" && frame.startsWith("data:image/png"))
        ? { frames: record.frames as string[] } : {}),
      ...(typeof record.animatedBrush === "boolean" ? { animatedBrush: record.animatedBrush } : {}),
      ...(studioMotionSpeeds.some(speed => speed.value === record.motionDelay) ? { motionDelay: record.motionDelay as number } : {}),
      ...(studioMotionStrengths.some(strength => strength.value === record.motionStrength) ? { motionStrength: record.motionStrength as number } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeStudioDraft(draft: StudioDraft): string {
  return JSON.stringify(draft);
}
