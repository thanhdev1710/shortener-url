import type { Next } from "hono";
import type { ContextType } from "../types/setting";

export const CatchAsync =
  (fn: (c: ContextType, next: Next) => Promise<any>) =>
  async (c: ContextType, next: Next) => {
    try {
      return await fn(c, next);
    } catch (error) {
      console.error(error);
      return c.json(
        {
          success: false,
          message: "Internal Server Error",
        },
        500
      );
    }
  };
