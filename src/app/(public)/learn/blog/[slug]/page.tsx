import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDatabase } from "@/server/db";
import { publishedPost } from "@/server/content/store";
import { ArticleBody } from "@/features/content/article-body";
export const metadata = { title: "Article" };
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<p role="status">Loading article…</p>}><Article params={params} /></Suspense>;
}
async function Article({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const row = await publishedPost(getDatabase(), (await params).slug);
  if (!row?.article) notFound();
  return <article className="page-section">
    <Link href="/learn/blog">← All articles</Link>
    <p className="eyebrow">Enoch Griffith · {row.publishedAt?.toISOString().slice(0, 10)}</p>
    <h1>{row.article.title}</h1><p className="lead">{row.article.summary}</p>
    <ArticleBody body={row.article.body} />
  </article>;
}
