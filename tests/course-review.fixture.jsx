import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Editor from "../src/pages/TeacherCourseFormPage";

createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={["/teacher/courses/new"]}>
    <Routes>
      <Route path="/teacher/courses/new" element={<Editor />} />
      <Route path="/teacher/courses/:courseId/edit" element={<Editor />} />
    </Routes>
  </MemoryRouter>
);
