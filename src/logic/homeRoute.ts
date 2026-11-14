export type HomeRouteDecisionInput = {
  loading: boolean;
  hasUser: boolean;
};

export type HomeRouteDecision = "loading" | "dashboard" | "guest";

export function getHomeRouteDecision({
  loading,
  hasUser,
}: HomeRouteDecisionInput): HomeRouteDecision {
  if (loading) return "loading";
  return hasUser ? "dashboard" : "guest";
}
