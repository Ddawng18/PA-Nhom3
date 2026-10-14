type LessonStatus = "locked" | "available" | "in-progress" | "completed";

const modules = [
  { id: "line-control", lessons: [{ id: "line-1" }, { id: "line-2" }] },
  { id: "forms", lessons: [{ id: "forms-1" }] },
  { id: "space", lessons: [{ id: "space-1" }] },
  { id: "value", lessons: [{ id: "value-1" }] },
  { id: "character", lessons: [{ id: "character-1" }] }
];

const allLessons = modules.flatMap((module) => module.lessons);

export function moduleProgress(state: { completedLessons: string[] }, moduleId: string) {
  const module = modules.find((item) => item.id === moduleId);
  if (!module) return 0;
  return module.lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length / module.lessons.length;
}

export function lessonStatus(state: { completedLessons: string[]; activeLessonId: string }, lessonId: string): LessonStatus {
  if (state.completedLessons.includes(lessonId)) return "completed";
  const index = allLessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonId === state.activeLessonId) return "in-progress";
  if (index === 0) return "available";
  return state.completedLessons.includes(allLessons[index - 1]?.id) ? "available" : "locked";
}
