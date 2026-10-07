import Link from "next/link";
import { BRAND } from "@/lib/config";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`} aria-label={BRAND}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight text-brand-800">{BRAND}</span>
    </Link>
  );
}
