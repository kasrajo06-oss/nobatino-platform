"use client";

import { PageTitle } from "@/components/panel/PanelShell";
import ProviderPackages from "@/components/panel/ProviderPackages";

export default function Page() {
  return (
    <>
      <PageTitle>پکیج‌های خدمات</PageTitle>
      <ProviderPackages base="/center-panel/packages" />
    </>
  );
}
