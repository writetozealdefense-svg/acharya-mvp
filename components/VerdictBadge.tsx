"use client";

import { CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import type { Verdict } from "@/lib/types";

const STYLE: Record<
  Verdict,
  { bg: string; fg: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  Verified: {
    bg: "bg-emerald-100",
    fg: "text-emerald-800",
    label: "Verified",
    Icon: CheckCircle2,
  },
  "Likely correct": {
    bg: "bg-amber-100",
    fg: "text-amber-800",
    label: "Likely correct",
    Icon: AlertTriangle,
  },
  "Needs human review": {
    bg: "bg-red-100",
    fg: "text-red-700",
    label: "Needs review",
    Icon: ShieldAlert,
  },
  Pending: {
    bg: "bg-neutral-200",
    fg: "text-neutral-600",
    label: "Verifying",
    Icon: Loader2,
  },
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLE[verdict];
  const spinning = verdict === "Pending";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.fg}`}
      title={`Verdict: ${verdict}`}
    >
      <s.Icon size={11} className={spinning ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}
