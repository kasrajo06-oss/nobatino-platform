"use client";

import DayAppointments from "@/components/panel/DayAppointments";
import { PageTitle } from "@/components/panel/PanelShell";

export default function Page() {
  return (
    <>
      <PageTitle>نوبت‌ها</PageTitle>
      <DayAppointments base="/doctor-panel/appointments" />
    </>
  );
}
