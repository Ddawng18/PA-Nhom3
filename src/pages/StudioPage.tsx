import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/studio.css";

const WIDTH = 1200;
const HEIGHT = 720;
const HISTORY_LIMIT = 30;

export default function StudioPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const index = useRef(-1);
  const drawing = useRef(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#26332b");
  const [size, setSize] = useState(6);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [unexported, setUnexported] = useState(false);

  const save = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    if (history.current.length > HISTORY_LIMIT) history.current.shift();
    index.current = history.current.length - 1;
    setRevision((value) => value + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    save();
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
    context.lineTo(p.x + 0.01, p.y + 0.01); context.stroke();
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
    context.putImageData(snapshot, 0, 0); index.current = next; setRevision((value) => value + 1);
  };
  const clear = () => {
    if (!window.confirm("Xóa toàn bộ tranh hiện tại?")) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#fffdf7"; context.fillRect(0, 0, WIDTH, HEIGHT); save(); setUnexported(false); setNotice("Đã xóa tranh.");
  };
  const exportPng = () => {
    const link = document.createElement("a"); link.download = "linea-studio.png";
    link.href = canvasRef.current?.toDataURL("image/png") ?? ""; link.click(); setUnexported(false); setNotice("Đã tải PNG về thiết bị.");
  };

  return <div className="studio-page"><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
    <main className="studio-main">
      <header className="studio-heading"><div><p className="guest-eyebrow">STUDIO LUYỆN VẼ</p><h1>Không gian sáng tạo</h1><p>Bản vẽ chỉ nằm trên thiết bị này. Xuất PNG để lưu tác phẩm.</p></div><Link to="/courses">Khám phá khóa học</Link></header>
      <div className="studio-toolbar" role="toolbar" aria-label="Công cụ vẽ">
        <button type="button" className={tool === "pen" ? "selected" : ""} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>Bút</button>
        <button type="button" className={tool === "eraser" ? "selected" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>Tẩy</button>
        <label>Màu <input aria-label="Màu nét vẽ" type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={tool === "eraser"} /></label>
        <label>Cỡ nét <input aria-label="Cỡ nét" type="range" min="1" max="48" value={size} onChange={(event) => setSize(Number(event.target.value))} /><span>{size}px</span></label>
        <button type="button" onClick={() => restore(index.current - 1)} disabled={index.current <= 0}>Hoàn tác</button>
        <button type="button" onClick={() => restore(index.current + 1)} disabled={index.current >= history.current.length - 1}>Làm lại</button>
        <button type="button" onClick={clear}>Xóa tranh</button>
      </div>
      <div className="studio-canvas-wrap"><canvas ref={canvasRef} className="studio-canvas" width={WIDTH} height={HEIGHT} aria-label="Vùng vẽ. Dùng chuột hoặc cảm ứng để vẽ." onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} /></div>
      <div className="studio-footer"><span role="status">{notice || "Mẹo: dùng chuột hoặc cảm ứng để bắt đầu vẽ."}</span><button type="button" onClick={exportPng}>Tải PNG</button></div>
      <p className="studio-note">Studio không tự lưu, tải lên, nộp bài hay đăng tác phẩm. Tải PNG trước khi rời trang.</p>
      <span className="sr-only" aria-live="polite">{revision ? "Bản vẽ đã cập nhật" : ""}</span>
    </main>
  </div>;
}
