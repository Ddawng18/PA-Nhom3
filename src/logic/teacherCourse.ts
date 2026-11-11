export type TeacherRouteState = {
  loading: boolean;
  role: string | null;
  error: string | null;
};

export function getTeacherRouteDecision(
  state: TeacherRouteState
): "loading" | "error" | "redirect" | "allowed" {
  if (state.loading) return "loading";
  if (state.error) return "error";
  return state.role === "teacher" ? "allowed" : "redirect";
}
