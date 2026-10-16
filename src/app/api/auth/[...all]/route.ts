import { getAuth } from "@/server/auth";

async function handle(request: Request) {
  const auth = getAuth();
  if (!auth)
    return Response.json(
      { error: "Sign-in is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return auth.handler(request);
}
export const GET = handle;
export const POST = handle;
