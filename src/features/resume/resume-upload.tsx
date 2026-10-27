"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function ResumeUpload({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const file = input.current?.files?.[0];
    setFailed(true);
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) { setMessage("Choose a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("The PDF must be 5 MB or smaller."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/resume", { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file, signal: AbortSignal.timeout(60_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setFailed(false); setMessage(result.message); if (input.current) input.current.value = "";
      router.refresh();
    } catch (error) {
      setFailed(true); setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "Upload could not be confirmed. Check the current download before retrying.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={upload} className="post-editor">
    <p className="body-copy">Publishing makes this PDF available to everyone through the Resume page. A new upload replaces the current download; keep a copy of your previous PDF.</p>
    <fieldset disabled={!enabled || busy} className="post-editor-fields">
      <legend className="sr-only">Publish resume</legend>
      <div className="form-field"><label htmlFor="resume-pdf">Resume PDF</label><p className="form-help" id="resume-help">PDF only, up to 5 MB. Include only contact details you want to share publicly.</p><input id="resume-pdf" ref={input} type="file" accept=".pdf,application/pdf" aria-describedby="resume-help" /></div>
      <button className="button" type="submit">{busy ? "Uploading…" : "Upload and publish resume"}</button>
    </fieldset>
    {message && <p className="inquiry-feedback" role={failed ? "alert" : "status"}>{message}</p>}
  </form>;
}
