import { useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/studio.css";

const WIDTH = 1200;
const HEIGHT = 720;
const HISTORY_LIMIT = 30;
const STORAGE_KEY = "linea-studio-v1";
type Snapshot = { image: ImageData; id: number };

export default function StudioPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const history = useRef<Snapshot[]>([]);
  const index = useRef(-1);
  const snapshotId = useRef(0);
  const exportedSnapshotId = useRef<number | null>(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#26332b");
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [unexported, setUnexported] = useState(false);
  const blocker = useBlocker(unexported);
  const { state: blockerState, proceed, reset } = blocker;
  const handledBlocker = useRef(false);

  const save = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    history.current = history.current.slice(0, index.current + 1);
    history.current.push({ image: context.getImageData(0, 0, WIDTH, HEIGHT), id: ++snapshotId.current });
    if (history.current.length > HISTORY_LIMIT) history.current.shift();
    index.current = history.current.length - 1;
    setUnexported(history.current[index.current].id !== exportedSnapshotId.current);
    setRevision((value) => value + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let cancelled = false;
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        context.drawImage(image, 0, 0, WIDTH, HEIGHT);
        save();
        exportedSnapshotId.current = history.current[index.current]?.id ?? null;
        setUnexported(false);
        setNotice("Đã khôi phục bản vẽ đã lưu trên thiết bị.");
      };
      image.src = saved;
    } else {
      save();
      exportedSnapshotId.current = history.current[index.current]?.id ?? null;
      setUnexported(false);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (revision === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      localStorage.setItem(STORAGE_KEY, canvas.toDataURL("image/png"));
    } catch { void 0; }
  }, [revision]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    drawing.current = true;
    setUnexported(true);
    context.beginPath(); context.moveTo(p.x, p.y); context.lineCap = "round"; context.lineJoin = "round";
    context.strokeStyle = tool === "eraser" ? "#fffdf7" : color; context.lineWidth = size;
    context.globalAlpha = tool === "eraser" ? 1 : opacity;
    context.lineTo(p.x + 0.01, p.y + 0.01); context.stroke();
    context.globalAlpha = 1;
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const p = point(event); context.lineTo(p.x, p.y); context.stroke();
  };
  const stop = () => { if (drawing.current) { drawing.current = false; save(); setUnexported(true); } };
  const restore = (next: number) => {
    const context = canvasRef.current?.getContext("2d");
    const snapshot = history.current[next];
    if (!context || !snapshot) return;
    context.putImageData(snapshot.image, 0, 0); index.current = next;
    setUnexported(snapshot.id !== exportedSnapshotId.current); setRevision((value) => value + 1);
  };
  const clear = () => {
    if (!window.confirm("Xóa toàn bộ tranh hiện tại?")) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#fffdf7"; context.fillRect(0, 0, WIDTH, HEIGHT); save(); setNotice("Đã xóa tranh.");
  };
  const importImage = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
      setNotice("Chọn ảnh JPG, PNG hoặc WEBP tối đa 10 MB.");
      return;
    }
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min((WIDTH * 0.8) / image.width, (HEIGHT * 0.8) / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      URL.revokeObjectURL(url);
      save();
      setUnexported(true);
      setNotice("Đã chèn ảnh vào bản vẽ.");
    };
    image.onerror = () => { URL.revokeObjectURL(url); setNotice("Không thể đọc ảnh này."); };
    image.src = url;
  };
  const toggleFullscreen = async () => {
    if (!pageRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await pageRef.current.requestFullscreen();
    } catch {
      setNotice("Trình duyệt không cho phép toàn màn hình.");
    }
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
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
  }, []);
  const exportPng = () => {
    const link = document.createElement("a"); link.download = "linea-studio.png";
    link.href = canvasRef.current?.toDataURL("image/png") ?? ""; link.click();
    exportedSnapshotId.current = history.current[index.current]?.id ?? null;
    setUnexported(false); setNotice("Đã tải PNG về thiết bị.");
  };

  return <div className="studio-page" ref={pageRef}><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
    <main className="studio-main">
      <header className="studio-heading"><div><p className="guest-eyebrow">STUDIO LUYỆN VẼ</p><h1>Không gian sáng tạo</h1><p>Bản vẽ chỉ nằm trên thiết bị này. Xuất PNG để lưu tác phẩm.</p></div><Link to="/courses">Khám phá khóa học</Link></header>
      <div className="studio-toolbar" role="toolbar" aria-label="Công cụ vẽ">
        <button type="button" className={tool === "pen" ? "selected" : ""} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>Bút</button>
        <button type="button" className={tool === "eraser" ? "selected" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>Tẩy</button>
        <label>Màu <input aria-label="Màu nét vẽ" type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={tool === "eraser"} /></label>
        <label>Cỡ nét <input aria-label="Cỡ nét" type="range" min="1" max="48" value={size} onChange={(event) => setSize(Number(event.target.value))} /><span>{size}px</span></label>
        <label>Độ đậm <input aria-label="Độ đậm nét vẽ" type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} disabled={tool === "eraser"} /><span>{Math.round(opacity * 100)}%</span></label>
        <button type="button" onClick={() => restore(index.current - 1)} disabled={index.current <= 0}>Hoàn tác</button>
        <button type="button" onClick={() => restore(index.current + 1)} disabled={index.current >= history.current.length - 1}>Làm lại</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Chèn ảnh</button>
        <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { importImage(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        <button type="button" onClick={clear}>Xóa tranh</button>
        <span className="studio-zoom" aria-label="Thu phóng">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>+</button>
          <button type="button" onClick={() => setZoom(1)}>Vừa</button>
        </span>
        <button type="button" onClick={() => void toggleFullscreen()}>{isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}</button>
      </div>
      <div className="studio-canvas-wrap"><canvas ref={canvasRef} className="studio-canvas" style={{ width: `${zoom * 100}%` }} width={WIDTH} height={HEIGHT} aria-label="Vùng vẽ. Dùng chuột hoặc cảm ứng để vẽ." onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} /></div>
      <div className="studio-footer"><span role="status">{notice || "Mẹo: dùng chuột hoặc cảm ứng để vẽ. Bản vẽ được lưu cục bộ trên thiết bị."}</span><button type="button" onClick={exportPng}>Tải PNG</button></div>
      <p className="studio-note">Bản vẽ được lưu cục bộ trên trình duyệt. Tải PNG để lưu tác phẩm ra thiết bị.</p>
      <span className="sr-only" aria-live="polite">{revision ? "Bản vẽ đã cập nhật" : ""}</span>
    </main>
  </div>;
}
