import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { sampleArticle } from "./sample-article";
import { validatePost } from "./validation";
it("provides a publishable sample with existing bundled illustrations, without saving it", () => {
  expect(sampleArticle.published).toBe(false);
  expect(sampleArticle.id).toBe("");
  expect(validatePost({ ...sampleArticle, id: "00000000-0000-4000-8000-000000000001", action: "publish" })).not.toBeNull();
  const paths = [...sampleArticle.body.matchAll(/\]\((\/images\/blog\/[^ ]+)/g)];
  expect(paths).toHaveLength(2);
  for (const match of paths) expect(existsSync(`public${match[1]}`)).toBe(true);
});
