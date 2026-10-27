"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArticleBody } from "./article-body";
import { TITLE_MIN, TITLE_MAX, validatePost, type Draft, type PostInput } from "./validation";

import { formats, formatMarkdown, slugFromTitle, type Format } from "./editor-tools";

const blank: Draft = { id: "", title: "", slug: "", summary: "", body: "", version: 0, published: false };
export function PostEditor({ initial = blank }: { initial?: Draft }) {
  const [draft, setDraft] = useState(initial);
  const [autoSlug, setAutoSlug] = useState(!initial.id && !initial.slug);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const [dirty, setDirty] = useState(!initial.id && Boolean(initial.body));
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const id = useRef(initial.id);
  useEffect(() => { if (notice) feedback.current?.focus(); }, [notice]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(field: "title" | "slug" | "summary" | "body", value: string) {
    if (field === "slug") setAutoSlug(false);
    setDraft(current => ({ ...current, [field]: value, ...(field === "title" && autoSlug && !current.published ? { slug: slugFromTitle(value) } : {}) }));
    setDirty(true);
  }
  function format(format: Format) {
    const input = bodyInput.current;
    if (!input) return;
    const result = formatMarkdown(draft.body, input.selectionStart, input.selectionEnd, format);
    if (result.body.length > 40000) {
      setError(true); setNotice("Formatting would exceed the 40,000 character body limit."); return;
    }
    edit("body", result.body);
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(result.start, result.end); });
  }
  async function save(action: PostInput["action"]) {
    if (pending) return;
    id.current ||= crypto.randomUUID();
    const input = { ...draft, id: id.current, action };
    if (!validatePost(input)) {
      setError(true);
      setNotice("Add a title of 3–120 characters and a URL slug of 3–100 lowercase letters, numbers or hyphens. Publishing needs a summary of at least 10 characters and article text of at least 20.");
      return;
    }
    setPending(true); setNotice("");
    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input), signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "saved") throw new Error(result.error || "Save could not be confirmed.");
      setDraft(current => ({ ...current, id: result.id, version: result.version, published: result.published }));
      setAutoSlug(false); setDirty(false); setError(false);
      setNotice(action === "publish" ? "Published. The saved article is now public." :
        action === "unpublish" ? "Unpublished. The article is now private." : "Draft saved. Any live article is unchanged.");
    } catch (error) {
      setError(true);
      setNotice(error instanceof Error && error.name !== "TimeoutError" ? error.message : "Save could not be confirmed. Your text is still here.");
    } finally { setPending(false); }
  }
  return <div className="post-editor">
    <p className="form-help">{draft.published ? "Published · draft edits stay private until you publish again." : "Draft · only you can access this article."} {dirty ? "Unsaved changes." : "No unsaved changes."}</p>
    <p className="form-help">Save before leaving this page. Preview shows your current text; it does not publish it.</p>
    {notice && <div className="inquiry-feedback" role={error ? "alert" : "status"} tabIndex={-1} ref={feedback}>{notice}</div>}
    <fieldset disabled={pending} className="post-editor-fields">
      <legend className="sr-only">Article editor</legend>
      <div className="form-field"><label htmlFor="post-title">Title</label><input id="post-title" minLength={TITLE_MIN} maxLength={TITLE_MAX} aria-describedby="title-help" value={draft.title} onChange={event => edit("title", event.target.value)} /><p className="form-help" id="title-help">{draft.title.length}/{TITLE_MAX} characters · {TITLE_MIN}–{TITLE_MAX} required.</p></div>
      <div className="form-field"><label htmlFor="post-slug">URL slug</label><p className="form-help">Generated from your title for new articles. Customize it if needed. Saved URLs stay fixed unless you edit them; live URLs are locked.</p><input id="post-slug" maxLength={100} value={draft.slug} disabled={draft.published || pending} onChange={event => edit("slug", event.target.value)} />{!draft.published && <button type="button" className="button secondary" onClick={() => { setAutoSlug(true); setDraft(current => ({ ...current, slug: slugFromTitle(current.title) })); setDirty(true); }}>Generate from title</button>}<p className="form-help">/learn/blog/{draft.slug || "your-article"}</p></div>
      <div className="form-field"><label htmlFor="post-summary">Short summary</label><textarea id="post-summary" rows={3} maxLength={300} value={draft.summary} onChange={event => edit("summary", event.target.value)} /></div>
      <div className="actions">
        <button type="button" className="button secondary" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? "Back to writing" : "Preview article"}</button>
      </div>
      {preview ? <section className="post-preview" aria-label="Article preview"><h2>{draft.title || "Untitled article"}</h2><p className="lead">{draft.summary}</p><ArticleBody body={draft.body} /></section> :
        <div className="form-field"><label htmlFor="post-body">Article (Markdown)</label><p className="form-help" id="markdown-help">Write Markdown directly, or select text and use the formatting buttons. Bundled images use ![description](/images/blog/filename.svg). Raw HTML and embeds are disabled.</p><div className="markdown-toolbar" role="group" aria-label="Markdown formatting">{formats.map(([formatId, label, name]) => <button key={formatId} type="button" aria-label={name} title={name} onMouseDown={event => event.preventDefault()} onClick={() => format(formatId)}>{label}</button>)}</div><textarea ref={bodyInput} className="markdown-input" id="post-body" rows={18} maxLength={40000} aria-describedby="markdown-help" value={draft.body} onChange={event => edit("body", event.target.value)} /></div>}
      <div className="actions">
        <button type="button" className="button secondary" onClick={() => save("save")}>{pending ? "Saving…" : "Save draft"}</button>
        <button type="button" className="button" onClick={() => save("publish")}>{draft.published ? "Publish changes" : "Publish article"}</button>
        {draft.published && <button type="button" className="button secondary" onClick={() => save("unpublish")}>Unpublish</button>}
      </div>
    </fieldset>
    {draft.published && <p className="form-help"><a href={`/learn/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer">View live article ↗</a></p>}
    {draft.id && <p className="form-help"><Link href={`/admin/posts/${draft.id}`}>Saved article permalink</Link></p>}
  </div>;
}
