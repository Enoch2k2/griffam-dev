"use client";

import { useSyncExternalStore } from "react";

const key = "griffamdev-theme";
const event = "griffamdev-theme-change";

function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
    } catch {
      /* Storage may be blocked. */
    }
    document.documentElement.dataset.theme =
      saved === "light" || saved === "cyberpunk"
        ? saved
        : media.matches
          ? "cyberpunk"
          : "light";
    notify();
  };
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) sync();
  };
  window.addEventListener(event, notify);
  window.addEventListener("storage", storage);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener(event, notify);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", sync);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === "cyberpunk",
    () => false,
  );
  function toggle() {
    const next = dark ? "light" : "cyberpunk";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Still works for this visit. */
    }
    window.dispatchEvent(new Event(event));
  }
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      data-active={dark}
      onClick={toggle}
    >
      <span aria-hidden="true" className="theme-symbol">
        ◐
      </span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
