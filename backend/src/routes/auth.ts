import { Router } from "express";
import { body, validationResult } from "express-validator";
import { findUserByUsername } from "../models/user";
import { comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ok, fail } from "../utils/response";

const router = Router();

router.post(
  "/login",
  [
    body("username").isString().notEmpty(),
    body("password").isString().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, "Validation error", 400, errors.array());
    }

    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user || !user.is_active) {
      return fail(res, "Invalid username or password", 401);
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return fail(res, "Invalid username or password", 401);
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

    // For simplicity return tokens in body; mobile app will store securely
    return ok(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    }, "Login successful");
  }
);

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return fail(res, "Missing refresh token", 400);
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
    return ok(res, { accessToken }, "Token refreshed");
  } catch {
    return fail(res, "Invalid refresh token", 401);
  }
});

router.post("/logout", (_req, res) => {
  // Stateless JWT: client should discard tokens.
  return ok(res, null, "Logged out");
});

export default router;