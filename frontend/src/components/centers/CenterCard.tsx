import { Clock, FlaskConical, Home, MapPin } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Stars from "@/components/ui/Stars";
import { relativeSlot } from "@/lib/format";
import type { CenterCard as Center } from "@/lib/types";

export default function CenterCard({ center: c }: { center: Center }) {
  return (
    <article className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar src={c.logo} name={c.name} size={56} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <Link href={`/center/${c.slug}`}>
            <h3 className="truncate font-bold hover:text-brand-700">{c.name}</h3>
          </Link>
          <p className="text-xs text-brand-700">{c.type_display}{c.is_public_sector ? " · دولتی" : ""}</p>
          <div className="mt-1"><Stars value={c.rating_avg} count={c.review_count} /></div>
        </div>
      </div>
      <p className="flex gap-1.5 text-xs leading-6 text-slate-600"><MapPin className="mt-1 size-3.5 shrink-0" /> <span className="line-clamp-1">{c.city.name}، {c.address}</span></p>
      <div className="flex flex-wrap gap-1.5">
        {c.is_24h && <span className="chip bg-slate-50 text-slate-600 ring-slate-200"><Clock className="size-3" /> شبانه‌روزی</span>}
        {c.online_reception && <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200"><FlaskConical className="size-3" /> پذیرش آنلاین</span>}
        {c.has_home_sampling && <span className="chip bg-amber-50 text-amber-700 ring-amber-200"><Home className="size-3" /> نمونه‌گیری در منزل</span>}
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-dashed border-line pt-3">
        <span className="flex-1 text-xs text-emerald-700">{c.online_reception && c.first_free_slot_at ? `اولین زمان پذیرش: ${relativeSlot(c.first_free_slot_at)}` : ""}</span>
        <Link href={`/center/${c.slug}`} className={c.online_reception ? "btn-primary py-2" : "btn-outline py-2"}>
          {c.online_reception ? "رزرو پذیرش" : "مشاهده"}
        </Link>
      </div>
    </article>
  );
}
