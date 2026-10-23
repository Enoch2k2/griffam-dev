import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmailWorkflowStatus } from "@/features/inquiries/email-workflow-status";
import { readInbox } from "@/server/inquiries/inbox";
export const metadata = { title: "Project inquiries" };
type Props = { searchParams: Promise<{ page?: string }> };
export default function Page(props: Props) {
  return <div className="shell"><main id="main"><section className="page-section">
    <p className="eyebrow">Owner inbox</p><h1>Project inquiries.</h1>
    <p className="body-copy">Messages submitted through the contact form. Email status appears below each inquiry. Accepted means the email provider accepted the send; it does not prove inbox delivery.</p>
    <Link href="/admin">← Administration</Link>
    <Suspense fallback={<p role="status">Loading inquiries…</p>}><Inbox {...props} /></Suspense>
  </section></main></div>;
}
async function Inbox({ searchParams }: Props) {
  const { page: value } = await searchParams;
  const parsed = Number(value || 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const inbox = await readInbox(await headers(), page);
  if (inbox.status === "denied") redirect("/admin/sign-in");
  if (inbox.status === "unavailable") return <p role="alert">The inbox is temporarily unavailable. Please reload to try again.</p>;
  return <>
    <EmailWorkflowStatus />
    {inbox.rows.length === 0 ? <p className="inquiry-feedback">No inquiries on this page.</p> : <div className="inbox-list">
      {inbox.rows.map(item => <article className="inbox-item" key={item.id}>
        <p className="eyebrow">{item.service}</p>
        <h2>{item.name}</h2>
        <p><a href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a></p>
        <p className="form-help"><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</time></p>
        <p className="inquiry-message">{item.message}</p>
        {item.emails.length === 0 ? <p className="form-help">Email was not enabled when this inquiry was saved.</p> :
          <ul className="form-help" aria-label="Email notifications">
            {item.emails.map(email => <li key={email.kind}>
              {email.kind === "owner" ? "Owner notification" : "Visitor receipt"}: {email.status}
              {email.status === "pending" && " — queued for automatic retry or first send"}
              {email.status === "processing" && " — sending; interrupted attempts recover automatically"}
              {(email.status === "review" || email.status === "failed") && " — operator attention needed"}
              {email.attempts > 0 && ` · ${email.attempts} attempt(s)`}
              {email.lastError && ` · ${email.lastError}`}
            </li>)}
          </ul>}

      </article>)}
    </div>}
    <nav className="actions" aria-label="Inbox pages">
      {page > 1 && <Link href={`/admin/inquiries?page=${page - 1}`}>← Newer inquiries</Link>}
      <span>Page {page}</span>
      {inbox.hasMore && <Link href={`/admin/inquiries?page=${page + 1}`}>Older inquiries →</Link>}
    </nav>
  </>;
}
