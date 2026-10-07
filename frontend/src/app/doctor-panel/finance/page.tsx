"use client";

import FinancePanel from "@/components/panel/FinancePanel";
import { PageTitle } from "@/components/panel/PanelShell";

export default function Page() {
  return (
    <>
      <PageTitle>امور مالی</PageTitle>
      <FinancePanel base="/doctor-panel" />
    </>
  );
}
