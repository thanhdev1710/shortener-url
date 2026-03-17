import { Context } from "hono";
import { JWTPayload } from "hono/utils/jwt/types";

export type ENV = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  RATE_LIMIT_KV: KVNamespace;
};

export type VAR = {
  userId: number;
};

export type ContextType = Context<{ Bindings: ENV; Variables: VAR }>;
