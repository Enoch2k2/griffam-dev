"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "./client";

export function AuthButton({ action }: { action: "sign-in" | "sign-out" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function handleClick() {
    setPending(true);
    setError("");
    try {
      const result =
        action === "sign-in"
          ? await authClient.signIn.social({
              provider: "google",
              callbackURL: "/admin",
              errorCallbackURL: "/admin/sign-in?error=signin",
            })
          : await authClient.signOut();
      if (result.error) throw new Error("Authentication failed");
      if (action === "sign-out") {
        router.replace("/admin/sign-in");
        router.refresh();
      }
    } catch {
      setError("We couldn’t complete that request. Please try again.");
      setPending(false);
    }
  }
  return (
    <>
      <button
        className="button"
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
      >
        {pending
          ? "Please wait…"
          : action === "sign-in"
            ? "Continue with Google"
            : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
