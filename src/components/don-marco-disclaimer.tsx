"use client";

import { useState, useTransition } from "react";
import { acceptDonMarcoDisclaimer } from "@/app/actions/disclaimer";

const TEXT = {
  es: {
    title: "Aviso importante — Seguridad alimentaria",
    body: [
      "Don Marco es un asistente de inteligencia artificial. Sus sugerencias son orientativas y pueden contener errores, incluso en cantidades críticas como sal de cura (nitritos/nitratos).",
      "Al continuar, aceptás que:",
    ],
    bullets: [
      "Usás las recetas e indicaciones bajo tu exclusiva responsabilidad.",
      "La aplicación y sus creadores no asumen ninguna responsabilidad por daños a la salud, intoxicaciones u otros perjuicios derivados del uso de estas recetas.",
      "Don Marco no reemplaza el asesoramiento de un profesional en seguridad alimentaria.",
      "Es tu responsabilidad verificar proporciones, técnicas y tiempos de curado antes de consumir cualquier preparación.",
    ],
    accept: "Acepto y quiero usar Don Marco",
    accepting: "Guardando…",
  },
  en: {
    title: "Important Notice — Food Safety",
    body: [
      "Don Marco is an AI assistant. Its suggestions are for guidance only and may contain errors, including in critical quantities such as curing salt (nitrites/nitrates).",
      "By continuing, you accept that:",
    ],
    bullets: [
      "You use the recipes and instructions at your sole responsibility.",
      "The application and its creators assume no liability for health damages, poisonings, or other harms arising from the use of these recipes.",
      "Don Marco is not a substitute for advice from a food safety professional.",
      "It is your responsibility to verify proportions, techniques, and curing times before consuming any preparation.",
    ],
    accept: "I accept and want to use Don Marco",
    accepting: "Saving…",
  },
};

export const DISCLAIMER_FOOTER = {
  es: "Las sugerencias de Don Marco son orientativas. El uso de estas recetas es bajo tu exclusiva responsabilidad.",
  en: "Don Marco's suggestions are for guidance only. Use of these recipes is at your sole responsibility.",
};

export function DonMarcoDisclaimerContent({
  locale,
  onAccepted,
}: {
  locale: string;
  onAccepted: () => void;
}) {
  const lang = locale === "en" ? "en" : "es";
  const t = TEXT[lang];
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      await acceptDonMarcoDisclaimer();
      onAccepted();
    });
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        padding: "20px",
      }}>
        <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 12px", color: "var(--ink)" }}>
          {t.title}
        </p>
        {t.body.map((line, i) => (
          <p key={i} style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {line}
          </p>
        ))}
        <ul style={{ margin: "0 0 16px", paddingLeft: 18 }}>
          {t.bullets.map((b, i) => (
            <li key={i} style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="btn btn-primary w-full"
          style={{ justifyContent: "center", fontSize: 13 }}
        >
          {isPending ? t.accepting : t.accept}
        </button>
      </div>
    </div>
  );
}
