import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminPosts } from "@/server/content/admin";
export const metadata = { title: "Manage articles" };
export default function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <div className="shell"><main id="main"><section className="page-section">
    <p className="eyebrow">Owner publishing</p><h1>Your articles.</h1>
    <Suspense fallback={<p role="status">Loading articles…</p>}><Posts searchParams={searchParams} /></Suspense>
  </section></main></div>;
}
async function Posts({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const value = Number((await searchParams).page || 1);
  const page = Number.isSafeInteger(value) && value > 0 && value <= 10000 ? value : 1;
  const result = await adminPosts(await headers(), page);
  if (result.status === "denied") redirect("/admin/sign-in");
  return <>
    <div className="actions"><Link className="button" href="/admin/posts/new">Write an article</Link><Link href="/admin">← Administration</Link></div>
    {result.rows.length === 0 && <p className="inquiry-feedback">No articles on this page. Start with a lesson from something you built.</p>}
    {result.rows.map(row => <article className="inbox-item" key={row.id}>
      <p className="eyebrow">{row.publishedAt ? "Published · editable draft" : "Private draft"}</p>
      <h2><Link href={`/admin/posts/${row.id}`}>{row.title}</Link></h2>
      <p className="form-help">Last saved {row.updatedAt.toISOString().slice(0, 10)} · /learn/blog/{row.slug}</p>
    </article>)}
    <nav className="actions" aria-label="Article pages">
      {page > 1 && <Link href={`/admin/posts?page=${page - 1}`}>← Newer</Link>}
      {result.hasMore && <Link href={`/admin/posts?page=${page + 1}`}>Older →</Link>}
    </nav>
  </>;
}
