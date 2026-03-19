import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { jwtMiddleware } from "./lib/jwt";
import { poweredBy } from "hono/powered-by";
import { getDb } from "./lib/db";
import { CatchAsync } from "./utils/CatchAsync";
import authRouter from "./routes/auth.route";
import meRouter from "./routes/me.route";
import urlRouter from "./routes/url.route";

import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { timeout } from "hono/timeout";
import { logger } from "hono/logger";
import { rateLimit } from "./middlewares/rateLimit";
import { redirect } from "./controllers/url.controller";

const app = new Hono();

// Logger
app.use(logger());

app.use(poweredBy({ serverName: "Shortener-URL-API" }));

// Security headers
app.use(secureHeaders());

// CORS (chỉnh domain FE của ông)
app.use(
  cors({
    origin: ["https://localhost:3000", "https://shortener-url-fe.vercel.app"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body limit (chống spam payload lớn)
app.use(bodyLimit({ maxSize: 1024 * 1024 })); // 1MB

// Timeout (tránh treo worker)
app.use(timeout(10_000)); // 10s

/* PUBLIC ROUTE */
app.get("/:shortCode", redirect);

// Routes
app.route("/api/auth", authRouter);
app.route("/api/urls", urlRouter);
app.route("/api/me", meRouter);

// Health check
app.get(
  "/health",
  rateLimit(10, 60),
  CatchAsync(async (c) => {
    const db = getDb(c.env.DATABASE_URL);
    await db.execute("select 1");

    return c.json({
      success: true,
      message: "OK",
    });
  })
);

// Global error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

export default app;
