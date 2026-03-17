import { eq, sql } from "drizzle-orm";
import { analytics, urls } from "../db/schema";
import { getDb } from "../lib/db";
import { CatchAsync } from "../utils/CatchAsync";
import { customAlphabet } from "nanoid";

const generateShortCode = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  6
);

export const createShortUrl = CatchAsync(async (c) => {
  const { originalUrl } = await c.req.json();

  if (
    !originalUrl ||
    typeof originalUrl !== "string" ||
    !/^https?:\/\//.test(originalUrl)
  ) {
    return c.json({ message: "Invalid URL" }, 400);
  }

  const userId = c.get("userId");
  const db = getDb(c.env.DATABASE_URL);

  let shortCode;
  let url;

  for (let i = 0; i < 5; i++) {
    try {
      shortCode = generateShortCode();

      url = await db
        .insert(urls)
        .values({
          shortCode,
          originalUrl,
          userId,
        })
        .returning()
        .then((res) => res[0]);

      break;
    } catch (err: any) {
      if (err.code !== "23505") throw err;
    }
  }

  if (!url) {
    return c.json({ message: "Failed to generate short code" }, 500);
  }

  return c.json({
    success: true,
    shortUrl: `${new URL(c.req.url).origin}/${url.shortCode}`,
  });
});

export const redirect = CatchAsync(async (c) => {
  const { shortCode } = c.req.param();

  const db = getDb(c.env.DATABASE_URL);

  const url = await db
    .select()
    .from(urls)
    .where(eq(urls.shortCode, shortCode))
    .limit(1)
    .then((res) => res[0]);

  if (!url) {
    return c.json({ success: false, message: "URL not found" }, 404);
  }

  if (!url.isActive) {
    return c.json({ success: false, message: "URL is inactive" }, 403);
  }

  if (url.expiresAt && url.expiresAt < new Date()) {
    return c.json({ success: false, message: "URL has expired" }, 403);
  }

  /* increment click count */
  c.executionCtx.waitUntil(
    db
      .update(urls)
      .set({
        clickCount: sql`${urls.clickCount} + 1`,
      })
      .where(eq(urls.id, url.id))
  );

  const userAgent = c.req.header("user-agent") || "";
  const referer = c.req.header("referer") || "";
  const country =
    c.req.header("cf-ipcountry") || c.req.header("x-country") || "";

  /* save analytics */
  c.executionCtx.waitUntil(
    db.insert(analytics).values({
      urlId: url.id,
      clickedAt: new Date(),
      userAgent,
      referer,
      country,
    })
  );

  /* redirect */
  return c.redirect(url.originalUrl);
});

const getAnalyticsSummary = async (
  db: ReturnType<typeof getDb>,
  urlId: number
) =>
  db
    .select({
      totalClicks: sql`COUNT(*)`,
      firstClickAt: sql`MIN(${analytics.clickedAt})`,
      lastClickAt: sql`MAX(${analytics.clickedAt})`,
    })
    .from(analytics)
    .where(eq(analytics.urlId, urlId))
    .then((res) => res[0]);

const getAnalyticsByDay = async (db: ReturnType<typeof getDb>, urlId: number) =>
  db
    .select({
      day: sql`DATE(${analytics.clickedAt})`,
      count: sql`COUNT(*)`,
    })
    .from(analytics)
    .where(eq(analytics.urlId, urlId))
    .groupBy(sql`DATE(${analytics.clickedAt})`)
    .orderBy(sql`DATE(${analytics.clickedAt}) DESC`)
    .limit(30);

const getAnalyticsByCountry = async (
  db: ReturnType<typeof getDb>,
  urlId: number
) =>
  db
    .select({
      country: analytics.country,
      count: sql`COUNT(*)`,
    })
    .from(analytics)
    .where(eq(analytics.urlId, urlId))
    .groupBy(analytics.country)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(20);

const getRecentClicks = async (db: ReturnType<typeof getDb>, urlId: number) =>
  db
    .select()
    .from(analytics)
    .where(eq(analytics.urlId, urlId))
    .orderBy(sql`${analytics.clickedAt} DESC`)
    .limit(20);

export const getAnalytics = CatchAsync(async (c) => {
  const { shortCode } = c.req.param();
  const userId = c.get("userId");

  const db = getDb(c.env.DATABASE_URL);

  const url = await db
    .select()
    .from(urls)
    .where(eq(urls.shortCode, shortCode))
    .limit(1)
    .then((res) => res[0]);

  if (!url || url.userId !== userId) {
    return c.json({ message: "Not found" }, 404);
  }

  const [summary, clicksByDay, clicksByCountry, recentClicks] =
    await Promise.all([
      getAnalyticsSummary(db, url.id),
      getAnalyticsByDay(db, url.id),
      getAnalyticsByCountry(db, url.id),
      getRecentClicks(db, url.id),
    ]);

  return c.json({
    shortCode,
    url,
    analytics: {
      summary,
      byDay: clicksByDay,
      byCountry: clicksByCountry,
      recent: recentClicks,
    },
  });
});
