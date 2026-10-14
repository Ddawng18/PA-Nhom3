import { StrictMode, useEffect, useRef, useState } from "react";
import type React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brush,
  Download,
  Eraser,
  GalleryHorizontalEnd,
  Home,
  LogOut,
  PenLine,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  User
} from "lucide-react";
import { z } from "zod";
import "./styles.css";

type LessonStatus = "locked" | "available" | "in-progress" | "completed";
type Tool = "pen" | "eraser";
type SetState = React.Dispatch<React.SetStateAction<AppState>>;

type Preferences = { experience: string; goal: string; style: string; dailyMinutes: number };
type Artwork = { id: string; title: string; moduleId: string; lessonId: string; exerciseId: string; image: string; createdAt: string; notes?: string };
type Submission = { id: string; lessonId: string; exerciseId: string; artworkId: string; selfScore: number; notes: string; createdAt: string };
type PracticeSession = { id: string; minutes: number; date: string; lessonId: string };
type AppState = {
  signedIn: boolean;
  name: string;
  preferences?: Preferences;
  completedLessons: string[];
  activeLessonId: string;
  draftArtwork?: Artwork;
  artworks: Artwork[];
  submissions: Submission[];
  practiceSessions: PracticeSession[];
};

const modules = [
  {
    id: "line-control",
    title: "Line Control",
    summary: "Build confident marks, pressure control, and cleaner warmups.",
    lessons: [
      { id: "line-1", title: "Confident Parallel Lines", minutes: 18, exerciseId: "ladder", objectives: ["Use shoulder motion for longer strokes", "Keep spacing consistent", "Review wobble and taper"], instructions: "Draw four rows of parallel lines. Vary pressure in the final two rows, then circle the cleanest marks." },
      { id: "line-2", title: "Curves and Ellipses", minutes: 22, exerciseId: "ellipses", objectives: ["Ghost the motion before drawing", "Maintain even ellipses", "Compare tilt and spacing"], instructions: "Fill three bands with ellipses and curved strokes. Keep the exercise slow and deliberate." }
    ]
  },
  {
    id: "forms",
    title: "Forms and Construction",
    summary: "Turn simple shapes into believable objects.",
    lessons: [{ id: "forms-1", title: "Box and Cylinder Warmup", minutes: 24, exerciseId: "forms", objectives: ["Draw through simple forms", "Keep minor axes consistent", "Use construction lines lightly"], instructions: "Build a page of boxes, cylinders, and spheres. Mark the center lines and visible contour changes." }]
  },
  {
    id: "space",
    title: "Perspective and Space",
    summary: "Place forms in depth with clear vanishing behavior.",
    lessons: [{ id: "space-1", title: "One-point Room Blocks", minutes: 28, exerciseId: "perspective", objectives: ["Anchor a horizon line", "Converge edges consistently", "Check scale relationships"], instructions: "Create a small block-out room with one vanishing point and three object boxes." }]
  },
  {
    id: "value",
    title: "Light and Value",
    summary: "Practice readable light families and edge control.",
    lessons: [{ id: "value-1", title: "Sphere Value Ladder", minutes: 30, exerciseId: "value", objectives: ["Separate light and shadow", "Use five value steps", "Keep cast shadow direction clear"], instructions: "Render three spheres with a five-step value ladder and a consistent light source." }]
  },
  {
    id: "character",
    title: "Character and Lineart",
    summary: "Apply fundamentals to expressive character studies.",
    lessons: [{ id: "character-1", title: "Clean Character Line Pass", minutes: 34, exerciseId: "lineart", objectives: ["Clarify silhouette", "Vary line weight", "Keep facial construction subtle"], instructions: "Make a clean line pass over a simple head construction study." }]
  }
];

const allLessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, module })));
const stateKey = "linea.prototype.state.v3";
const initialState: AppState = { signedIn: false, name: "Bao", activeLessonId: "line-1", completedLessons: [], artworks: [], submissions: [], practiceSessions: [] };

function moduleProgress(state: Pick<AppState, "completedLessons">, moduleId: string) {
  const module = modules.find((item) => item.id === moduleId);
  if (!module) return 0;
  return module.lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length / module.lessons.length;
}

function lessonStatus(state: Pick<AppState, "completedLessons" | "activeLessonId">, lessonId: string): LessonStatus {
  if (state.completedLessons.includes(lessonId)) return "completed";
  const index = allLessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonId === state.activeLessonId) return "in-progress";
  if (index === 0) return "available";
  return state.completedLessons.includes(allLessons[index - 1]?.id) ? "available" : "locked";
}

function loadState(): AppState {
  try {
    const parsed = JSON.parse(localStorage.getItem(stateKey) || "null") as AppState | null;
    return parsed ? { ...initialState, ...parsed } : initialState;
  } catch {
    return initialState;
  }
}

function useStore() {
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => localStorage.setItem(stateKey, JSON.stringify(state)), [state]);
  return [state, setState] as const;
}

function findLesson(id?: string) {
  return allLessons.find((lesson) => lesson.id === id) ?? allLessons.find((lesson) => lesson.id === "line-1") ?? allLessons[0];
}

function nextLessonId(id: string) {
  const index = allLessons.findIndex((lesson) => lesson.id === id);
  return allLessons[index + 1]?.id ?? id;
}

function App() {
  const [state, setState] = useStore();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing state={state} />} />
        <Route path="/auth" element={<Auth setState={setState} />} />
        <Route path="/onboarding" element={<Onboarding state={state} setState={setState} />} />
        <Route element={<Protected state={state} />}>
          <Route element={<AppShell state={state} setState={setState} />}>
            <Route path="/dashboard" element={<Dashboard state={state} />} />
            <Route path="/learn" element={<LearningPath state={state} />} />
            <Route path="/lesson/:id?" element={<LessonPlayer state={state} setState={setState} />} />
            <Route path="/studio/:id?" element={<PracticeStudio state={state} setState={setState} />} />
            <Route path="/review/:submissionId?" element={<Review state={state} setState={setState} />} />
            <Route path="/progress" element={<Progress state={state} />} />
            <Route path="/gallery" element={<Gallery state={state} setState={setState} />} />
            <Route path="/settings" element={<ProfileSettings state={state} setState={setState} />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Protected({ state }: { state: AppState }) {
  return state.signedIn ? <Outlet /> : <Navigate to="/auth" replace />;
}

function PublicNav({ state }: { state: AppState }) {
  return (
    <header className="public-nav">
      <NavLink to="/" className="brand"><span>LINEA</span><small>Digital art training</small></NavLink>
      <nav>
        <a href="#method">Method</a>
        <a href="#paths">Paths</a>
        <NavLink to={state.signedIn ? "/dashboard" : "/auth"} className="nav-cta">{state.signedIn ? "Continue" : "Sign in"}</NavLink>
      </nav>
    </header>
  );
}

function Landing({ state }: { state: AppState }) {
  return (
    <main className="public-page">
      <PublicNav state={state} />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Structured digital art training</p>
          <h1>Practice drawing with a system, not just motivation.</h1>
          <p>LINEA turns fundamentals into daily guided workouts: line control, construction, perspective, value, and character lineart. Placeholder media is clearly marked until real course assets exist.</p>
          <div className="button-row">
            <NavLink className="button primary" to={state.signedIn ? "/dashboard" : "/auth"}>Start training <ArrowRight size={18} /></NavLink>
            <a className="button ghost" href="#paths">View paths</a>
          </div>
        </div>
        <div className="hero-art"><img src="/linea-studies.png" alt="Drawing studies for line, form, perspective, and value practice" /></div>
      </section>
      <section id="method" className="three-grid">
        {[
          ["Method", "Sequential paths unlock the next skill only when the core drill is reviewed."],
          ["Practice", "A focused studio keeps pen, eraser, undo, reference, and checklist within reach."],
          ["Review", "Self-assessment and rule-based rubrics make growth visible without pretending to be AI analysis."]
        ].map(([title, copy]) => <article className="panel" key={title}><Sparkles className="accent-icon" size={22} /><h3>{title}</h3><p>{copy}</p></article>)}
      </section>
      <section id="paths" className="path-preview">
        <div><p className="eyebrow">Learning path preview</p><h2>Five modules, one habit loop.</h2></div>
        <div className="module-row">{modules.map((module) => <article className="mini-module" key={module.id}><h3>{module.title}</h3><p>{module.summary}</p></article>)}</div>
      </section>
    </main>
  );
}

function Auth({ setState }: { setState: SetState }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse({ email, password });
    if (!result.success) return setError("Use a valid email and a password with at least 6 characters.");
    setState((current) => ({ ...current, signedIn: true, name: email.split("@")[0] || "Artist" }));
    navigate(mode === "signup" ? "/onboarding" : "/dashboard");
  }
  return (
    <main className="auth-page">
      <NavLink to="/" className="brand floating-brand"><span>LINEA</span><small>Digital art training</small></NavLink>
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Create your workspace"}</p>
        <h1>{mode === "signin" ? "Continue your practice streak." : "Start with a focused art plan."}</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@linea.app" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="6+ characters" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary full" type="submit">{mode === "signin" ? "Sign in" : "Create account"}</button>
        <button className="link-button" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
      </form>
    </main>
  );
}

function Onboarding({ state, setState }: { state: AppState; setState: SetState }) {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>(state.preferences ?? { experience: "Beginner", goal: "Cleaner linework", style: "Character + environment", dailyMinutes: 20 });
  function save() {
    setState((current) => ({ ...current, signedIn: true, preferences, activeLessonId: "line-1" }));
    navigate("/dashboard");
  }
  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <p className="eyebrow">Focused setup</p><h1>Shape the first training path.</h1>
        <div className="question-grid">
          <SelectCard title="Experience" value={preferences.experience} options={["Beginner", "Intermediate", "Returning artist"]} onChange={(experience) => setPreferences({ ...preferences, experience })} />
          <SelectCard title="Goal" value={preferences.goal} options={["Cleaner linework", "Better construction", "Consistent habit"]} onChange={(goal) => setPreferences({ ...preferences, goal })} />
          <SelectCard title="Style" value={preferences.style} options={["Character + environment", "Comics", "Concept art"]} onChange={(style) => setPreferences({ ...preferences, style })} />
          <SelectCard title="Daily practice" value={`${preferences.dailyMinutes} minutes`} options={["15 minutes", "20 minutes", "30 minutes"]} onChange={(value) => setPreferences({ ...preferences, dailyMinutes: Number.parseInt(value) })} />
        </div>
        <div className="assessment"><ExerciseThumb kind="ladder" /><div><h2>Initial skill check</h2><p>Simulated task: draw parallel lines, ellipses, and one perspective box. This configures the suggested starting point.</p></div></div>
        <button className="button primary" onClick={save}>Generate my path</button>
      </section>
    </main>
  );
}

function SelectCard({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <article className="panel"><h3>{title}</h3><div className="chips">{options.map((option) => <button className={value === option ? "chip active" : "chip"} key={option} onClick={() => onChange(option)}>{option}</button>)}</div></article>;
}

function AppShell({ state, setState }: { state: AppState; setState: SetState }) {
  const navigate = useNavigate();
  const navItems = [["/dashboard", Home, "Dashboard"], ["/learn", BookOpen, "Learn"], ["/studio", Brush, "Studio"], ["/progress", BarChart3, "Progress"], ["/gallery", GalleryHorizontalEnd, "Gallery"], ["/settings", Settings, "Settings"]] as const;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand"><span>LINEA</span><small>Creative training</small></NavLink>
        <nav>{navItems.map(([path, Icon, label]) => <NavLink to={path} className="side-link" key={path}><Icon size={18} /> {label}</NavLink>)}</nav>
        <div className="streak-card"><strong>{currentStreak(state)} day streak</strong><span>Goal: {state.preferences?.dailyMinutes ?? 20} min/day</span></div>
        <button className="side-link signout" onClick={() => { setState((current) => ({ ...current, signedIn: false })); navigate("/auth"); }}><LogOut size={18} /> Sign out</button>
      </aside>
      <main className="app-main"><Outlet /></main>
      <nav className="mobile-nav">{navItems.slice(0, 5).map(([path, Icon, label]) => <NavLink to={path} key={path} aria-label={label}><Icon size={20} /></NavLink>)}</nav>
    </div>
  );
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <><header className="screen-head"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="avatar"><User size={18} /></div></header>{children}</>;
}

function Dashboard({ state }: { state: AppState }) {
  const active = findLesson(state.activeLessonId);
  return (
    <Screen title={`Good evening, ${state.name}`} subtitle="Your focused workout is ready. Keep the session short and complete.">
      <div className="dashboard-grid">
        <article className="feature-card"><p className="eyebrow">Workout of the day</p><h2>{active.title}</h2><p>{active.instructions}</p><ProgressBar value={moduleProgress(state, active.module.id)} /><NavLink className="button primary" to={`/studio/${active.id}`}>Open studio</NavLink></article>
        <article className="panel"><h3>Continue learning</h3><ModuleCard module={active.module} state={state} /></article>
        <Metric value={`${totalMinutes(state)}`} label="practice minutes" /><Metric value={`${state.completedLessons.length}`} label="lessons completed" /><Metric value={`${state.artworks.length}`} label="artworks saved" />
      </div>
      <RecentArtwork state={state} />
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <article className="metric"><strong>{value}</strong><span>{label}</span></article>;
}

function LearningPath({ state }: { state: AppState }) {
  return <Screen title="Learning Path" subtitle="Progressive modules unlock as lessons and exercise reviews are completed."><div className="module-grid">{modules.map((module) => <ModuleCard module={module} state={state} key={module.id} />)}</div></Screen>;
}

function ModuleCard({ module, state }: { module: (typeof modules)[number]; state: AppState }) {
  const firstLesson = module.lessons[0];
  const status = lessonStatus(state, firstLesson.id);
  const locked = status === "locked";
  return <article className={locked ? "module-card locked" : "module-card"}><div className="module-thumb"><ExerciseThumb kind={firstLesson.exerciseId} /></div><div><span className="status">{status}</span><h3>{module.title}</h3><p>{module.summary}</p><ProgressBar value={moduleProgress(state, module.id)} /><NavLink className={locked ? "button ghost disabled" : "button ghost"} to={locked ? "#" : `/lesson/${firstLesson.id}`}>{locked ? "Locked" : "Open lesson"}</NavLink></div></article>;
}

function LessonPlayer({ state, setState }: { state: AppState; setState: SetState }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const active = findLesson(id ?? state.activeLessonId);
  return (
    <Screen title={active.title} subtitle={`${active.module.title} • ${active.minutes} min • guided exercise`}>
      <div className="lesson-layout">
        <article className="lesson-panel"><h2>Learning objectives</h2><ol>{active.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ol><div className="video-placeholder"><PenLine /><strong>Course media placeholder</strong><span>Replace with real tutorial media before production.</span></div><p>{active.instructions}</p><div className="button-row"><button className="button ghost" onClick={() => setState((current) => ({ ...current, completedLessons: Array.from(new Set([...current.completedLessons, active.id])), activeLessonId: nextLessonId(active.id) }))}>Mark complete</button><button className="button primary" onClick={() => navigate(`/studio/${active.id}`)}>Go to studio</button></div></article>
        <aside className="reference-card"><h3>Reference exercise</h3><ExerciseThumb kind={active.exerciseId} /><ul><li>Complete the checklist in Studio.</li><li>Save work before submitting.</li><li>Review is rule-based demo feedback.</li></ul></aside>
      </div>
    </Screen>
  );
}

function PracticeStudio({ state, setState }: { state: AppState; setState: SetState }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const active = findLesson(id ?? state.activeLessonId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [size, setSize] = useState(8);
  const [color, setColor] = useState("#11151c");
  const [message, setMessage] = useState("Canvas ready");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    ctx.scale(scale, scale);
    ctx.fillStyle = "#e8e2d3";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, []);

  function context() { return canvasRef.current?.getContext("2d") ?? null; }
  function pushHistory() { const ctx = context(); const canvas = canvasRef.current; if (ctx && canvas) historyRef.current = [...historyRef.current.slice(-12), ctx.getImageData(0, 0, canvas.width, canvas.height)]; }
  function point(event: React.PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const ctx = context(); if (!ctx) return; event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { const ctx = context(); if (!ctx || !drawing.current) return; const p = point(event); ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"; ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function end() { if (!drawing.current) return; drawing.current = false; pushHistory(); }
  function undo() { const ctx = context(); if (!ctx || historyRef.current.length < 2) return; historyRef.current.pop(); ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0); setMessage("Undo applied"); }
  function clear() { if (!window.confirm("Clear the current canvas?")) return; const ctx = context(); const canvas = canvasRef.current; if (!ctx || !canvas) return; const rect = canvas.getBoundingClientRect(); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#e8e2d3"; ctx.fillRect(0, 0, rect.width, rect.height); pushHistory(); setMessage("Canvas cleared"); }
  function saveArtwork(submit = false) {
    const image = canvasRef.current?.toDataURL("image/png");
    if (!image) return;
    const artwork: Artwork = { id: crypto.randomUUID(), title: active.title, moduleId: active.module.id, lessonId: active.id, exerciseId: active.exerciseId, image, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, draftArtwork: submit ? artwork : current.draftArtwork, artworks: [artwork, ...current.artworks], practiceSessions: [{ id: crypto.randomUUID(), minutes: active.minutes, lessonId: active.id, date: new Date().toISOString() }, ...current.practiceSessions] }));
    setMessage(submit ? "Saved and ready for review" : "Artwork saved to gallery");
    if (submit) navigate(`/review?artwork=${artwork.id}&lesson=${active.id}`);
  }
  function exportPng() { const image = canvasRef.current?.toDataURL("image/png"); if (!image) return; const link = document.createElement("a"); link.download = `linea-${active.exerciseId}.png`; link.href = image; link.click(); setMessage("PNG exported"); }

  return (
    <Screen title="Practice Studio" subtitle={`${active.title} • pointer, mouse, and touch drawing supported`}>
      <div className="studio-layout">
        <section className="canvas-workspace">
          <div className="toolbar" aria-label="Drawing toolbar">
            <button className={tool === "pen" ? "tool active" : "tool"} onClick={() => setTool("pen")}><PenLine size={18} /> Pen</button>
            <button className={tool === "eraser" ? "tool active" : "tool"} onClick={() => setTool("eraser")}><Eraser size={18} /> Eraser</button>
            <button className="tool" onClick={undo}><Undo2 size={18} /> Undo</button>
            <button className="tool" onClick={clear}><RotateCcw size={18} /> Clear</button>
            <label className="range">Brush {size}px<input type="range" min="2" max="32" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
            <input className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Brush color" />
          </div>
          <canvas ref={canvasRef} className="drawing-canvas" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
          <div className="studio-actions"><span className="toast">{message}</span><button className="button ghost" onClick={() => saveArtwork(false)}><Save size={18} /> Save</button><button className="button ghost" onClick={exportPng}><Download size={18} /> Export PNG</button><button className="button primary" onClick={() => saveArtwork(true)}>Submit exercise</button></div>
        </section>
        <aside className="studio-side"><h3>Reference</h3><ExerciseThumb kind={active.exerciseId} /><h3>Checklist</h3>{active.objectives.map((item, index) => <label className="check-row" key={item}><input type="checkbox" defaultChecked={index === 0} /> {item}</label>)}<p className="note">This is a focused exercise canvas, not a full professional drawing app.</p></aside>
      </div>
    </Screen>
  );
}

function Review({ state, setState }: { state: AppState; setState: SetState }) {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const artwork = state.artworks.find((item) => item.id === params.get("artwork")) ?? state.artworks[0];
  const active = findLesson(params.get("lesson") ?? artwork?.lessonId ?? state.activeLessonId);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState(3);
  function saveProgress() {
    if (!artwork) return;
    const submission: Submission = { id: crypto.randomUUID(), lessonId: active.id, exerciseId: active.exerciseId, artworkId: artwork.id, selfScore: score, notes, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, submissions: [submission, ...current.submissions], completedLessons: Array.from(new Set([...current.completedLessons, active.id])), activeLessonId: nextLessonId(active.id) }));
    navigate(`/lesson/${nextLessonId(active.id)}`);
  }
  return <Screen title="Exercise Review" subtitle="Self-assessment plus transparent rule-based demo rubric. No AI image analysis is claimed.">{!artwork ? <EmptyState title="No submitted artwork yet" copy="Open the studio, save a drawing, and submit it for review." action="/studio" /> : <div className="review-layout"><img className="review-art" src={artwork.image} alt="Submitted artwork" /><section className="panel"><h2>Review rubric</h2><Rubric label="Line consistency" value={0.74} /><Rubric label="Shape accuracy" value={0.52} /><Rubric label="Task completion" value={0.86} /><label>Self score: {score}/5<input type="range" min="1" max="5" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label><label>Self-assessment notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What improved? What should the next pass focus on?" /></label><button className="button primary full" onClick={saveProgress}>Save progress and open next lesson</button></section></div>}</Screen>;
}

function Rubric({ label, value }: { label: string; value: number }) {
  return <div className="rubric"><span>{label}</span><ProgressBar value={value} /></div>;
}

function Progress({ state }: { state: AppState }) {
  const hasData = state.practiceSessions.length > 0 || state.completedLessons.length > 0;
  return <Screen title="Progress Analytics" subtitle="Calculated from locally persisted prototype data. New users get clear empty states.">{!hasData ? <EmptyState title="No practice data yet" copy="Complete a studio session to populate analytics." action="/studio" /> : <><div className="analytics-grid"><Metric value={`${totalMinutes(state)}`} label="practice minutes" /><Metric value={`${currentStreak(state)}`} label="current streak" /><Metric value={`${state.submissions.length}`} label="exercise reviews" /><Metric value={`${Math.round(overallProgress(state) * 100)}%`} label="path completion" /></div><div className="module-grid">{modules.map((module) => <article className="panel" key={module.id}><h3>{module.title}</h3><ProgressBar value={moduleProgress(state, module.id)} /></article>)}</div></>}</Screen>;
}

function Gallery({ state, setState }: { state: AppState; setState: SetState }) {
  const [filter, setFilter] = useState("all");
  const filtered = state.artworks.filter((art) => filter === "all" || art.moduleId === filter);
  return <Screen title="Artwork Gallery" subtitle="Saved drawings can be filtered and deleted. Exercise images preserve aspect ratio."><div className="chips"><button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")}>All</button>{modules.map((module) => <button className={filter === module.id ? "chip active" : "chip"} onClick={() => setFilter(module.id)} key={module.id}>{module.title}</button>)}</div>{filtered.length === 0 ? <EmptyState title="No artwork in this view" copy="Save a drawing from Studio to see it here." action="/studio" /> : <div className="gallery-grid">{filtered.map((art) => <article className="art-card" key={art.id}><img src={art.image} alt={art.title} /><h3>{art.title}</h3><p>{new Date(art.createdAt).toLocaleDateString()}</p><button className="icon-danger" onClick={() => { if (window.confirm("Delete this artwork?")) setState((current) => ({ ...current, artworks: current.artworks.filter((item) => item.id !== art.id) })); }}><Trash2 size={17} /> Delete</button></article>)}</div>}</Screen>;
}

function ProfileSettings({ state, setState }: { state: AppState; setState: SetState }) {
  const [name, setName] = useState(state.name);
  const [dailyMinutes, setDailyMinutes] = useState(state.preferences?.dailyMinutes ?? 20);
  return <Screen title="Profile & Settings" subtitle="Edit prototype profile and learning preferences."><section className="settings-grid"><article className="panel"><h2>Account</h2><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Daily goal<input type="number" min="5" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} /></label><button className="button primary" onClick={() => setState((current) => ({ ...current, name, preferences: { ...(current.preferences ?? { experience: "Beginner", goal: "Cleaner linework", style: "Character + environment" }), dailyMinutes } }))}>Save changes</button></article><article className="panel"><h2>Prototype reminders</h2>{["Daily reminder", "Weekly review", "Streak recovery"].map((item, index) => <label className="check-row" key={item}><input type="checkbox" defaultChecked={index !== 1} /> {item}</label>)}</article></section></Screen>;
}

function ExerciseThumb({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 320 190" className="exercise-thumb" role="img" aria-label={`${kind} exercise reference`}>
      <rect width="320" height="190" rx="18" fill="#E8E2D3" />
      {kind === "ladder" && Array.from({ length: 8 }).map((_, i) => <line key={i} x1="38" x2={250 - (i % 3) * 18} y1={38 + i * 17} y2={38 + i * 17} stroke="#11151C" strokeWidth={i === 4 ? 5 : 2.5} strokeLinecap="round" />)}
      {kind === "ellipses" && Array.from({ length: 9 }).map((_, i) => <ellipse key={i} cx={58 + (i % 3) * 82} cy={54 + Math.floor(i / 3) * 44} rx="34" ry="13" fill="none" stroke="#11151C" strokeWidth="3" />)}
      {kind === "forms" && <><rect x="42" y="58" width="74" height="74" fill="none" stroke="#11151C" strokeWidth="3" /><ellipse cx="188" cy="62" rx="36" ry="14" fill="none" stroke="#11151C" strokeWidth="3" /><line x1="152" x2="152" y1="62" y2="130" stroke="#11151C" strokeWidth="3" /><line x1="224" x2="224" y1="62" y2="130" stroke="#11151C" strokeWidth="3" /><ellipse cx="188" cy="130" rx="36" ry="14" fill="none" stroke="#11151C" strokeWidth="3" /></>}
      {kind === "perspective" && <><line x1="36" x2="284" y1="70" y2="70" stroke="#11151C" strokeWidth="2" opacity=".35" /><circle cx="230" cy="70" r="4" fill="#11151C" /><path d="M62 116 L120 96 L120 146 L62 160 Z M120 96 L190 114 L190 164 L120 146" fill="none" stroke="#11151C" strokeWidth="3" /><line x1="62" x2="230" y1="116" y2="70" stroke="#11151C" strokeWidth="1.5" opacity=".35" /><line x1="190" x2="230" y1="164" y2="70" stroke="#11151C" strokeWidth="1.5" opacity=".35" /></>}
      {kind === "value" && <><circle cx="150" cy="92" r="50" fill="#343434" /><circle cx="128" cy="74" r="23" fill="#F3F4F6" opacity=".7" /><ellipse cx="166" cy="150" rx="80" ry="14" fill="#11151C" opacity=".2" />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={36 + i * 34} y="154" width="28" height="18" fill={`rgb(${230 - i * 42},${230 - i * 42},${230 - i * 42})`} />)}</>}
      {kind === "lineart" && <path d="M122 146 C88 124 86 72 118 48 C152 22 204 44 210 88 C218 136 164 168 122 146 Z M116 94 C144 76 172 77 198 96 M134 120 C154 130 176 128 192 118" fill="none" stroke="#11151C" strokeWidth="4" strokeLinecap="round" />}
    </svg>
  );
}

function RecentArtwork({ state }: { state: AppState }) {
  return <section className="panel"><h2>Recent artwork</h2>{state.artworks.length === 0 ? <p className="muted">No saved artwork yet. Your first drawing will appear here after a Studio save.</p> : <div className="gallery-grid compact">{state.artworks.slice(0, 3).map((art) => <img src={art.image} alt={art.title} key={art.id} />)}</div>}</section>;
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action: string }) {
  return <section className="empty-state"><h2>{title}</h2><p>{copy}</p><NavLink className="button primary" to={action}>Continue</NavLink></section>;
}

function ProgressBar({ value }: { value: number }) {
  return <div className="progress" aria-label={`${Math.round(value * 100)} percent complete`}><span style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} /></div>;
}

function totalMinutes(state: AppState) { return state.practiceSessions.reduce((sum, session) => sum + session.minutes, 0); }
function currentStreak(state: AppState) { return new Set(state.practiceSessions.map((session) => session.date.slice(0, 10))).size; }
function overallProgress(state: AppState) { return state.completedLessons.length / allLessons.length; }

const root = typeof document !== "undefined" ? document.getElementById("root") : null;
if (root) {
  createRoot(root).render(<StrictMode><App /></StrictMode>);
}
