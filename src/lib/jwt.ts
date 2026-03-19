import { sign, verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { CatchAsync } from "../utils/CatchAsync";

/* ================= SIGN JWT ================= */

export const jwtSign = async (
  payload: Record<string, unknown>,
  expiresIn: number = 60 * 60,
  JWT_SECRET: string
) => {
  const now = Math.floor(Date.now() / 1000);

  return sign(
    {
      ...payload,
      exp: now + expiresIn,
      iat: now,
    },
    JWT_SECRET,
    "HS512"
  );
};

/* ================= VERIFY JWT ================= */

export const jwtVerify = async (token: string, JWT_SECRET: string) => {
  try {
    return await verify(token, JWT_SECRET, "HS512");
  } catch {
    throw new Error("Invalid or expired token");
  }
};

/* ================= AUTH MIDDLEWARE ================= */

export const jwtMiddleware = CatchAsync(async (c, next) => {
  let token: string | undefined;

  const authHeader = c.req.header("Authorization");
  const tokenCookie = getCookie(c, "accessToken");

  // 👉 ƯU TIÊN header trước (chuẩn REST)
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  // 👉 fallback cookie
  else if (tokenCookie) {
    token = tokenCookie;
  }

  if (!token) {
    return c.json(
      {
        success: false,
        message: "Access token required",
      },
      401
    );
  }

  try {
    const payload = await jwtVerify(token, c.env.JWT_SECRET);

    // 👉 lưu user vào context
    c.set("userId", Number(payload.sub));

    await next();
  } catch {
    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      401
    );
  }
});
