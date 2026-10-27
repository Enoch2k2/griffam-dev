import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { AuthButton } from "@/features/auth/auth-button";
export const metadata = { title: "Admin" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <main id="main">
            <p role="status">Checking owner access…</p>
          </main>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const access = await getAdminAccess(await headers());
  if (access.status !== "authorized") redirect("/admin/sign-in");
  return (
    <div className="shell">
      <main id="main">
        <section className="page-section">
          <p className="eyebrow">GriffamDev / administration</p>
          <h1>Welcome, {access.user.name}.</h1>
          <p className="lead">Your owner access is active.</p>
          <p>
            Manage your articles, resume and project inquiries. Booking and blog image uploads are coming next.
          </p>
          <div className="actions">
            <Link className="button" href="/admin/inquiries">Project inquiries</Link>
            <Link className="button" href="/admin/posts">Manage articles</Link>
            <Link className="button" href="/admin/resume">Manage resume</Link>
            <Link className="button" href="/admin/availability">Availability</Link>
            <AuthButton action="sign-out" />
            <Link href="/">View website</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
