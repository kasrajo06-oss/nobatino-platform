import { expect, test, type Page } from "@playwright/test";

/** End-to-end flows against a locally running stack (Django on :8000 with seed data, Next on :3000, DEBUG OTP). */
/** A random seeded patient (09125000000..09125000059) so repeated runs don't hit the one-booking-per-day rule. */
const randomPatient = () => `091250000${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`;

async function login(page: Page, mobile: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("شماره موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  // dev/demo mode shows the OTP on the page (no SMS provider configured)
  await page.getByRole("button", { name: "ورود", exact: true }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("patient searches, books, pays and sees the appointment", async ({ page }) => {
  await login(page, randomPatient(), "/doctors/city/tehran?has_free_slot=true");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("تهران");

  await page.getByRole("link", { name: "نوبت بگیرید" }).first().click();
  await expect(page.locator("#booking")).toBeVisible();
  const booking = page.locator("#booking");
  // pick the first available time
  await booking.locator("[data-slot]").first().click();
  await booking.getByRole("button", { name: "ثبت نوبت" }).click();

  await page.waitForURL(/\/booking\//);
  const title = page.getByRole("heading", { level: 1 });
  if ((await title.textContent())?.includes("تکمیل رزرو")) {
    await page.getByRole("button", { name: /پرداخت و ثبت نهایی|ثبت نهایی با کیف پول/ }).click();
    if (page.url().includes("fake-gateway")) await page.getByRole("link", { name: "پرداخت موفق" }).click();
    await page.waitForURL(/\/payment\/result/);
    await expect(page.getByRole("heading", { name: "پرداخت موفق بود" })).toBeVisible();
  } else {
    await expect(page.getByText("نوبت شما با موفقیت ثبت شد")).toBeVisible();
  }

  await page.goto("/panel/appointments");
  await expect(page.getByText("قطعی").first()).toBeVisible();
});

test("doctor panel loads dashboard and schedule", async ({ page }) => {
  await login(page, "09120000001", "/doctor-panel");
  await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();
  await page.getByRole("link", { name: "برنامه کاری" }).click();
  await expect(page.getByText("ساعات کاری هفتگی")).toBeVisible();
});

test("operator panel shows dashboard and verification queue", async ({ page }) => {
  await login(page, "09120000000", "/ops");
  await expect(page.getByRole("heading", { name: "داشبورد عملیات" })).toBeVisible();
  await page.getByRole("link", { name: "احراز پزشکان و مراکز" }).click();
  await expect(page.getByRole("heading", { name: "احراز پزشکان و مراکز" })).toBeVisible();
});

test("lab reception booking from a center page", async ({ page }) => {
  await login(page, randomPatient(), "/centers/type/laboratory?online_reception=true");
  await page.getByRole("link", { name: "رزرو پذیرش" }).first().click();
  await page.locator("aside input[type=checkbox]").first().check();
  // one active booking per patient per day at a center: if this day is taken by an earlier run, try the next day
  const days = page.locator("aside [data-day]:not([disabled])");
  for (let i = 0; i < 5 && !page.url().includes("/booking/"); i++) {
    await days.nth(i).click();
    await page.locator("aside [data-slot]").first().click();
    await page.getByRole("button", { name: "ثبت پذیرش" }).click();
    await Promise.race([page.waitForURL(/\/booking\//, { timeout: 5000 }).catch(() => undefined), page.getByText("در همین روز نوبت فعال").waitFor({ timeout: 5000 }).catch(() => undefined)]);
  }
  await page.waitForURL(/\/booking\//);
  await expect(page.getByText("کد پیگیری")).toBeVisible();
});

test("home page is usable at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});


test("header mega menu opens on hover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "منوی اصلی" }).getByRole("link", { name: "نوبت‌دهی مطب" }).hover();
  await expect(page.getByText("تخصص‌های پرمراجعه").first()).toBeVisible();
  await page.getByRole("navigation", { name: "منوی اصلی" }).getByRole("link", { name: "مشاوره آنلاین" }).hover();
  await expect(page.getByText("انواع مشاوره آنلاین")).toBeVisible();
});

/** The seeded demo doctor (09120000001) offers text consultation at exactly 150,000 toman. */
async function demoDoctorUrl(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const list = await (await fetch("/api/doctors/?appointment_type=video&page_size=100")).json();
    for (const d of list.results) {
      if (d.consult_services.some((s: { kind: string; price: number }) => s.kind === "text" && s.price === 150000)) return `/doctor/${d.slug}/${d.short_id}`;
    }
    throw new Error("demo doctor not found");
  });
}

test("online text consultation between patient and doctor", async ({ browser }) => {
  const patient = await (await browser.newContext()).newPage();
  await login(patient, randomPatient(), "/doctors/telehealth");
  await expect(patient.getByRole("heading", { level: 1 })).toContainText("مشاوره آنلاین");
  await patient.goto(await demoDoctorUrl(patient));

  const booking = patient.locator("#booking");
  await booking.getByRole("button", { name: /متنی/ }).click();
  const instant = booking.getByText(/درخواست فوری/);
  if (await instant.isVisible()) await booking.locator("input[type=checkbox]").first().uncheck();
  await patient.getByLabel("شرح حال و سؤال شما").fill("از دیروز سردرد و تب خفیف دارم، چه دارویی مصرف کنم؟");
  await patient.getByRole("button", { name: /ادامه و پرداخت/ }).click();
  await patient.waitForURL(/\/booking\//);
  const code = patient.url().split("/booking/")[1];

  await patient.getByRole("button", { name: /پرداخت و ثبت نهایی|ثبت نهایی با کیف پول/ }).click();
  await patient.waitForURL(/fake-gateway|payment\/result/);
  if (patient.url().includes("fake-gateway")) await patient.getByRole("link", { name: "پرداخت موفق" }).click();
  await patient.getByRole("link", { name: "ورود به اتاق مشاوره" }).click();
  await expect(patient.getByText("از دیروز سردرد")).toBeVisible();

  const doctor = await (await browser.newContext()).newPage();
  await login(doctor, "09120000001", `/consult/${code}`);
  await doctor.getByPlaceholder(/پاسخ شما/).fill("سلام، استامینوفن هر ۶ ساعت و مایعات فراوان مصرف کنید.");
  await doctor.getByRole("button", { name: "ارسال" }).click();
  await expect(patient.getByText("استامینوفن هر ۶ ساعت")).toBeVisible({ timeout: 10_000 });

  await doctor.getByRole("button", { name: "پایان مشاوره و ثبت توصیه" }).click();
  await doctor.getByPlaceholder(/جمع‌بندی/).fill("سرماخوردگی ویروسی؛ استراحت و مایعات.");
  await doctor.getByRole("button", { name: "ثبت و پایان مشاوره" }).click();
  await expect(patient.getByText("سرماخوردگی ویروسی")).toBeVisible({ timeout: 20_000 });
});

test("video consultation: doctor calls, patient answers, media flows both ways", async ({ browser }) => {
  const patientCtx = await browser.newContext({ permissions: ["camera", "microphone"] });
  const patient = await patientCtx.newPage();
  await login(patient, randomPatient(), "/");
  const doctorUrl = await demoDoctorUrl(patient);
  const shortId = doctorUrl.split("/").pop()!;

  // book + pay a video consultation through the API (the UI flow is covered by the text test)
  const code = await patient.evaluate(async (sid) => {
    const days = (await (await fetch(`/api/doctors/${sid}/online-availability/`)).json()).days;
    for (const d of days.filter((x: { free: number }) => x.free)) {
      const slots = (await (await fetch(`/api/doctors/${sid}/online-slots/?date=${d.date}`)).json()).slots;
      for (const s of slots) {
        const r = await fetch("/api/me/consultations/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor: sid, kind: "video", slot: s.id, complaint: "مشاوره تصویری برای بررسی ضایعه پوستی" }),
        });
        if (r.ok) return (await r.json()).appointment.tracking_code as string;
      }
    }
    throw new Error("no bookable online slot");
  }, shortId);
  const start = await patient.evaluate(async (c) => (await fetch("/api/payments/start/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracking_code: c, use_wallet: false }),
  })).json(), code);
  const callback = new URL(start.redirect_url).searchParams.get("callback")!;
  const authority = new URL(start.redirect_url).searchParams.get("authority")!;
  await patient.goto(`${callback}&Authority=${authority}&Status=OK`);
  await patient.goto(`/consult/${code}`);

  const doctor = await (await browser.newContext({ permissions: ["camera", "microphone"] })).newPage();
  await login(doctor, "09120000001", `/consult/${code}`);
  await doctor.getByRole("button", { name: "شروع تماس" }).click();

  await patient.getByRole("button", { name: "پاسخ" }).click({ timeout: 15_000 });
  for (const page of [patient, doctor]) {
    await expect(page.locator("[data-call-state]")).toHaveAttribute("data-call-state", "connected", { timeout: 20_000 });
    // remote video actually receives frames from the other side's fake camera
    await expect.poll(() => page.getByTestId("remote-video").evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 10_000 }).toBeGreaterThan(0);
  }
  await doctor.getByRole("button", { name: "قطع تماس" }).click();
  await expect(patient.locator("[data-call-state]")).toHaveAttribute("data-call-state", "ended", { timeout: 10_000 });
});

test("health magazine: list, article page with related doctors", async ({ page }) => {
  await page.goto("/mag");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مجله سلامت");
  await page.getByRole("link", { name: /ناشتایی قبل از آزمایش خون/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ناشتایی");
  await expect(page.getByRole("heading", { name: "چرا ناشتایی مهم است؟" })).toBeVisible();
  await expect(page.getByText("جایگزین معاینه و تشخیص پزشک نیست")).toBeVisible();
});

test("clinic package: buy with gateway, get voucher, doctor redeems it", async ({ browser }) => {
  const patient = await (await browser.newContext()).newPage();
  await login(patient, randomPatient(), "/offer");
  // the demo doctor (09120000001) sells a package in the seed data
  const shortId = (await demoDoctorUrl(patient)).split("/").pop()!;
  const slug = await patient.evaluate(async (sid) => (await (await fetch(`/api/offers/?doctor=${sid}`)).json()).results[0].slug as string, shortId);
  await patient.goto(`/offer/${slug}`);
  await patient.getByRole("button", { name: "خرید آنلاین" }).click();
  await patient.waitForURL(/\/orders\//);
  if (await patient.getByText("استفاده از کیف پول").isVisible()) await patient.locator("input[type=checkbox]").uncheck();
  await patient.getByRole("button", { name: "پرداخت" }).click();
  await patient.waitForURL(/fake-gateway/);
  await patient.getByRole("link", { name: "پرداخت موفق" }).click();
  await patient.getByRole("link", { name: "مشاهده کد استفاده" }).click();
  const voucher = (await patient.locator("p.ltr").first().textContent())!.trim();
  expect(voucher).toMatch(/^[A-Z0-9]{8}$/);

  const doctor = await (await browser.newContext()).newPage();
  await login(doctor, "09120000001", "/doctor-panel/packages");
  await doctor.getByLabel("کد استفاده").fill(voucher);
  await doctor.getByRole("button", { name: "بررسی و ثبت استفاده" }).click();
  await expect(doctor.getByText("کد معتبر است و ثبت شد")).toBeVisible();
  await doctor.getByLabel("کد استفاده").fill(voucher);
  await doctor.getByRole("button", { name: "بررسی و ثبت استفاده" }).click();
  await expect(doctor.getByText("این کد قبلاً استفاده شده است")).toBeVisible();

  await patient.goto("/panel/packages");
  await expect(patient.getByText("استفاده شده").first()).toBeVisible();
});
