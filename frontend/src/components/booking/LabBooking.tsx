"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { faDigits, faShort, num, toman } from "@/lib/format";
import type { Appointment, CenterDetail, SlotItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import PatientPicker from "./PatientPicker";
import SlotPicker from "./SlotPicker";

export default function LabBooking({ center }: { center: CenterDetail }) {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [insured, setInsured] = useState(false);
  const [home, setHome] = useState(false);
  const [address, setAddress] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotItem | null>(null);
  const [member, setMember] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const tests = useMemo(
    () => center.lab_tests.filter((t) => !filter || t.name.includes(filter) || t.en_name.toLowerCase().includes(filter.toLowerCase())),
    [center.lab_tests, filter],
  );
  const chosen = center.lab_tests.filter((t) => selected.includes(t.test_id));
  const estimate = chosen.reduce((s, t) => s + t.price, 0);
  const maxFasting = Math.max(0, ...chosen.map((t) => t.fasting_hours));
  const payable = center.reception_fee + (home ? center.home_sampling_fee : 0);

  const submit = async () => {
    if (!slot) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("slot", String(slot.id));
    if (member) fd.set("family_member", String(member));
    selected.forEach((id) => fd.append("tests", String(id)));
    if (file) fd.set("prescription", file);
    fd.set("has_insurance_prescription", String(insured));
    fd.set("home_sampling", String(home));
    if (home) fd.set("home_address", address);
    try {
      const appt = await api<Appointment>("/me/appointments/", { method: "POST", body: fd });
      router.push(`/booking/${appt.tracking_code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ثبت پذیرش");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="label">۱. آزمایش‌ها را انتخاب کنید یا نسخه را بارگذاری کنید</span>
        <input className="input mb-2" placeholder="جستجوی آزمایش (مثلاً CBC یا قند)" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
          {tests.map((t) => (
            <label key={t.test_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                className="accent-brand-600"
                checked={selected.includes(t.test_id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, t.test_id] : s.filter((x) => x !== t.test_id)))}
              />
              <span className="flex-1">{t.name} <span className="ltr text-xs text-muted">{t.en_name}</span></span>
              <span className="text-xs text-slate-500">{toman(t.price)}</span>
            </label>
          ))}
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand-300 p-3 text-sm text-brand-700">
          <FileUp className="size-4" />
          {file ? file.name : "بارگذاری تصویر نسخه (اختیاری)"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {file && (
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={insured} onChange={(e) => setInsured(e.target.checked)} /> نسخه بیمه‌ای است</label>
        )}
        {chosen.length > 0 && (
          <p className="mt-2 text-xs text-slate-600">
            برآورد هزینه آزمایش‌ها (آزاد): <b>{toman(estimate)}</b>
            {maxFasting > 0 && <span className="text-amber-700"> · نیاز به {num(maxFasting)} ساعت ناشتایی</span>}
          </p>
        )}
      </div>

      {center.has_home_sampling && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="accent-brand-600" checked={home} onChange={(e) => setHome(e.target.checked)} />
            نمونه‌گیری در منزل ({toman(center.home_sampling_fee)})
          </label>
          {home && <textarea className="input" rows={2} placeholder="آدرس کامل محل نمونه‌گیری" value={address} onChange={(e) => setAddress(e.target.value)} />}
        </div>
      )}

      <div>
        <span className="label">۲. زمان {home ? "نمونه‌گیری" : "مراجعه"}</span>
        <SlotPicker base={`/centers/${center.slug}`} day={day} onDay={(d) => { setDay(d); setSlot(null); }} slot={slot?.id ?? null} onSlot={setSlot} />
      </div>

      {slot && (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm">زمان انتخابی: <b>{faShort(slot.start)} ساعت {faDigits(slot.time)}</b></p>
          {meLoading ? (
            <Spinner className="size-5 text-brand-600" />
          ) : !me ? (
            <button className="btn-primary w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(location.pathname)}`)}>برای ادامه وارد شوید</button>
          ) : (
            <>
              <PatientPicker me={me} value={member} onChange={setMember} />
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                {payable > 0 ? <>مبلغ قابل پرداخت آنلاین: <b>{toman(payable)}</b></> : "رزرو پذیرش رایگان است."} هزینه آزمایش‌ها در محل و طبق تعرفه دریافت می‌شود.
              </p>
              {error && <Alert tone="error">{error}</Alert>}
              <button className="btn-primary w-full py-3" disabled={busy || (!selected.length && !file) || (!me.profile_completed && member === null)} onClick={submit}>
                {busy ? <Spinner className="size-4" /> : "ثبت پذیرش"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
