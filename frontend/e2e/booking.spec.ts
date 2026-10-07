import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end flow against a locally running stack (Django on :8000 with seed data, Next on :3000).
 * The OTP is read from the dev SMS log through manage.py — only possible with the console SMS backend.
 */
const BACKEND = path.resolve(__dirname, "../../backend");
const PYTHON = process.env.E2E_PYTHON || path.join(BACKEND, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

function lastOtp(mobile: string): string {
  const out = execFileSync(
    PYTHON,
    ["manage.py", "shell", "-c", `from apps.notifications.models import SmsLog; print(SmsLog.objects.filter(mobile='${mobile}', kind='otp').latest('created_at').text)`],
    { cwd: BACKEND, encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
  return out.match(/(\d{5})/)![1];
}

async function login(page: Page, mobile: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("شماره موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await expect(page.getByLabel("کد تأیید")).toBeVisible();
  await page.getByLabel("کد تأیید").fill(lastOtp(mobile));
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("patient searches, books, pays and sees the appointment", async ({ page }) => {
  await login(page, "09120000003", "/doctors/city/tehran?has_free_slot=true");
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
  await login(page, "09125000001", "/centers/type/laboratory?online_reception=true");
  await page.getByRole("link", { name: "رزرو پذیرش" }).first().click();
  await page.locator("aside input[type=checkbox]").first().check();
  await page.locator("aside [data-slot]").first().click();
  await page.getByRole("button", { name: "ثبت پذیرش" }).click();
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
