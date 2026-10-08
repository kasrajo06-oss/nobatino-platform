"use client";

import { PageTitle } from "@/components/panel/PanelShell";
import ScheduleEditor from "@/components/panel/ScheduleEditor";

export default function Page() {
  return (
    <>
      <PageTitle>برنامه پذیرش</PageTitle>
      <ScheduleEditor schedulesPath="/center-panel/schedules" exceptionsPath="/center-panel/exceptions" />
    </>
  );
}
