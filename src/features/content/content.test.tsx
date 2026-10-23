import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ArticleBody } from "./article-body";
import { PostEditor } from "./post-editor";
afterEach(() => vi.unstubAllGlobals());
const draft = { id: "00000000-0000-4000-8000-000000000001", title: "A useful article", slug: "useful-article", summary: "A useful summary for readers.", body: "A helpful lesson about building software.", version: 1, published: false };
it("renders code and links while blocking raw HTML, unsafe URLs and external images", () => {
  const { container } = render(<ArticleBody body={'## A lesson\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![track](https://example.com/track.png)\n\n```js\nconst x = 1;\n```'} />);
  expect(screen.getByRole("heading", { name: "A lesson" })).toBeInTheDocument();
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(container.querySelector("pre")).toHaveTextContent("const x = 1;");
});
it("previews locally without publishing or saving", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<PostEditor initial={draft} />);
  await userEvent.click(screen.getByRole("button", { name: "Preview article" }));
  expect(screen.getByRole("region", { name: "Article preview" })).toHaveTextContent(draft.body);
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves typed content after a conflict", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Changed in another tab." }) }));
  render(<PostEditor initial={draft} />);
  fireEvent.change(screen.getByLabelText("Article (Markdown)"), { target: { value: "My unsaved changes should remain." } });
  await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Changed in another tab");
  expect(screen.getByLabelText("Article (Markdown)")).toHaveValue("My unsaved changes should remain.");
});
it("saves drafts without claiming publication and uses the returned version for publishing", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: "saved", id: draft.id, version: 2, published: false }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "saved", id: draft.id, version: 3, published: true }) });
  vi.stubGlobal("fetch", fetch);
  render(<PostEditor initial={draft} />);
  await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("status")).toHaveTextContent("live article is unchanged");
  await userEvent.click(screen.getByRole("button", { name: "Publish article" }));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ version: 2, action: "publish" });
  expect(await screen.findByRole("status")).toHaveTextContent("now public");
  expect(screen.getByLabelText("URL slug")).toBeDisabled();
});
it("generates a slug from a new title and respects manual overrides", () => {
  render(<PostEditor />);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My First Flask App!" } });
  expect(screen.getByLabelText("URL slug")).toHaveValue("my-first-flask-app");
  fireEvent.change(screen.getByLabelText("URL slug"), { target: { value: "custom-url" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Another Title" } });
  expect(screen.getByLabelText("URL slug")).toHaveValue("custom-url");
  fireEvent.click(screen.getByRole("button", { name: "Generate from title" }));
  expect(screen.getByLabelText("URL slug")).toHaveValue("another-title");
});
it("keeps saved slugs stable when editing a title", () => {
  render(<PostEditor initial={draft} />);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A revised title" } });
  expect(screen.getByLabelText("URL slug")).toHaveValue(draft.slug);
  expect(screen.getByLabelText("Title")).toHaveAttribute("maxlength", "120");
});
it("formats selected body text and shows it in preview", async () => {
  render(<PostEditor initial={draft} />);
  const body = screen.getByLabelText("Article (Markdown)") as HTMLTextAreaElement;
  body.setSelectionRange(0, 9);
  await userEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(body.value).toBe("**A helpful** lesson about building software.");
  await userEvent.click(screen.getByRole("button", { name: "Preview article" }));
  expect(screen.getByRole("region", { name: "Article preview" }).querySelector("strong")).toHaveTextContent("A helpful");
});
it("rejects too-short and overlong titles without saving", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<PostEditor initial={{ ...draft, title: "x".repeat(121) }} />);
  await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("3–120");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "ab" } });
  await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(fetch).not.toHaveBeenCalled();
});
