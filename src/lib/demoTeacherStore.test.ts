import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoTeachers } from "../data/demoTeachers";
import {
  findStoredDemoTeacher,
  isDemoTeacherCustomized,
  loadDemoTeachers,
  resetAllDemoTeachers,
  resetDemoTeacher,
  saveDemoTeacher,
} from "./demoTeacherStore";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});

describe("demo teacher store", () => {
  it("returns seed profiles when nothing has been saved", () => {
    expect(loadDemoTeachers()).toEqual(demoTeachers);
    expect(findStoredDemoTeacher("nmratist")?.name).toBe("NmRAtist");
  });

  it("persists edits and reloads them", () => {
    const teacher = { ...demoTeachers[0], name: "NmRA Studio", specialties: ["Nhân vật", "Ánh sáng"] };
    expect(saveDemoTeacher(teacher)).toBe(true);
    expect(findStoredDemoTeacher("nmratist")?.name).toBe("NmRA Studio");
    expect(isDemoTeacherCustomized(findStoredDemoTeacher("nmratist")!)).toBe(true);
  });

  it("resets one profile without resetting the others", () => {
    saveDemoTeacher({ ...demoTeachers[0], name: "Tạm thời" });
    saveDemoTeacher({ ...demoTeachers[1], name: "Mai An thử" });
    expect(resetDemoTeacher("nmratist")).toBe(true);
    expect(findStoredDemoTeacher("nmratist")?.name).toBe("NmRAtist");
    expect(findStoredDemoTeacher("mai-an")?.name).toBe("Mai An thử");
  });

  it("resets all profiles back to seeds", () => {
    saveDemoTeacher({ ...demoTeachers[0], name: "Tạm thời" });
    expect(resetAllDemoTeachers()).toBe(true);
    expect(loadDemoTeachers()).toEqual(demoTeachers);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("linea-demo-teachers-v1");
  });
});
