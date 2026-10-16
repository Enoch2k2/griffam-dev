import "server-only";
export type AuthConfig = {
  baseURL: string;
  secret: string;
  ownerEmail: string;
  googleClientId: string;
  googleClientSecret: string;
};

// Fail closed until every required setting is present. Never return secret values in errors.
export function readAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig | null {
  const {
    BETTER_AUTH_URL,
    BETTER_AUTH_SECRET,
    ADMIN_EMAIL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    DATABASE_URL,
  } = env;
  if (
    !BETTER_AUTH_URL ||
    !BETTER_AUTH_SECRET ||
    !ADMIN_EMAIL ||
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !DATABASE_URL
  )
    return null;
  let url: URL;
  try {
    url = new URL(BETTER_AUTH_URL);
  } catch {
    return null;
  }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    return null;
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    return null;
  if (
    BETTER_AUTH_SECRET.length < 32 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim())
  )
    return null;
  return {
    baseURL: url.origin,
    secret: BETTER_AUTH_SECRET,
    ownerEmail: ADMIN_EMAIL.trim().toLowerCase(),
    googleClientId: GOOGLE_CLIENT_ID,
    googleClientSecret: GOOGLE_CLIENT_SECRET,
  };
}

export function isOwner(
  user: { email: string; emailVerified: boolean },
  ownerEmail: string,
) {
  return (
    user.emailVerified === true &&
    user.email.toLowerCase() === ownerEmail.toLowerCase()
  );
}
