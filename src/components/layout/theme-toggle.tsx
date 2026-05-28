"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cl-theme";

function applyTheme(mode: "light" | "dark") {
  document.body.classList.remove("light", "dark");
  document.body.classList.add(mode);
  document.body.classList.add("theme-lab");
}

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null)) || null;
    const initial = stored ?? "dark";
    setMode(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
      className="btn btn-ghost btn-sm"
      title={mode === "dark" ? "Light mode" : "Dark mode"}
      style={{ padding: "6px 8px" }}
    >
      <span className="mono" style={{ fontSize: 11 }}>{mode === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
