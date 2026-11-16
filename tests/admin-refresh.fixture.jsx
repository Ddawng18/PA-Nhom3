import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Admin from "../src/pages/AdminManagementPage";

createRoot(document.getElementById("root")).render(
  <MemoryRouter><Admin /></MemoryRouter>
);
