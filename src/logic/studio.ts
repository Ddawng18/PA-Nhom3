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
] as const;

export type StudioBrush = (typeof studioBrushes)[number]["value"];

export type StudioDraft = {
  background: StudioBackground;
  brush: StudioBrush;
  image: string;
};

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
    };
  } catch {
    return null;
  }
}

export function serializeStudioDraft(draft: StudioDraft): string {
  return JSON.stringify(draft);
}
