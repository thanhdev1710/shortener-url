// GET /api/me/urls
// DELETE /api/urls/:id
// PATCH /api/urls/:id

import { Hono } from "hono";
import { jwtMiddleware } from "../lib/jwt";
import { CatchAsync } from "../utils/CatchAsync";
import { getDb } from "../lib/db";
import { eq, sql } from "drizzle-orm";
import { users, urls } from "../db/schema";

const meRouter = new Hono();

meRouter.use(jwtMiddleware);

meRouter.get(
  "/",
  CatchAsync(async (c) => {
    const userId = c.get("userId");
    const db = getDb(c.env.DATABASE_URL);

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((res) => res[0]);

    return c.json({
      user,
      success: true,
      message: "User info",
    });
  })
);

/* =========================
   OWN URLS
========================= */

meRouter.get(
  "/urls",
  CatchAsync(async (c) => {
    const userId = c.get("userId");
    const db = getDb(c.env.DATABASE_URL);

    const urlsList = await db
      .select()
      .from(urls)
      .where(eq(urls.userId, userId))
      .orderBy(sql`created_at DESC`);

    return c.json({
      success: true,
      urls: urlsList,
    });
  })
);

meRouter.delete(
  "/urls/:id",
  CatchAsync(async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    const db = getDb(c.env.DATABASE_URL);

    const existing = await db
      .select()
      .from(urls)
      .where(eq(urls.id, id))
      .limit(1)
      .then((res) => res[0]);

    if (!existing || existing.userId !== userId) {
      return c.json({ success: false, message: "Not found" }, 404);
    }

    await db.delete(urls).where(eq(urls.id, id));

    return c.json({ success: true, message: "Deleted" });
  })
);

meRouter.patch(
  "/urls/:id",
  CatchAsync(async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    const { originalUrl, expiresAt, isActive } = await c.req.json();
    const db = getDb(c.env.DATABASE_URL);

    const existing = await db
      .select()
      .from(urls)
      .where(eq(urls.id, id))
      .limit(1)
      .then((res) => res[0]);

    if (!existing || existing.userId !== userId) {
      return c.json({ success: false, message: "Not found" }, 404);
    }

    const updates: Partial<{
      originalUrl: string;
      expiresAt: Date | null;
      isActive: boolean;
    }> = {};

    if (originalUrl !== undefined) {
      if (
        !originalUrl ||
        typeof originalUrl !== "string" ||
        !/^https?:\/\//.test(originalUrl)
      ) {
        return c.json({ success: false, message: "Invalid URL" }, 400);
      }
      updates.originalUrl = originalUrl;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updates.expiresAt = null;
      } else {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          return c.json({ success: false, message: "Invalid expiresAt" }, 400);
        }

        const now = new Date();
        if (parsed < now) {
          return c.json(
            { success: false, message: "expiresAt cannot be in the past" },
            400
          );
        }

        if (existing.createdAt && parsed < new Date(existing.createdAt)) {
          return c.json(
            {
              success: false,
              message: "expiresAt cannot be earlier than creation date",
            },
            400
          );
        }

        updates.expiresAt = parsed;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ success: false, message: "No changes provided" }, 400);
    }

    await db.update(urls).set(updates).where(eq(urls.id, id));

    return c.json({ success: true, message: "Updated" });
  })
);

export default meRouter;
