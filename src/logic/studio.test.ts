import { describe, expect, it } from "vitest";
import {
  getBrushSettings,
  parseStudioDraft,
  serializeStudioDraft,
  studioCanvasClass,
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
