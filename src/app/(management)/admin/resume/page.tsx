import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { resumeStatus } from "@/server/resume/storage";
import { ResumeUpload } from "@/features/resume/resume-upload";
export const metadata = { title: "Manage resume" };
export default function Page() {
  return <Suspense fallback={<p role="status">Checking owner access…</p>}><Content /></Suspense>;
}
async function Content() {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  const result = await resumeStatus();
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin">← Administration</Link><p className="eyebrow">Owner publishing</p><h1>Your resume.</h1>
    {result.status === "available" ? <p className="body-copy">Current PDF: {Math.ceil(result.bytes / 1024)} KB. <a href="/api/resume">Download current resume</a></p> :
      <p className="body-copy">{result.status === "unconfigured" ? "Storage setup is still needed before you can upload." : result.status === "unavailable" ? "Storage is temporarily unavailable. Try again shortly." : "No resume has been uploaded yet."}</p>}
    <ResumeUpload enabled={result.status === "available" || result.status === "empty"} />
  </section></main></div>;
}
