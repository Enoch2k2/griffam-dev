import "server-only";
import { getAuth } from "./index";
import { isOwner, readAuthConfig } from "./config";

export async function getAdminAccess(headers: Headers) {
  const config = readAuthConfig();
  const auth = getAuth();
  if (!auth || !config) return { status: "unavailable" } as const;
  const session = await auth.api.getSession({ headers });
  if (!session) return { status: "unauthenticated" } as const;
  if (!isOwner(session.user, config.ownerEmail))
    return { status: "forbidden" } as const;
  return { status: "authorized", user: session.user } as const;
}
