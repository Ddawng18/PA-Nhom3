import { describe, expect, it } from "vitest";
import {
  getBrushSettings,
  parseStudioDraft,
  serializeStudioDraft,
  studioCanvasClass,
  getStudioPixelBrush,
  getStudioStampVariant,
} from "./studio";

const png = "data:image/png;base64,AAAA";

describe("studio draft persistence", () => {
  it("reads legacy data-url drafts as paper and soft brush", () => {
    expect(parseStudioDraft(png)).toEqual({ background: "paper", brush: "soft", image: png });
  });

  it("round-trips background and brush", () => {
    const draft = { background: "grid", brush: "marker", image: png } as const;
    expect(parseStudioDraft(serializeStudioDraft(draft))).toEqual(draft);
  });

  it("falls back to defaults for unknown background or brush", () => {
    expect(parseStudioDraft(JSON.stringify({ background: "neon", brush: "spray", image: png })))
      .toEqual({ background: "paper", brush: "soft", image: png });
  });

  it("rejects payloads without a valid image", () => {
    expect(parseStudioDraft(JSON.stringify({ background: "grid", brush: "soft", image: "not-an-image" }))).toBeNull();
    expect(parseStudioDraft(JSON.stringify({ background: "grid" }))).toBeNull();
    expect(parseStudioDraft("{")).toBeNull();
    expect(parseStudioDraft(null)).toBeNull();
  });
});

describe("studio brushes", () => {
  it("makes the three presets visually distinct", () => {
    const soft = getBrushSettings("soft", 10, 1);
    const pencil = getBrushSettings("pencil", 10, 1);
    const marker = getBrushSettings("marker", 10, 1);
    expect(soft).toEqual({ lineCap: "round", lineJoin: "round", lineWidth: 10, alpha: 1 });
    expect(pencil.lineWidth).toBeLessThan(soft.lineWidth);
    expect(pencil.alpha).toBeLessThan(soft.alpha);
    expect(marker.lineWidth).toBeGreaterThan(soft.lineWidth);
    expect(marker.lineCap).toBe("square");
    expect(marker.lineJoin).toBe("bevel");
    expect(marker.alpha).toBeLessThan(soft.alpha);
  });

  it("clamps size and opacity into a safe range", () => {
    expect(getBrushSettings("soft", 0, 0).lineWidth).toBe(1);
    expect(getBrushSettings("soft", 999, 0).lineWidth).toBe(48);
    expect(getBrushSettings("soft", 10, 0).alpha).toBe(0.1);
    expect(getBrushSettings("soft", 10, 5).alpha).toBe(1);
  });
});

describe("studio canvas class", () => {
  it("maps each background to a surface class", () => {
    expect(studioCanvasClass("paper")).toBe("is-paper");
    expect(studioCanvasClass("grid")).toBe("is-grid");
    expect(studioCanvasClass("transparent")).toBe("is-transparent");
  });
});


describe("studio motion", () => {
  it("uses sparse stamps for stipple and solid stamps for the blob brush", () => {
    const stipple = getStudioPixelBrush("stipple", 14);
    const blob = getStudioPixelBrush("blob", 14);
    const ink = (stamp: typeof stipple.stamps[number]) => stamp.reduce((sum, run) => sum + run[2], 0);
    expect(stipple.pixel).toBe(2);
    expect(ink(stipple.stamps[0])).toBeLessThan(ink(blob.stamps[0]) / 2);
    expect(new Set(blob.stamps.map(stamp => JSON.stringify(stamp))).size).toBe(3);
  });

  it("keeps animated stamps on a coarse grid while using compact masks for thin pens", () => {
    const thin = getStudioPixelBrush("soft", 6, true);
    const thick = getStudioPixelBrush("soft", 30, true);
    expect(thin.pixel).toBe(3);
    expect(Math.max(...thin.stamps.flat().map(run => run[2]))).toBe(2);
    expect(thick.pixel).toBe(6);
    expect(getStudioPixelBrush("stipple", 7, true).pixel).toBe(3);
  });

  it("varies the stamp between frames while keeping the original frame centered", () => {
    const frames = Array.from({ length: 3 }, (_, frame) => getStudioStampVariant(1729, 9, frame, 1.7));
    expect(new Set(frames.map(stamp => stamp.variant)).size).toBe(3);
    expect(frames[0]).toMatchObject({ x: 0, y: 0 });
    expect(frames[1].x + frames[2].x).toBe(0);
    expect(frames[1].y + frames[2].y).toBe(0);
    expect(getStudioStampVariant(1729, 9, 1, 0.55)).toMatchObject({ x: 0, y: 0 });
  });
});
