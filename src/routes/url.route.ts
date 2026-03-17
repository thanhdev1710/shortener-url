import { Hono } from "hono";
import { jwtMiddleware } from "../lib/jwt";
import { createShortUrl, getAnalytics } from "../controllers/url.controller";

const urlRouter = new Hono();

/* AUTH ROUTES */
urlRouter.post("/", jwtMiddleware, createShortUrl);
urlRouter.get("/analytics/:shortCode", jwtMiddleware, getAnalytics);

export default urlRouter;
