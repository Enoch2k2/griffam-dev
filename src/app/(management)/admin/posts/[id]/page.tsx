import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminPost } from "@/server/content/admin";
import { PostEditor } from "@/features/content/post-editor";
export const metadata = { title: "Edit article" };
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status">Loading editor…</p>}><Editor params={params} /></Suspense>;
}
async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const result = await adminPost(await headers(), (await params).id);
  if (result.status === "denied") redirect("/admin/sign-in");
  if (!result.draft) notFound();
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin/posts">← Articles</Link><p className="eyebrow">Owner publishing</p><h1>Edit your article.</h1><PostEditor key={result.draft.id} initial={result.draft} />
  </section></main></div>;
}
