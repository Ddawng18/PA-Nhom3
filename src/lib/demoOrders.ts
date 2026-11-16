import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const orderSchema = z.object({ id: z.number().int().positive(), courseId: z.number().int().positive(), priceVnd: z.number().int().nonnegative(), status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]), createdAt: z.string() });
export type DemoOrder = z.infer<typeof orderSchema>;
export async function createDemoOrder(token: string, courseId: number, idempotencyKey: string) {
  return orderSchema.parse(await requestAdminApi("/api/demo-orders", { token, method: "POST", body: { courseId, idempotencyKey } }));
}
export async function confirmDemoOrder(token: string, id: number, result: "SUCCEEDED" | "FAILED" | "CANCELLED") {
  return orderSchema.parse(await requestAdminApi(`/api/demo-orders/${id}/confirm`, { token, method: "POST", body: { result } }));
}
export async function listDemoOrders(token: string, signal?: AbortSignal) {
  return z.array(orderSchema).parse(await requestAdminApi("/api/demo-orders", { token, signal }));
}
