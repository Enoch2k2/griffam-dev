import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../../src/server/db/connection";
import { post } from "../../src/server/db/schema";
import { publishedList, publishedPost, writePost } from "../../src/server/content/store";
import type { PostInput } from "../../src/features/content/validation";
const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("article publishing isolation", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  const name = `griffamdev_content_${randomUUID().replaceAll("-", "")}`;
  const input = (): PostInput => ({ id: randomUUID(), version: 0, title: "Private title", slug: "test-post", summary: "Private summary.", body: "Private draft content, not for public access.", action: "save" });
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL });
    await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" });
  });
  beforeEach(async () => { await database.db.delete(post); });
  afterAll(async () => {
    await database?.pool.end();
    if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); }
  });
  it("keeps drafts private and exposes only published snapshots until explicitly republished", async () => {
    const data = input();
    await writePost(database.db, data);
    expect(await publishedList(database.db, 1)).toEqual([]);
    expect(await publishedPost(database.db, data.slug)).toBeNull();
    await writePost(database.db, { ...data, version: 1, action: "publish", title: "Public title" });
    await writePost(database.db, { ...data, version: 2, title: "New secret title", body: "New secret body" });
    expect((await publishedPost(database.db, data.slug))?.article?.title).toBe("Public title");
    expect(JSON.stringify(await publishedList(database.db, 1))).not.toContain("New secret");
    await writePost(database.db, { ...data, version: 3, action: "publish", title: "Updated public title" });
    expect((await publishedPost(database.db, data.slug))?.article?.title).toBe("Updated public title");
    await writePost(database.db, { ...data, version: 4, action: "unpublish" });
    expect(await publishedList(database.db, 1)).toEqual([]);
    expect(await publishedPost(database.db, data.slug)).toBeNull();
    expect((await database.db.select().from(post))).toHaveLength(1);
  });
  it("allows only one concurrent writer for the same version", async () => {
    const data = input(); await writePost(database.db, data);
    const results = await Promise.all([
      writePost(database.db, { ...data, version: 1, title: "Writer one" }),
      writePost(database.db, { ...data, version: 1, title: "Writer two" }),
    ]);
    expect(results.map(r => r.status).sort()).toEqual(["conflict", "saved"]);
  });
  it("locks published slugs and enforces unique draft URLs", async () => {
    const data = input(); await writePost(database.db, { ...data, action: "publish" });
    expect(await writePost(database.db, { ...data, version: 1, slug: "another-url" })).toEqual({ status: "slug_locked" });
    await expect(writePost(database.db, { ...data, id: randomUUID() })).rejects.toThrow();
    expect((await publishedList(database.db, 1))[0].slug).toBe(data.slug);
  });
  it("bounds public listings and never includes draft fields", async () => {
    for (let i = 0; i < 22; i++) await writePost(database.db, { ...input(), slug: `article-${i}`, action: "publish" });
    const first = await publishedList(database.db, 1);
    expect(first).toHaveLength(21);
    expect(await publishedList(database.db, 2)).toHaveLength(2);
    expect(Object.keys(first[0]).sort()).toEqual(["publishedAt", "slug", "summary", "title"]);
  });
});
