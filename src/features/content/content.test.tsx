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
