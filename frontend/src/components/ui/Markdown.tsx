import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Small, safe Markdown renderer (no raw HTML): ## / ### headings, paragraphs, - and 1. lists,
 * > quotes, **bold** and [links](url). Enough for articles and CMS pages.
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={i++} className="font-bold text-slate-900">{m[1]}</strong>);
    else {
      const href = m[3];
      const safe = href.startsWith("/") || /^https?:\/\//.test(href);
      out.push(
        safe ? (
          href.startsWith("/") ? <Link key={i++} href={href} className="text-brand-700 underline underline-offset-4">{m[2]}</Link>
            : <a key={i++} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline underline-offset-4">{m[2]}</a>
        ) : m[2],
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function headings(md: string) {
  return md.split("\n").filter((l) => l.startsWith("## ")).map((l, i) => ({ id: `h-${i}`, text: l.slice(3).trim() }));
}

export default function Markdown({ source, className = "" }: { source: string; className?: string }) {
  let h2 = 0;
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={`space-y-5 leading-9 text-slate-700 ${className}`}>
      {blocks.map((raw, bi) => {
        const block = raw.trim();
        if (!block) return null;
        if (block.startsWith("### ")) return <h3 key={bi} className="pt-2 text-lg font-extrabold text-slate-900">{inline(block.slice(4))}</h3>;
        if (block.startsWith("## ")) return <h2 key={bi} id={`h-${h2++}`} className="scroll-mt-24 pt-4 text-xl font-black text-slate-900 md:text-2xl">{inline(block.slice(3))}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("> ")))
          return <blockquote key={bi} className="rounded-2xl border-r-4 border-brand-500 bg-brand-50 px-5 py-4 text-brand-900">{inline(lines.map((l) => l.slice(2)).join(" "))}</blockquote>;
        if (lines.every((l) => /^[-*] /.test(l)))
          return <ul key={bi} className="list-disc space-y-2 ps-6 marker:text-brand-500">{lines.map((l, li) => <li key={li}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => /^\d+[.)] /.test(l)))
          return <ol key={bi} className="list-decimal space-y-2 ps-6 marker:font-bold marker:text-brand-600">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\d+[.)] /, ""))}</li>)}</ol>;
        return <p key={bi}>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
