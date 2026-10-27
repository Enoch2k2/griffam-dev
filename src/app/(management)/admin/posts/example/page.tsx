import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { PostEditor } from "@/features/content/post-editor";
import { sampleArticle } from "@/features/content/sample-article";
export const metadata = { title: "Sample article" };
export default function Page() {
  return <Suspense fallback={<p role="status">Checking owner access…</p>}><NewArticle /></Suspense>;
}
async function NewArticle() {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin/posts">← Articles</Link><p className="eyebrow">Owner publishing</p><h1>A starting point for your blog.</h1><p className="lead">Sample article with illustrations. Review and edit it, then save a draft when you’re ready. Nothing is published automatically.</p><PostEditor initial={sampleArticle} />
  </section></main></div>;
}
