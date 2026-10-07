"use client";

import DayAppointments from "@/components/panel/DayAppointments";
import { PageTitle } from "@/components/panel/PanelShell";

export default function Page() {
  return (
    <>
      <PageTitle>پذیرش‌های آنلاین</PageTitle>
      <DayAppointments base="/center-panel/receptions" lab />
    </>
  );
}
