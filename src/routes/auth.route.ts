// POST /api/auth/google
// POST /api/auth/logout
// POST /api/auth/refresh-token

import { Hono } from "hono";
import {
  googleLogin,
  logout,
  refreshToken,
} from "../controllers/auth.controller";

const authRouter = new Hono();

authRouter.post("/google", googleLogin);
authRouter.post("/logout", logout);
authRouter.post("/refresh-token", refreshToken);

export default authRouter;
