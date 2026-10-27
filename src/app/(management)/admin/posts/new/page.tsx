import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { PostEditor } from "@/features/content/post-editor";
export const metadata = { title: "Write an article" };
export default function Page() {
  return <Suspense fallback={<p role="status">Checking owner access…</p>}><NewArticle /></Suspense>;
}
async function NewArticle() {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin/posts">← Articles</Link><p className="eyebrow">Owner publishing</p><h1>Write something useful.</h1><p className="form-help"><Link href="/admin/posts/example">Try the illustrated GriffamDev sample article →</Link></p><PostEditor />
  </section></main></div>;
}
