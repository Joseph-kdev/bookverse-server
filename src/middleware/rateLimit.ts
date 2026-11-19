import { Request } from "express";
import { rateLimit } from "express-rate-limit";
import { AuthenticatedRequest } from "./verifyToken";

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Must run after requireAuth: limits are applied per Firebase user, not per IP.
const userKey = (req: Request) => `uid:${(req as AuthenticatedRequest).user?.uid ?? "anonymous"}`;

const limitReached = (windowLabel: string) => ({
  error: `You've reached the chat limit (${windowLabel}). Please try again later.`,
  code: "RATE_LIMITED",
});

/**
 * NOTE: the default store is in memory. On Vercel each serverless instance has
 * its own memory, so these limits are best-effort. For strict global limits,
 * plug in a shared store (e.g. Upstash Redis via `rate-limit-redis`).
 */
export const chatBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: toPositiveInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE, 6),
  keyGenerator: userKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitReached("per minute"),
});

export const chatDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: toPositiveInt(process.env.CHAT_RATE_LIMIT_PER_DAY, 60),
  keyGenerator: userKey,
  standardHeaders: false,
  legacyHeaders: false,
  message: limitReached("per day"),
});
