"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, post } from "@/lib/api";
import type { PackageOrder } from "@/lib/offers";
import { useMe } from "@/lib/use-me";

export default function BuyOffer({ slug, soldOut }: { slug: string; soldOut: boolean }) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const buy = async () => {
    if (!me) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    setBusy(true);
    setError("");
    try {
      const order = await post<PackageOrder>("/me/package-orders/", { package: slug });
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <button className="btn-primary w-full py-3.5 text-base" onClick={buy} disabled={busy || soldOut || isLoading}>
        {busy ? <Spinner className="size-4" /> : soldOut ? "ظرفیت تکمیل شد" : "خرید آنلاین"}
      </button>
    </div>
  );
}
