const buckets = new Map();

export const createRateLimiter = ({ windowMs = 60_000, max = 30, keyPrefix = "" }) => {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();
    const entry = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    buckets.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    next();
  };
};
