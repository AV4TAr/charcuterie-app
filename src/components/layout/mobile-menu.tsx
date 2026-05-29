"use client";

import { useState, useEffect } from "react";
import { Link } from "@/lib/i18n/routing";

type Item = {
  href: string;
  label: string;
  badge?: string;
};

export function MobileMenu({
  items,
  signOutLabel,
  isLoggedIn,
}: {
  items: Item[];
  signOutLabel: string;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden btn btn-sm btn-ghost"
        style={{ padding: "6px 10px", fontSize: 18, lineHeight: 1 }}
      >
        ☰
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 50,
            }}
          />
          <nav
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(280px, 80vw)",
              background: "var(--paper)",
              borderLeft: "1px solid var(--rule)",
              padding: "20px",
              zIndex: 51,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              style={{
                alignSelf: "flex-end",
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
                color: "var(--ink-2)",
                padding: "4px 10px",
                marginBottom: 8,
              }}
            >
              ×
            </button>

            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: "var(--ink)",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 15,
                }}
              >
                {item.label}
                {item.badge && (
                  <span className="tag tag-accent" style={{ fontSize: 8, padding: "1px 5px" }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {isLoggedIn && (
              <form action="/auth/logout" method="post" style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {signOutLabel}
                </button>
              </form>
            )}
          </nav>
        </>
      )}
    </>
  );
}
