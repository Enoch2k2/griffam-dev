import { expect, it } from "vitest";
import { formatMarkdown, slugFromTitle } from "./editor-tools";
import { validatePost } from "./validation";
it("normalizes accents, apostrophes, punctuation and long slug endings", () => {
  expect(slugFromTitle(" Café: Enoch’s tools! ")).toBe("cafe-enochs-tools");
  expect(slugFromTitle("x".repeat(99) + " more")).toBe("x".repeat(99));
  expect(slugFromTitle("!!!")).toBe("");
});
it("replaces headings and handles a selected group of lines", () => {
  expect(formatMarkdown("## Old\nNext", 3, 11, "h1").body).toBe("# Old\n# Next");
  expect(formatMarkdown("one\ntwo", 0, 4, "list").body).toBe("- one\ntwo");
  expect(formatMarkdown("", 0, 0, "h2").body).toBe("## ");
});
it("wraps selected text, inserts placeholders, and separates fenced code", () => {
  expect(formatMarkdown("hello", 0, 5, "italic").body).toBe("*hello*");
  expect(formatMarkdown("", 0, 0, "link").body).toBe("[link text](https://example.com)");
  expect(formatMarkdown("beforecode", 6, 10, "code").body).toBe("before\n```\ncode\n```\n");
});
it("enforces title bounds at the shared server validation boundary", () => {
  const input = { id: "00000000-0000-4000-8000-000000000001", version: 0, action: "save", slug: "title", summary: "", body: "" };
  for (const length of [3, 120]) expect(validatePost({ ...input, title: "a".repeat(length) })).not.toBeNull();
  for (const title of ["ab", "   ", "a".repeat(121)]) expect(validatePost({ ...input, title })).toBeNull();
});
