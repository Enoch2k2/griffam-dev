import "server-only";
import { desc, eq } from "drizzle-orm";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { post } from "@/server/db/schema";

export async function adminPosts(headers: Headers, page: number) {
  if ((await getAdminAccess(headers)).status !== "authorized") return { status: "denied" } as const;
  const rows = await getDatabase().select({
    id: post.id, title: post.title, slug: post.slug, updatedAt: post.updatedAt, publishedAt: post.publishedAt,
  }).from(post).orderBy(desc(post.updatedAt), desc(post.id)).limit(21).offset((page - 1) * 20);
  return { status: "ready", rows: rows.slice(0, 20), hasMore: rows.length > 20 } as const;
}
export async function adminPost(headers: Headers, id: string) {
  if ((await getAdminAccess(headers)).status !== "authorized") return { status: "denied" } as const;
  const row = await getDatabase().query.post.findFirst({ where: eq(post.id, id) });
  return { status: "ready", draft: row ? {
    id: row.id, title: row.title, slug: row.slug, summary: row.summary,
    body: row.body, version: row.version, published: Boolean(row.published),
  } : null } as const;
}
