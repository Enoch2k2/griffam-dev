import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getDatabase } from "@/server/db";
import { publishedList } from "@/server/content/store";
export const metadata = { title: "Blog", description: "Articles and engineering lessons from Enoch Griffith." };
export default function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <section className="page-section">
    <p className="eyebrow">Blog</p><h1>Notes from the build.</h1>
    <p className="lead">Engineering lessons, useful ideas, and the details behind what I build.</p>
    <Suspense fallback={<p role="status">Loading articles…</p>}><Articles searchParams={searchParams} /></Suspense>
  </section>;
}
async function Articles({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await connection();
  const value = Number((await searchParams).page || 1);
  const page = Number.isSafeInteger(value) && value > 0 && value <= 10000 ? value : 1;
  const rows = await publishedList(getDatabase(), page);
  return <>
    {!rows.length && <p className="inquiry-feedback">No articles on this page yet. Check back for notes from the next build.</p>}
    {rows.slice(0, 20).map(row => <article className="project-card" key={row.slug}>
      <p className="eyebrow">{row.publishedAt?.toISOString().slice(0, 10)} · Enoch Griffith</p>
      <h2><Link href={`/learn/blog/${row.slug}`}>{row.title}</Link></h2><p className="body-copy">{row.summary}</p>
      <div className="actions"><Link href={`/learn/blog/${row.slug}`}>Read article →</Link></div>
    </article>)}
    <nav className="actions" aria-label="Blog pages">
      {page > 1 && <Link href={`/learn/blog?page=${page - 1}`}>← Newer articles</Link>}
      {rows.length > 20 && <Link href={`/learn/blog?page=${page + 1}`}>Older articles →</Link>}
    </nav>
  </>;
}
