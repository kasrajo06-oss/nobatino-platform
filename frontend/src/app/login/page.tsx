import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "ورود / ثبت‌نام", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
