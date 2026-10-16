import { getAdminAccess } from "@/server/auth/access";

export async function GET(request: Request) {
  const access = await getAdminAccess(request.headers);
  const headers = { "Cache-Control": "no-store" };
  if (access.status !== "authorized") {
    const status = { unavailable: 503, unauthenticated: 401, forbidden: 403 }[
      access.status
    ];
    return Response.json(
      { error: "Admin access required." },
      { status, headers },
    );
  }
  return Response.json(
    { user: { name: access.user.name, email: access.user.email } },
    { headers },
  );
}
