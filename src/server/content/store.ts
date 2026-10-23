import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { post } from "@/server/db/schema";
import type { PostInput } from "@/features/content/validation";

export async function writePost(db: Database, input: PostInput) {
  return db.transaction(async tx => {
    const [existing] = await tx.select({ version: post.version, published: post.published, slug: post.slug })
      .from(post).where(eq(post.id, input.id)).for("update");
    if ((existing?.version ?? 0) !== input.version) return { status: "conflict" } as const;
    if (existing?.published && existing.slug !== input.slug) return { status: "slug_locked" } as const;
    if (!existing && input.action === "unpublish") return { status: "conflict" } as const;
    const article = { title: input.title, summary: input.summary, body: input.body };
    const values = {
      ...article, slug: input.slug, version: input.version + 1, updatedAt: sql`now()`,
      ...(input.action === "publish" ? { published: article, publishedAt: sql`coalesce(${post.publishedAt}, now())` } : {}),
      ...(input.action === "unpublish" ? { published: null, publishedAt: null } : {}),
    };
    if (existing) {
      await tx.update(post).set(values).where(eq(post.id, input.id));
    } else {
      // No existing row for coalesce to reference during INSERT.
      await tx.insert(post).values({ ...values, id: input.id,
        publishedAt: input.action === "publish" ? sql`now()` : null,
      });
    }
    return { status: "saved", id: input.id, version: input.version + 1,
      published: input.action === "publish" || (input.action === "save" && Boolean(existing?.published)) } as const;
  });
}

export async function publishedList(db: Database, page: number) {
  return db.select({
    slug: post.slug,
    title: sql<string>`${post.published}->>'title'`,
    summary: sql<string>`${post.published}->>'summary'`,
    publishedAt: post.publishedAt,
  }).from(post).where(isNotNull(post.published)).orderBy(desc(post.publishedAt), desc(post.id)).limit(21).offset((page - 1) * 20);
}
export async function publishedPost(db: Database, slug: string) {
  const [row] = await db.select({ article: post.published, publishedAt: post.publishedAt })
    .from(post).where(and(eq(post.slug, slug), isNotNull(post.published)));
  return row ?? null;
}
