export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export type Article = { title: string; summary: string; body: string };
export type Draft = Article & { id: string; slug: string; version: number; published: boolean };
export type PostInput = Omit<Draft, "published"> & { action: "save" | "publish" | "unpublish" };
export function validatePost(value: unknown): PostInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id)) return null;
  if (typeof v.version !== "number" || !Number.isSafeInteger(v.version) || v.version < 0 || v.version > 1_000_000) return null;
  if (v.action !== "save" && v.action !== "publish" && v.action !== "unpublish") return null;
  if (typeof v.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug) || v.slug.length > 100 || v.slug.length < 3) return null;
  if (typeof v.title !== "string" || v.title.trim().length < TITLE_MIN || v.title.length > TITLE_MAX ||
      typeof v.summary !== "string" || v.summary.length > 300 ||
      typeof v.body !== "string" || v.body.length > 40_000) return null;
  if (v.action === "publish" && (v.body.trim().length < 20 || v.summary.trim().length < 10)) return null;
  return { id: v.id, version: v.version, action: v.action, slug: v.slug,
    title: v.title.trim(), summary: v.summary.trim(), body: v.body };
}
