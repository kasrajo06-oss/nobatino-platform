import type { Metadata } from "next";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/ui/JsonLd";
import { serverGet } from "@/lib/server-api";

export const metadata: Metadata = { title: "سؤالات متداول" };
// Rendered per request (data is still cached per fetch) so builds don't need a running API.
export const dynamic = "force-dynamic";

type Faq = { id: number; category: string; question: string; answer: string };

export default async function FaqPage() {
  const faqs = await serverGet<Faq[]>("/faqs/", { revalidate: 3600 });
  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: "سؤالات متداول" }]} />
      <h1 className="mt-3 mb-5 text-2xl font-extrabold">سؤالات متداول</h1>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.id} className="card group p-4">
            <summary className="cursor-pointer list-none font-semibold text-slate-800">{f.question}</summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{f.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
        }}
      />
    </div>
  );
}
