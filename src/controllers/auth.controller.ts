import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { getDb } from "../lib/db";
import { CatchAsync } from "../utils/CatchAsync";
import { jwtSign, jwtVerify } from "../lib/jwt";

/* ================= REFRESH TOKEN ================= */

export const refreshToken = CatchAsync(async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const refreshToken = body.refreshToken;

  if (!refreshToken) {
    return c.json({ success: false, message: "Refresh token required" }, 400);
  }

  const payload = await jwtVerify(refreshToken, c.env.JWT_SECRET);

  const db = getDb(c.env.DATABASE_URL);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(payload.sub)))
    .limit(1)
    .then((res) => res[0]);

  if (!user || user.refreshToken !== refreshToken) {
    return c.json({ success: false, message: "Invalid refresh token" }, 401);
  }

  const newAccessToken = await jwtSign(
    { sub: user.id },
    60 * 15,
    c.env.JWT_SECRET
  );

  return c.json({
    success: true,
    accessToken: newAccessToken,
  });
});

/* ================= LOGOUT ================= */
export const logout = CatchAsync(async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const refreshToken = body.refreshToken;

  if (!refreshToken) {
    return c.json({ success: false, message: "Refresh token required" }, 400);
  }

  const payload = await jwtVerify(refreshToken, c.env.JWT_SECRET);

  const db = getDb(c.env.DATABASE_URL);

  await db
    .update(users)
    .set({ refreshToken: null })
    .where(eq(users.id, Number(payload.sub)));

  return c.json({
    success: true,
    message: "Logged out",
  });
});

/* ================= GOOGLE OAUTH ================= */
export const googleLogin = CatchAsync(async (c) => {
  const { idToken } = await c.req.json();

  if (!idToken || typeof idToken !== "string") {
    return c.json({ success: false, message: "idToken required" }, 400);
  }

  const verifyRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken
    )}`
  );

  if (!verifyRes.ok) {
    return c.json({ success: false, message: "Invalid Google token" }, 401);
  }

  const payload = (await verifyRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: string;
    name?: string;
  };

  if (!payload.sub || !payload.email) {
    return c.json(
      { success: false, message: "Invalid Google token payload" },
      401
    );
  }

  if (payload.email_verified !== "true" && !!payload.email_verified !== true) {
    return c.json({ success: false, message: "Email not verified" }, 401);
  }

  const db = getDb(c.env.DATABASE_URL);

  let user = await db
    .select()
    .from(users)
    .where(eq(users.googleId, payload.sub))
    .limit(1)
    .then((res) => res[0]);

  if (!user) {
    user = await db
      .select()
      .from(users)
      .where(eq(users.email, payload.email))
      .limit(1)
      .then((res) => res[0]);

    if (user) {
      await db
        .update(users)
        .set({ googleId: payload.sub })
        .where(eq(users.id, user.id));
    }
  }

  if (!user) {
    user = await db
      .insert(users)
      .values({
        email: payload.email,
        googleId: payload.sub,
        name: payload.name,
      })
      .returning()
      .then((res) => res[0]);
  }

  const accessToken = await jwtSign(
    { sub: user.id },
    60 * 15,
    c.env.JWT_SECRET
  );

  const refreshToken = await jwtSign(
    { sub: user.id },
    60 * 60 * 24 * 7,
    c.env.JWT_SECRET
  );

  await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));

  return c.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});
