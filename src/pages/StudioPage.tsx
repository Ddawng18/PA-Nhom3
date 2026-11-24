import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { learningError, submitAssignment } from "../lib/learningApi";
import {
  getBrushSettings,
  MOTION_FRAME_COUNT,
  MOTION_FRAME_DELAY,
  parseStudioDraft,
  serializeStudioDraft,
  studioBackgrounds,
  studioBrushes,
  studioCanvasClass,
  studioColors,
  studioMotionSpeeds,
  studioMotionStrengths,
  getStudioPixelBrush,
  getStudioStampVariant,
  hasStudioStampShape,
  type StudioBackground,
  type StudioBrush,
} from "../logic/studio";
import "../styles/studio.css";

const WIDTH = 1200;
const HEIGHT = 720;
const GRID_SIZE = 24;
const HISTORY_LIMIT = 30;
const STORAGE_KEY = "linea-studio-v1";
const INTRO_KEY = "linea-studio-intro-v1";
const PAPER_COLOR = "#fffdf7";
type Snapshot = { images: Promise<Blob[]>; hasMotion: boolean; id: number };
type StudioPrompt = {
  title: string;
  description: string;
  background: StudioBackground;
  brush: StudioBrush;
  color: string;
};

const studioPrompts: StudioPrompt[] = [
  { title: "Khối cơ bản", description: "Dựng ba khối lớn trên nền lưới.", background: "grid", brush: "pencil", color: "#26332b" },
  { title: "Sắc độ mềm", description: "Luyện chuyển sắc với cọ mềm.", background: "paper", brush: "soft", color: "#5f7352" },
  { title: "Nét có nhịp", description: "Thử nét chuyển động và độ sần.", background: "paper", brush: "marker", color: "#8a5a42" },
];

function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas encoding failed")), "image/png");
  });
}

function readBlobUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function decodeCanvas(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type StrokePoint = { x: number; y: number };
type TexturedStroke = {
  seed: number;
  distance: number;
  stampIndex: number;
  animated: boolean;
  strength: number;
  brush: ReturnType<typeof getStudioPixelBrush>;
  frames: { ink: CanvasRenderingContext2D; base: HTMLCanvasElement }[];
};

function stampTexture(path: Path2D, point: StrokePoint, stroke: TexturedStroke, step: number, frame: number) {
  const { pixel, stamps } = stroke.brush;
  const stamp = getStudioStampVariant(stroke.seed, step, stroke.animated ? frame : 0, stroke.strength);
  const x = Math.round(point.x / pixel) + stamp.x;
  const y = Math.round(point.y / pixel) + stamp.y;
  for (const [column, row, length] of stamps[stamp.variant]) {
    path.rect((x + column) * pixel, (y + row) * pixel, length * pixel, pixel);
  }
}

function compositeStampBatch(
  context: CanvasRenderingContext2D,
  layer: TexturedStroke["frames"][number],
  path: Path2D,
  from: StrokePoint,
  to: StrokePoint,
  padding: number,
) {
  const x = Math.max(0, Math.floor(Math.min(from.x, to.x) - padding));
  const y = Math.max(0, Math.floor(Math.min(from.y, to.y) - padding));
  const width = Math.min(WIDTH, Math.ceil(Math.max(from.x, to.x) + padding)) - x;
  const height = Math.min(HEIGHT, Math.ceil(Math.max(from.y, to.y) + padding)) - y;
  if (width <= 0 || height <= 0) return;
  layer.ink.fill(path);
  context.save();
  context.globalAlpha = 1;
  context.clearRect(x, y, width, height);
  context.drawImage(layer.base, x, y, width, height, x, y, width, height);
  context.restore();
  context.drawImage(layer.ink.canvas, x, y, width, height, x, y, width, height);
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  return canvas;
}

function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

function paintBackground(context: CanvasRenderingContext2D, background: StudioBackground) {
  if (background === "transparent") return;
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  if (background !== "grid") return;
  context.strokeStyle = "rgba(38, 51, 43, 0.14)";
  context.lineWidth = 1;
  context.beginPath();
  for (let x = GRID_SIZE; x < WIDTH; x += GRID_SIZE) {
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, HEIGHT);
  }
  for (let y = GRID_SIZE; y < HEIGHT; y += GRID_SIZE) {
    context.moveTo(0, y + 0.5);
    context.lineTo(WIDTH, y + 0.5);
  }
  context.stroke();
}

export default function StudioPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const assignmentParam = searchParams.get("assignmentId");
  const assignmentId = assignmentParam && /^\d+$/.test(assignmentParam) ? Number(assignmentParam) : null;
  const backCourseId = searchParams.get("courseId");
  const backLessonId = searchParams.get("lessonId");
  const token = session?.access_token;
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const strokeRect = useRef<DOMRect | null>(null);
  const pendingPoints = useRef<StrokePoint[]>([]);
  const drawFrame = useRef<number | null>(null);
  const lastPoint = useRef({ x: 0, y: 0 });
  const extraFrames = useRef<HTMLCanvasElement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const history = useRef<Snapshot[]>([]);
  const index = useRef(-1);
  const snapshotId = useRef(0);
  const exportedSnapshotId = useRef<number | null>(null);
  const restoreToken = useRef(0);
  const drawing = useRef<number | null>(null);
  const strokeContexts = useRef<CanvasRenderingContext2D[]>([]);
  const texture = useRef<TexturedStroke | null>(null);
  const [ready, setReady] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animatedBrush, setAnimatedBrush] = useState(true);
  const [preview, setPreview] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [motionDelay, setMotionDelay] = useState(MOTION_FRAME_DELAY);
  const [motionStrength, setMotionStrength] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [background, setBackground] = useState<StudioBackground>("paper");
  const [brush, setBrush] = useState<StudioBrush>("soft");
  const [color, setColor] = useState("#26332b");
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [unexported, setUnexported] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState("");
  const [showIntro, setShowIntro] = useState(() => {
    try { return !localStorage.getItem(INTRO_KEY); } catch { return false; }
  });
  const blocker = useBlocker(unexported);
  const { state: blockerState, proceed, reset } = blocker;
  const handledBlocker = useRef(false);
  const canvasBusy = !ready || restoring || isDrawing || exporting;
  const hasMotion = Boolean(history.current[index.current]?.hasMotion);

  const save = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    history.current = history.current.slice(0, index.current + 1);
    const images = Promise.all([canvas, ...extraFrames.current].map(encodeCanvas));
    // Keep the promise available for undo even when autosave has moved on.
    void images.catch(() => {});
    history.current.push({
      images,
      hasMotion: extraFrames.current.length > 0,
      id: ++snapshotId.current,
    });
    if (history.current.length > HISTORY_LIMIT) history.current.shift();
    index.current = history.current.length - 1;
    setUnexported(history.current[index.current].id !== exportedSnapshotId.current);
    setRevision((value) => value + 1);
  };

  const paintSnapshot = useCallback((canvas: HTMLCanvasElement, image: HTMLImageElement, frames: HTMLImageElement[]) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.drawImage(image, 0, 0, WIDTH, HEIGHT);
    extraFrames.current = frames.map(frame => {
      const layer = createCanvas();
      layer.getContext("2d")?.drawImage(frame, 0, 0, WIDTH, HEIGHT);
      return layer;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let cancelled = false;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    let draft = null;
    try { draft = parseStudioDraft(localStorage.getItem(STORAGE_KEY)); } catch { /* Storage can be blocked. */ }
    if (!draft) {
      save();
      exportedSnapshotId.current = history.current[index.current]?.id ?? null;
      setUnexported(false);
      setReady(true);
      return () => { cancelled = true; };
    }
    setBackground(draft.background);
    setBrush(draft.brush);
    setAnimatedBrush(draft.animatedBrush ?? true);
    setMotionDelay(draft.motionDelay ?? MOTION_FRAME_DELAY);
    setMotionStrength(draft.motionStrength ?? 1);
    loadImage(draft.image).then(async image => {
      const frames = await Promise.all((draft.frames ?? []).map(loadImage)).catch(() => []);
      if (cancelled) return;
      paintSnapshot(canvas, image, frames);
      save();
      exportedSnapshotId.current = history.current[index.current]?.id ?? null;
      setUnexported(false);
      setReady(true);
      setNotice("Đã khôi phục bản vẽ đã lưu trên thiết bị.");
    }).catch(() => {
      if (cancelled) return;
      save();
      exportedSnapshotId.current = history.current[index.current]?.id ?? null;
      setUnexported(false);
      setReady(true);
      setNotice("Không thể khôi phục bản vẽ đã lưu.");
    });
    return () => { cancelled = true; };
  }, [paintSnapshot]);

  useEffect(() => {
    if (revision === 0) return;
    const snapshot = history.current[index.current];
    if (!snapshot) return;
    const draftCanvas = canvasRef.current;
    let cancelled = false;
    let saved = false;
    const settings = { background, brush, animatedBrush, motionDelay, motionStrength };
    const persist = (image: string, frames: string[]) => {
      localStorage.setItem(STORAGE_KEY, serializeStudioDraft({ ...settings, image, frames: frames.length ? frames : undefined }));
      saved = true;
      setSaveState("saved");
    };
    setSaveState("saving");
    snapshot.images.then(images => {
      if (!cancelled) return Promise.all(images.map(readBlobUrl));
    }).then(urls => {
      if (urls && !cancelled && !saved && history.current[index.current] === snapshot) {
        const [image, ...frames] = urls;
        persist(image, frames);
      }
    }).catch(() => {
      if (!cancelled) {
        setSaveState("error");
        setNotice("Không thể tự lưu bản vẽ. Hãy tải tranh về thiết bị.");
      }
    });
    const flushOnHide = () => {
      if (saved || !draftCanvas || drawing.current !== null || history.current[index.current] !== snapshot) return;
      try {
        persist(draftCanvas.toDataURL("image/png"), extraFrames.current.map(frame => frame.toDataURL("image/png")));
      } catch { /* The browser can block storage during page exit. */ }
    };
    window.addEventListener("pagehide", flushOnHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", flushOnHide);
      if (draftCanvas && !draftCanvas.isConnected) flushOnHide();
    };
  }, [revision, background, brush, animatedBrush, motionDelay, motionStrength]);

  useEffect(() => () => {
    if (drawFrame.current !== null) window.cancelAnimationFrame(drawFrame.current);
  }, []);

  useEffect(() => {
    const output = previewRef.current;
    const canvas = canvasRef.current;
    const context = output?.getContext("2d");
    if (!output || !canvas || !context || !preview || restoring) return;
    let frame = 0;
    const render = () => {
      const source = frame === 0 ? canvas : extraFrames.current[frame - 1] ?? canvas;
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(source, 0, 0);
      output.dataset.frame = String(frame);
    };
    render();
    const timer = window.setInterval(() => {
      frame = (frame + 1) % (extraFrames.current.length + 1);
      render();
    }, motionDelay);
    return () => window.clearInterval(timer);
  }, [preview, isDrawing, restoring, revision, motionDelay]);

  useEffect(() => {
    if (!unexported) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [unexported]);

  useEffect(() => {
    if (blockerState !== "blocked") { handledBlocker.current = false; return; }
    if (handledBlocker.current) return;
    handledBlocker.current = true;
    if (window.confirm("Bản vẽ đã lưu cục bộ. Rời trang?")) proceed();
    else reset();
  }, [blockerState, proceed, reset]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = strokeRect.current ?? event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || restoring || exporting || drawing.current !== null || event.button !== 0) return;
    const textured = tool === "pen" && animatedBrush;
    if (textured && !extraFrames.current.length) {
      extraFrames.current = Array.from({ length: MOTION_FRAME_COUNT - 1 }, () => {
        const frame = createCanvas();
        frame.getContext("2d")?.drawImage(canvas, 0, 0);
        return frame;
      });
    }
    strokeContexts.current = [canvas, ...extraFrames.current].flatMap(frame => {
      const context = frame.getContext("2d");
      return context ? [context] : [];
    });
    canvas.setPointerCapture(event.pointerId);
    strokeRect.current = canvas.getBoundingClientRect();
    const p = point(event);
    lastPoint.current = p;
    drawing.current = event.pointerId;
    setIsDrawing(true);
    setUnexported(true);
    const preset = getBrushSettings(brush, size, opacity);
    if (textured || (tool === "pen" && hasStudioStampShape(brush))) {
      texture.current = {
        seed: Math.floor(Math.random() * 0x100000000),
        distance: 0, stampIndex: 1, animated: textured, strength: motionStrength,
        brush: getStudioPixelBrush(brush, preset.lineWidth, textured),
        frames: strokeContexts.current.map(context => {
          const base = createCanvas();
          base.getContext("2d")?.drawImage(context.canvas, 0, 0);
          const ink = createCanvas().getContext("2d")!;
          ink.fillStyle = color;
          return { ink, base };
        }),
      };
    }
    strokeContexts.current.forEach((context, frame) => {
      context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      context.lineCap = tool === "eraser" ? "round" : preset.lineCap;
      context.lineJoin = tool === "eraser" ? "round" : preset.lineJoin;
      context.lineWidth = tool === "eraser" ? size : preset.lineWidth;
      context.strokeStyle = tool === "eraser" ? "#000" : color;
      context.globalAlpha = tool === "eraser" ? 1 : preset.alpha;
      const stroke = texture.current;
      if (stroke) {
        const path = new Path2D();
        stampTexture(path, p, stroke, 0, frame);
        compositeStampBatch(context, stroke.frames[frame], path, p, p, stroke.brush.padding);
        return;
      }
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.lineTo(p.x + 0.01, p.y + 0.01);
      context.stroke();
    });
  };
  const flushStroke = () => {
    if (drawFrame.current !== null) window.cancelAnimationFrame(drawFrame.current);
    drawFrame.current = null;
    const points = pendingPoints.current;
    pendingPoints.current = [];
    if (!points.length) return;
    const stroke = texture.current;
    if (!stroke) {
      for (const context of strokeContexts.current) {
        for (const p of points) context.lineTo(p.x, p.y);
        context.stroke();
      }
      lastPoint.current = points[points.length - 1];
      return;
    }

    const samples: { point: StrokePoint; step: number }[] = [];
    const min = { ...lastPoint.current };
    const max = { ...lastPoint.current };
    for (const p of points) {
      const from = lastPoint.current;
      lastPoint.current = p;
      const length = Math.hypot(p.x - from.x, p.y - from.y);
      if (!length) continue;
      const end = stroke.distance + length;
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
      while (stroke.stampIndex * stroke.brush.spacing <= end) {
        const t = (stroke.stampIndex * stroke.brush.spacing - stroke.distance) / length;
        samples.push({ point: { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t }, step: stroke.stampIndex++ });
      }
      stroke.distance = end;
    }
    if (!samples.length) return;
    strokeContexts.current.forEach((context, frame) => {
      const path = new Path2D();
      for (const sample of samples) stampTexture(path, sample.point, stroke, sample.step, frame);
      compositeStampBatch(context, stroke.frames[frame], path, min, max, stroke.brush.padding);
    });
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== event.pointerId) return;
    const events = event.nativeEvent.getCoalescedEvents?.();
    const rect = strokeRect.current;
    if (!rect) return;
    for (const sample of events?.length ? events : [event]) {
      pendingPoints.current.push({
        x: (sample.clientX - rect.left) * WIDTH / rect.width,
        y: (sample.clientY - rect.top) * HEIGHT / rect.height,
      });
    }
    if (drawFrame.current === null) drawFrame.current = window.requestAnimationFrame(flushStroke);
  };
  const stop = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== event.pointerId) return;
    if (event.type === "pointerup") pendingPoints.current.push(point(event));
    flushStroke();
    strokeRect.current = null;
    const stroke = texture.current;
    if (stroke && stroke.distance - (stroke.stampIndex - 1) * stroke.brush.spacing > stroke.brush.spacing / 2) {
      const p = lastPoint.current;
      strokeContexts.current.forEach((context, frame) => {
        const path = new Path2D();
        stampTexture(path, p, stroke, stroke.stampIndex, frame);
        compositeStampBatch(context, stroke.frames[frame], path, p, p, stroke.brush.padding);
      });
    }
    drawing.current = null;
    setIsDrawing(false);
    for (const context of strokeContexts.current) {
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    }
    strokeContexts.current = [];
    texture.current = null;
    save();
    setUnexported(true);
  };
  const restore = useCallback((next: number) => {
    const snapshot = history.current[next];
    const canvas = canvasRef.current;
    if (!snapshot || !canvas || drawing.current !== null) return;
    const token = ++restoreToken.current;
    setRestoring(true);
    snapshot.images.then(images => Promise.all(images.map(decodeCanvas))).then(([image, ...frames]) => {
      if (token !== restoreToken.current) return;
      paintSnapshot(canvas, image, frames);
      index.current = next;
      setUnexported(snapshot.id !== exportedSnapshotId.current);
      setRevision((value) => value + 1);
    }).catch(() => {
      if (token === restoreToken.current) setNotice("Không thể khôi phục bước vẽ này.");
    }).finally(() => {
      if (token === restoreToken.current) setRestoring(false);
    });
  }, [paintSnapshot]);
  const clear = () => {
    if (!window.confirm("Xóa toàn bộ tranh hiện tại?")) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    extraFrames.current = [];
    context.clearRect(0, 0, WIDTH, HEIGHT); save(); setNotice("Đã xóa tranh.");
  };
  const changeBackground = (next: StudioBackground) => {
    setBackground(next);
    setUnexported(true);
    const label = studioBackgrounds.find((item) => item.value === next)?.label ?? "mới";
    setNotice(`Đã đổi nền: ${label}. Nét vẽ được giữ nguyên.`);
  };
  const importImage = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
      setNotice("Chọn ảnh JPG, PNG hoặc WEBP tối đa 10 MB.");
      return;
    }
    setRestoring(true);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min((WIDTH * 0.8) / image.width, (HEIGHT * 0.8) / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      for (const frame of [canvasRef.current, ...extraFrames.current]) {
        frame?.getContext("2d")?.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      }
      URL.revokeObjectURL(url);
      save();
      setUnexported(true);
      setNotice("Đã chèn ảnh vào bản vẽ.");
      setRestoring(false);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setNotice("Không thể đọc ảnh này."); setRestoring(false); };
    image.src = url;
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if (!ready || restoring || exporting || drawing.current !== null) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        restore(event.shiftKey ? index.current + 1 : index.current - 1);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        restore(index.current + 1);
      } else if (event.key.toLowerCase() === "b") {
        setTool("pen");
      } else if (event.key.toLowerCase() === "e") {
        setTool("eraser");
      } else if (event.key === "[") {
        setSize((value) => Math.max(1, value - 2));
      } else if (event.key === "]") {
        setSize((value) => Math.min(48, value + 2));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, restoring, exporting, restore]);
  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const output = createCanvas();
    const context = output.getContext("2d");
    if (!context) { setNotice("Trình duyệt không thể xuất PNG."); return; }
    paintBackground(context, background);
    context.drawImage(canvas, 0, 0);
    const link = document.createElement("a"); link.download = "linea-studio.png";
    link.href = output.toDataURL("image/png"); link.click();
    exportedSnapshotId.current = history.current[index.current]?.id ?? null;
    setUnexported(false); setNotice("Đã tải PNG về thiết bị.");
  };

  const exportGif = async () => {
    const canvas = canvasRef.current;
    if (canvasBusy || !canvas || !extraFrames.current.length) return;
    setExporting(true);
    setNotice("Đang tạo GIF...");
    try {
      const { encodeStudioGif } = await import("../logic/studioGif");
      const output = createCanvas();
      const context = output.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas not available");
      const frames = [canvas, ...extraFrames.current].map(frame => {
        context.clearRect(0, 0, WIDTH, HEIGHT);
        paintBackground(context, background);
        context.drawImage(frame, 0, 0);
        return context.getImageData(0, 0, WIDTH, HEIGHT);
      });
      const url = URL.createObjectURL(encodeStudioGif(frames, background === "transparent", motionDelay));
      const link = document.createElement("a");
      link.download = "linea-studio.gif";
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      exportedSnapshotId.current = history.current[index.current]?.id ?? null;
      setUnexported(false);
      setNotice("Đã tải GIF về thiết bị.");
    } catch {
      setNotice("Không thể xuất GIF. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  async function submitDrawing() {
    const canvas = canvasRef.current;
    if (!canvas || !token || !assignmentId || submitting || exporting) return;
    setSubmitting(true);
    setSubmitNotice("Đang nộp bản vẽ...");
    try {
      const blob = await encodeCanvas(canvas);
      const file = new File([blob], "linea-studio.png", { type: "image/png" });
      await submitAssignment(token, assignmentId, file);
      setSubmitNotice(`Đã nộp bản vẽ vào bài tập #${assignmentId}.`);
    } catch (error) {
      setSubmitNotice(learningError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function dismissIntro() {
    try { localStorage.setItem(INTRO_KEY, "seen"); } catch { /* localStorage unavailable */ }
    setShowIntro(false);
  }

  function applyPrompt(prompt: StudioPrompt) {
    setBackground(prompt.background);
    setBrush(prompt.brush);
    setColor(prompt.color);
    setTool("pen");
    setNotice(`Gợi ý: ${prompt.title} — ${prompt.description}`);
  }

  return <div className="studio-page" ref={pageRef}><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
    <main className="studio-main">
      <header className="studio-heading"><div><p className="guest-eyebrow">STUDIO LUYỆN VẼ</p><h1>Không gian sáng tạo</h1><p>Vẽ một nét và xem nó chuyển động ngay trên giấy.</p></div><Link to="/courses">Khám phá khóa học</Link></header>
      {showIntro && <section className="studio-intro" aria-labelledby="studio-intro-title">
        <div><p className="guest-eyebrow">LẦN ĐẦU VÀO STUDIO</p><h2 id="studio-intro-title">Bắt đầu trong ba bước</h2></div>
        <ol><li><strong>1. Chọn cọ và màu</strong><span>Dùng thanh công cụ hoặc bảng màu bên dưới.</span></li><li><strong>2. Vẽ trên giấy</strong><span>Kéo chuột hoặc ngón tay trực tiếp lên canvas.</span></li><li><strong>3. Lưu hoặc nộp</strong><span>Tải PNG/GIF hoặc nộp vào bài tập đang mở.</span></li></ol>
        <button className="button button-primary" type="button" onClick={dismissIntro}>Bắt đầu vẽ</button>
      </section>}
      <section className="studio-prompts" aria-labelledby="studio-prompts-title">
        <div><p className="guest-eyebrow">GỢI Ý LUYỆN TẬP</p><h2 id="studio-prompts-title">Hôm nay vẽ gì?</h2></div>
        <div className="studio-prompt-list">{studioPrompts.map((prompt) => <button key={prompt.title} type="button" onClick={() => applyPrompt(prompt)}><strong>{prompt.title}</strong><span>{prompt.description}</span></button>)}</div>
      </section>
      <div className="studio-toolbar" role="toolbar" aria-label="Công cụ vẽ">
        <button type="button" className={tool === "pen" ? "selected" : ""} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>Bút</button>
        <button type="button" className={tool === "eraser" ? "selected" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>Tẩy</button>
        <span className="studio-tool-divider" aria-hidden="true" />
        <button type="button" className={animatedBrush ? "selected" : ""} aria-pressed={animatedBrush}
          disabled={tool === "eraser" || canvasBusy} onClick={() => {
            const next = !animatedBrush;
            setAnimatedBrush(next);
            if (next && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPreview(true);
            setNotice(next ? "Mẫu dấu của cọ sẽ thay đổi giữa các khung hình." : "Nét vẽ mới sẽ đứng yên.");
          }}>Nét chuyển động</button>
        <button type="button" aria-pressed={preview && hasMotion} disabled={!hasMotion || canvasBusy}
          onClick={() => setPreview(value => !value)}>{preview && hasMotion ? "Dừng xem thử" : "Xem chuyển động"}</button>
        <label>Độ sần <select aria-label="Độ sần" value={motionStrength} disabled={canvasBusy || !animatedBrush} onChange={event => setMotionStrength(Number(event.target.value))}>
          {studioMotionStrengths.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        <label>Tốc độ <select aria-label="Tốc độ chuyển động" value={motionDelay} onChange={event => setMotionDelay(Number(event.target.value))}>
          {studioMotionSpeeds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        <span className="studio-tool-divider" aria-hidden="true" />
        <label>Nền <select aria-label="Nền canvas" value={background} disabled={canvasBusy} onChange={(event) => {
          const next = studioBackgrounds.find((item) => item.value === event.target.value);
          if (next) changeBackground(next.value);
        }}>{studioBackgrounds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Màu <input aria-label="Màu nét vẽ" type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={tool === "eraser"} /></label>
        <label>Cỡ nét <input aria-label="Cỡ nét" type="range" min="1" max="48" value={size} onChange={(event) => setSize(Number(event.target.value))} /><span>{size}px</span></label>
        <label>Độ đậm <input aria-label="Độ đậm nét vẽ" type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} disabled={tool === "eraser"} /><span>{Math.round(opacity * 100)}%</span></label>
        <span className="studio-tool-divider" aria-hidden="true" />
        <button type="button" onClick={() => restore(index.current - 1)} disabled={canvasBusy || index.current <= 0}>Hoàn tác</button>
        <button type="button" onClick={() => restore(index.current + 1)} disabled={canvasBusy || index.current >= history.current.length - 1}>Làm lại</button>
        <span className="studio-tool-divider" aria-hidden="true" />
        <button type="button" disabled={canvasBusy} onClick={() => fileRef.current?.click()}>Chèn ảnh</button>
        <input ref={fileRef} className="sr-only" type="file" aria-label="Chọn ảnh để chèn vào bản vẽ" accept="image/jpeg,image/png,image/webp" onChange={(event) => { importImage(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        <button type="button" disabled={canvasBusy} onClick={clear}>Xóa tranh</button>
        <span className="studio-zoom" aria-label="Thu phóng">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>+</button>
          <button type="button" onClick={() => setZoom(1)}>Vừa</button>
        </span>
      </div>
      <div className="studio-palette">
        <div className="studio-brush-picks" role="group" aria-label="Kiểu bút">
          {studioBrushes.map(item => <button key={item.value} type="button" disabled={canvasBusy}
            aria-pressed={tool === "pen" && brush === item.value} onClick={() => { setBrush(item.value); setTool("pen"); }}>
            <span className={`studio-brush-sample is-${item.value}`} aria-hidden="true" />{item.label}
          </button>)}
        </div>
        <div className="studio-swatches" role="group" aria-label="Bảng màu">
          {studioColors.map(item => <button key={item.value} type="button" aria-label={item.label} title={item.label}
            aria-pressed={tool === "pen" && color === item.value} disabled={canvasBusy}
            onClick={() => { setColor(item.value); setTool("pen"); }}><span style={{ backgroundColor: item.value }} /></button>)}
        </div>
      </div>
      <div className="studio-canvas-wrap">
        <div className={`studio-stage ${studioCanvasClass(background)}`} style={{ width: `${zoom * 100}%` }}>
          <canvas ref={canvasRef} className="studio-canvas" width={WIDTH} height={HEIGHT} aria-label="Vùng vẽ. Dùng chuột hoặc cảm ứng để vẽ." onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} />
          {preview && !restoring && (hasMotion || (isDrawing && texture.current?.animated)) &&
            <canvas ref={previewRef} className="studio-motion-preview" width={WIDTH} height={HEIGHT} aria-hidden="true" />}
        </div>
      </div>
      <div className="studio-footer">
        <span role="status">{submitNotice || notice || "Bật Nét chuyển động để tạo tranh GIF."}</span>
        <span className={`studio-save-status is-${saveState}`} aria-live="polite">{saveState === "saving" ? "Đang tự lưu..." : saveState === "saved" ? "Đã lưu trên thiết bị" : saveState === "error" ? "Chưa lưu được" : ""}</span>
        <div className="studio-export-actions">
          {assignmentId && token && <button type="button" disabled={canvasBusy || submitting || exporting} onClick={() => void submitDrawing()}>{submitting ? "Đang nộp..." : "Nộp vào bài tập"}</button>}
          {assignmentId && backCourseId && backLessonId && <Link className="studio-back-link" to={`/courses/${backCourseId}/learn/${backLessonId}`}>Quay lại bài học</Link>}
          <button type="button" disabled={canvasBusy} onClick={exportPng}>Tải PNG</button>
          <button type="button" disabled={canvasBusy || !hasMotion} onClick={() => void exportGif()}>{exporting ? "Đang tạo GIF..." : "Tải GIF"}</button>
        </div>
      </div>
      <p className="studio-note">Bản vẽ được lưu trên trình duyệt này, chưa đồng bộ vào Tác phẩm. Tải PNG/GIF để giữ bản sao trên thiết bị.</p>
      <span className="sr-only" aria-live="polite">{revision ? "Bản vẽ đã cập nhật" : ""}</span>
    </main>
  </div>;
}
