import { describe, expect, it } from "vitest";
import { lessonStatus, moduleProgress } from "./logic";

describe("LINEA progress calculations", () => {
  it("calculates module progress from completed lessons", () => {
    expect(moduleProgress({ completedLessons: ["line-1"] }, "line-control")).toBe(0.5);
  });

  it("unlocks the next lesson after the previous one is complete", () => {
    expect(lessonStatus({ completedLessons: ["line-1"], activeLessonId: "line-2" }, "line-2")).toBe("in-progress");
    expect(lessonStatus({ completedLessons: ["line-1", "line-2"], activeLessonId: "forms-1" }, "forms-1")).toBe("in-progress");
  });
});
