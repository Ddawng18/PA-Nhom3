import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const quoteItemSchema = z.object({
  courseId: z.number().int().positive(),
  title: z.string(),
  priceVnd: z.number().int().nonnegative(),
  level: z.string(),
  coverImage: z.string().nullable().optional(),
  available: z.boolean(),
  enrolled: z.boolean(),
  reason: z.string().nullable().optional(),
});
export const cartQuoteSchema = z.object({
  items: z.array(quoteItemSchema),
  totalVnd: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
  freeCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
});
export type CartQuote = z.infer<typeof cartQuoteSchema>;
export type CartQuoteItem = z.infer<typeof quoteItemSchema>;

const checkoutSchema = z.object({
  id: z.number().int().positive(),
  status: z.string(),
  totalVnd: z.number().int().nonnegative().optional(),
  paymentUrl: z.string().url().nullable().optional(),
}).passthrough();

export async function quoteCart(courseIds: number[], token?: string, signal?: AbortSignal) {
  return cartQuoteSchema.parse(await requestAdminApi("/api/cart/quote", {
    token, method: "POST", body: { courseIds }, signal,
  }));
}

export async function loadCart(token: string, signal?: AbortSignal) {
  return cartQuoteSchema.parse(await requestAdminApi("/api/cart", { token, signal }));
}

export async function addCartItem(token: string, courseId: number) {
  return cartQuoteSchema.parse(await requestAdminApi("/api/cart/items", { token, method: "POST", body: { courseId } }));
}

export async function removeCartItem(token: string, courseId: number) {
  return cartQuoteSchema.parse(await requestAdminApi(`/api/cart/items/${courseId}`, { token, method: "DELETE" }));
}

export async function clearCart(token: string) {
  await requestAdminApi("/api/cart", { token, method: "DELETE" });
}

export async function mergeCart(token: string, courseIds: number[]) {
  return cartQuoteSchema.parse(await requestAdminApi("/api/cart/merge", { token, method: "POST", body: { courseIds } }));
}

export async function checkoutCart(token: string, courseIds: number[], idempotencyKey: string) {
  return checkoutSchema.parse(await requestAdminApi("/api/demo-orders/checkout", {
    token, method: "POST", body: { courseIds, idempotencyKey },
  }));
}
