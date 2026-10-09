/**
 * Captures the documentation screenshots in docs/images/ from a running local stack
 * (backend with seed data on :8000, frontend on :3000, dev OTP shown on screen).
 *   node scripts/screenshots.mjs
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/images");
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

async function page(width = 1440, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, permissions: ["camera", "microphone"] });
  return ctx.newPage();
}
async function shot(p, name, full = false) {
  await p.mouse.move(5, 5);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("saved", name);
}
async function login(p, mobile, next) {
  await p.goto(`${BASE}/login?next=${encodeURIComponent(next)}`);
  await p.getByLabel("شماره موبایل").fill(mobile);
  await p.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await p.getByRole("button", { name: "ورود", exact: true }).first().click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
}

const pub = await page();
await pub.goto(BASE);
await shot(pub, "home");
await shot(pub, "home-full", true);
await pub.getByRole("navigation", { name: "منوی اصلی" }).getByRole("link", { name: "نوبت‌دهی مطب" }).hover();
await pub.waitForTimeout(400);
await pub.screenshot({ path: `${OUT}/mega-menu.png` });
await pub.goto(`${BASE}/doctors/city/tehran`);
await shot(pub, "doctor-list");
await pub.goto(`${BASE}/doctors/telehealth`);
await shot(pub, "telehealth");
const doc = await pub.locator('article a[href^="/doctor/"]').first().getAttribute("href");
await pub.goto(BASE + doc);
await shot(pub, "doctor-profile");
await pub.goto(`${BASE}/centers/type/laboratory?online_reception=true`);
await shot(pub, "labs");
await pub.goto(`${BASE}/offer`);
await shot(pub, "clinic-offers");
await pub.goto(`${BASE}/mag/online-consultation-when-to-use`);
await shot(pub, "magazine-article");
await pub.goto(`${BASE}/login`);
await shot(pub, "login");

const mobile = await page(390, 844);
await mobile.goto(BASE);
await shot(mobile, "mobile-home");

const doctor = await page();
await login(doctor, "09120000001", "/doctor-panel");
await shot(doctor, "doctor-panel");
await doctor.goto(`${BASE}/doctor-panel/consult`);
await shot(doctor, "doctor-consult-inbox");
await doctor.getByRole("button", { name: /اعلان‌ها/ }).click();
await shot(doctor, "notifications");

const op = await page();
await login(op, "09120000000", "/ops");
await shot(op, "ops-dashboard");

const patient = await page();
await login(patient, "09120000003", "/panel/appointments");
await shot(patient, "patient-panel");

await browser.close();
