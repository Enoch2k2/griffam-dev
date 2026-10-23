const workflowUrl = "https://github.com/Enoch2k2/griffam-dev/actions/workflows/email.yml";

export function EmailWorkflowStatus() {
  return (
    <aside className="email-workflow-status" aria-labelledby="email-workflow-heading">
      <div>
        <h2 id="email-workflow-heading">Email processing</h2>
        <p className="form-help">
          The badge shows the latest workflow result, not individual email delivery.
          Scheduled runs can be delayed. Open GitHub to run the worker or inspect a failure.
        </p>
      </div>
      <a className="email-workflow-link" href={workflowUrl} target="_blank" rel="noopener noreferrer">
        {/* A live third-party SVG badge should bypass Next image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${workflowUrl}/badge.svg?branch=main`}
          alt="Process inquiry emails — GitHub Actions status"
          width={220}
          height={20}
          referrerPolicy="no-referrer"
        />
        <span>Open email workflow ↗</span>
      </a>
    </aside>
  );
}
