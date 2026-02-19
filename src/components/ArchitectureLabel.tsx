"use client";

import type { StepOwner } from "@/types";

const OWNER_STYLES: Record<StepOwner, { bg: string; text: string; label: string }> = {
  user: { bg: "bg-emerald-100", text: "text-emerald-800", label: "You" },
  agent: { bg: "bg-violet-100", text: "text-violet-800", label: "Anthropic Agent" },
  bitgo: { bg: "bg-sky-100", text: "text-sky-800", label: "BitGo Custody" },
  aave: { bg: "bg-fuchsia-100", text: "text-fuchsia-800", label: "Aave Protocol" },
};

export function ArchitectureLabel({ owner }: { owner: StepOwner }) {
  const style = OWNER_STYLES[owner];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      data-testid={`label-${owner}`}
    >
      {style.label}
    </span>
  );
}
