import type { MiddlewareHandler } from "hono";
import { ContextType } from "../types/setting";

type RateLimitRecord = {
  count: number;
  start: number;
};

export const rateLimit =
  (limit: number, windowSec: number): MiddlewareHandler =>
  async (c: ContextType, next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";

    const key = `rate:${ip}`;
    const now = Math.floor(Date.now() / 1000);

    const record = await c.env.RATE_LIMIT_KV.get<RateLimitRecord>(key, "json");

    if (!record) {
      await c.env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify({ count: 1, start: now }),
        { expirationTtl: windowSec }
      );
      return next();
    }

    if (record.count >= limit) {
      return c.json({ success: false, message: "Too many requests" }, 429);
    }

    await c.env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({
        count: record.count + 1,
        start: record.start,
      }),
      { expirationTtl: windowSec }
    );

    await next();
  };
