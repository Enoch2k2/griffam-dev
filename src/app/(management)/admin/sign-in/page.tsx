import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { readAuthConfig } from "@/server/auth/config";
import { AuthButton } from "@/features/auth/auth-button";
export const metadata = { title: "Owner sign-in" };

type Props = { searchParams: Promise<{ error?: string }> };
export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <main id="main">
            <p role="status">Loading owner sign-in…</p>
          </main>
        </div>
      }
    >
      <SignInContent {...props} />
    </Suspense>
  );
}

async function SignInContent({ searchParams }: Props) {
  await connection();
  const configured = Boolean(readAuthConfig());
  const { error } = await searchParams;
  return (
    <div className="shell">
      <main id="main">
        <section className="page-section">
          <p className="eyebrow">GriffamDev / owner access</p>
          <h1>Welcome back, Enoch.</h1>
          <p className="lead">
            Sign in to manage GriffamDev. This area is reserved for the site
            owner.
          </p>
          {error && (
            <p role="alert">
              Sign-in wasn’t completed. Use your authorized Google account and
              try again.
            </p>
          )}
          {configured ? (
            <AuthButton action="sign-in" />
          ) : (
            <p className="notice">Owner sign-in is awaiting configuration.</p>
          )}
          <div className="actions">
            <Link href="/">Back to home</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
