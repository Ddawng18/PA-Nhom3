import { demoTeachers, type DemoTeacher, type DemoTeacherCourse, type DemoTeacherPortfolio } from "../data/demoTeachers";

const STORAGE_KEY = "linea-demo-teachers-v1";
const CHANGE_EVENT = "linea:demo-teachers-change";
const TONES = ["forest", "clay", "indigo", "sand"] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function textList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [...fallback];
}

function tone(value: unknown, fallback: DemoTeacher["tone"]): DemoTeacher["tone"] {
  return typeof value === "string" && TONES.includes(value as DemoTeacher["tone"])
    ? value as DemoTeacher["tone"]
    : fallback;
}

function cloneTeacher(teacher: DemoTeacher): DemoTeacher {
  return JSON.parse(JSON.stringify(teacher)) as DemoTeacher;
}

function normalizePortfolio(value: unknown, fallback: DemoTeacherPortfolio[]): DemoTeacherPortfolio[] {
  if (!Array.isArray(value) || value.length === 0) return fallback.map((item) => ({ ...item }));
  return value.map((entry, index) => {
    const seed = fallback[index] ?? fallback[0];
    if (!isRecord(entry)) return { ...seed };
    return {
      label: text(entry.label, seed.label),
      caption: text(entry.caption, seed.caption),
      tone: tone(entry.tone, seed.tone),
    };
  });
}

function normalizeCourses(value: unknown, fallback: DemoTeacherCourse[]): DemoTeacherCourse[] {
  if (!Array.isArray(value) || value.length === 0) return fallback.map((item) => ({ ...item }));
  return value.map((entry, index) => {
    const seed = fallback[index] ?? fallback[0];
    if (!isRecord(entry)) return { ...seed };
    return {
      title: text(entry.title, seed.title),
      level: text(entry.level, seed.level),
      lessons: typeof entry.lessons === "number" && Number.isFinite(entry.lessons) && entry.lessons >= 0
        ? Math.round(entry.lessons)
        : seed.lessons,
      summary: text(entry.summary, seed.summary),
    };
  });
}

function normalizeTeacher(value: unknown, seed: DemoTeacher): DemoTeacher | null {
  if (!isRecord(value) || value.slug !== seed.slug) return null;
  return {
    slug: seed.slug,
    name: text(value.name, seed.name),
    handle: text(value.handle, seed.handle),
    initials: text(value.initials, seed.initials),
    title: text(value.title, seed.title),
    tone: tone(value.tone, seed.tone),
    location: text(value.location, seed.location),
    experience: text(value.experience, seed.experience),
    languages: textList(value.languages, seed.languages),
    specialties: textList(value.specialties, seed.specialties),
    bio: textList(value.bio, seed.bio),
    approach: textList(value.approach, seed.approach),
    availability: text(value.availability, seed.availability),
    responseTime: text(value.responseTime, seed.responseTime),
    feedbackExample: text(value.feedbackExample, seed.feedbackExample),
    portfolio: normalizePortfolio(value.portfolio, seed.portfolio),
    courses: normalizeCourses(value.courses, seed.courses),
  };
}

function defaultTeachers() {
  return demoTeachers.map(cloneTeacher);
}

function readStoredTeachers() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadDemoTeachers(): DemoTeacher[] {
  const stored = readStoredTeachers();
  const seeds = defaultTeachers();
  if (!stored) return seeds;
  return seeds.map((seed) => {
    const saved = stored.find((entry) => isRecord(entry) && entry.slug === seed.slug);
    return normalizeTeacher(saved, seed) ?? seed;
  });
}

export function findStoredDemoTeacher(slug: string | undefined) {
  return loadDemoTeachers().find((teacher) => teacher.slug === slug);
}

function notifyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeTeachers(teachers: DemoTeacher[]) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    notifyChange();
    return true;
  } catch {
    return false;
  }
}

export function saveDemoTeacher(teacher: DemoTeacher) {
  const seed = demoTeachers.find((entry) => entry.slug === teacher.slug);
  if (!seed) return false;
  const normalized = normalizeTeacher(teacher, seed);
  if (!normalized) return false;
  const teachers = loadDemoTeachers();
  const index = teachers.findIndex((entry) => entry.slug === teacher.slug);
  if (index === -1) teachers.push(normalized);
  else teachers[index] = normalized;
  return writeTeachers(teachers);
}

export function resetDemoTeacher(slug: string) {
  const seed = demoTeachers.find((entry) => entry.slug === slug);
  if (!seed) return false;
  const teachers = loadDemoTeachers().map((teacher) => teacher.slug === slug ? cloneTeacher(seed) : teacher);
  return writeTeachers(teachers);
}

export function resetAllDemoTeachers() {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyChange();
    return true;
  } catch {
    return false;
  }
}

export function isDemoTeacherCustomized(teacher: DemoTeacher) {
  const seed = demoTeachers.find((entry) => entry.slug === teacher.slug);
  return Boolean(seed) && JSON.stringify(seed) !== JSON.stringify(teacher);
}

export function subscribeDemoTeachers(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
