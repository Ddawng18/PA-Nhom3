import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const orderSchema = z.object({ id: z.number().int().positive(), courseId: z.number().int().positive(), courseTitle: z.string(), priceVnd: z.number().int().nonnegative(), status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "CANCELLED", "PAID_REVIEW"]), createdAt: z.string(), paymentUrl: z.string().url().nullable().optional(), paymentProvider: z.enum(["DEMO", "VNPAY_SANDBOX", "ZALOPAY_SANDBOX"]).default("DEMO"), items: z.array(z.object({ courseId: z.number().int().positive(), courseTitle: z.string(), priceVnd: z.number().int().nonnegative() })).optional() });
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
export async function refreshZaloPayOrder(token: string, id: number, signal?: AbortSignal) {
  return orderSchema.parse(await requestAdminApi(`/api/demo-orders/${id}/refresh`, { token, method: "POST", signal }));
}
