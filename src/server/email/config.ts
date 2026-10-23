import "server-only";

export function readEmailConfig(env: Record<string, string | undefined> = process.env) {
  const { EMAIL_ENABLED, RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAIL, BETTER_AUTH_URL, EMAIL_WORKER_SECRET } = env;
  const email = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
  if (EMAIL_ENABLED !== "true" || !RESEND_API_KEY || !EMAIL_FROM ||
      !ADMIN_EMAIL || !BETTER_AUTH_URL || !EMAIL_WORKER_SECRET ||
      EMAIL_WORKER_SECRET.length < 32 || !email.test(EMAIL_FROM) || !email.test(ADMIN_EMAIL)) return null;
  try {
    const url = new URL(BETTER_AUTH_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return { apiKey: RESEND_API_KEY, from: EMAIL_FROM, owner: ADMIN_EMAIL, origin: url.origin };
  } catch { return null; }
}
export type EmailConfig = NonNullable<ReturnType<typeof readEmailConfig>>;
