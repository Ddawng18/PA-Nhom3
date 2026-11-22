import { useEffect, useState } from "react";
import type { DemoTeacher } from "../data/demoTeachers";
import { loadDemoTeachers, subscribeDemoTeachers } from "../lib/demoTeacherStore";

export function useDemoTeachers() {
  const [teachers, setTeachers] = useState<DemoTeacher[]>(loadDemoTeachers);

  useEffect(() => {
    const unsubscribe = subscribeDemoTeachers(() => setTeachers(loadDemoTeachers()));
    setTeachers(loadDemoTeachers());
    return unsubscribe;
  }, []);

  return teachers;
}
