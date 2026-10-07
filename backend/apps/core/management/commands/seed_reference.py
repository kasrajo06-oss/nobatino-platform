"""Load public reference data (provinces/cities, specialties, degrees, insurances, conditions, lab tests, CMS)."""
import json

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Condition, Degree, Insurance, Specialty
from apps.cms.models import Faq, Page
from apps.geo.models import City, Province
from apps.lab.models import LabTest

FIXTURES = settings.BASE_DIR / "fixtures"


def load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class Command(BaseCommand):
    help = "Load reference data. Safe to run repeatedly (upserts by slug)."

    @transaction.atomic
    def handle(self, *args, **opts):
        self.geo()
        self.specialties()
        self.catalog()
        self.cms()
        self.stdout.write(self.style.SUCCESS("Reference data loaded."))

    def geo(self):
        data = load("geo.json")
        order = {slug: i for i, slug in enumerate(data["popular_order"])}
        n = 0
        for p in data["provinces"]:
            province, _ = Province.objects.update_or_create(slug=p["slug"], defaults={"name": p["name"]})
            for name, slug, lat, lng in p["cities"]:
                City.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "province": province, "name": name, "lat": lat, "lng": lng,
                        "is_popular": slug in order, "order": order.get(slug, 1000),
                    },
                )
                n += 1
        self.stdout.write(f"  {Province.objects.count()} provinces, {n} cities")

    def specialties(self):
        data = load("specialties.json")
        for i, d in enumerate(data["degrees"]):
            Degree.objects.update_or_create(slug=d["slug"], defaults={"name": d["name"], "order": i})
        for i, s in enumerate(data["specialties"]):
            parent, _ = Specialty.objects.update_or_create(
                slug=s["slug"],
                defaults={"name": s["name"], "title": s["title"], "icon": s.get("icon", ""), "is_popular": s["popular"], "order": i, "parent": None},
            )
            for j, c in enumerate(s.get("children", [])):
                Specialty.objects.update_or_create(
                    slug=c["slug"], defaults={"name": c["name"], "title": c["title"], "parent": parent, "order": j}
                )
        self.stdout.write(f"  {Specialty.objects.count()} specialties, {Degree.objects.count()} degrees")

    def catalog(self):
        data = load("catalog.json")
        for i, ins in enumerate(data["insurances"]):
            Insurance.objects.update_or_create(slug=ins["slug"], defaults={"name": ins["name"], "kind": ins["kind"], "order": i})
        for c in data["conditions"]:
            cond, _ = Condition.objects.update_or_create(
                slug=c["slug"], defaults={"name": c["name"], "synonyms": c["synonyms"], "is_popular": c["popular"]}
            )
            cond.specialties.set(Specialty.objects.filter(slug__in=c["specialties"]))
        for t in data["lab_tests"]:
            prep = f"{t['fasting_hours']} ساعت ناشتایی لازم است." if t["fasting_hours"] else "نیاز به ناشتایی ندارد."
            LabTest.objects.update_or_create(
                slug=t["slug"],
                defaults={"name": t["name"], "en_name": t["en_name"], "category": t["category"], "fasting_hours": t["fasting_hours"], "preparation": prep},
            )
        self.stdout.write(
            f"  {Insurance.objects.count()} insurances, {Condition.objects.count()} conditions, {LabTest.objects.count()} lab tests"
        )

    def cms(self):
        brand = settings.BRAND_NAME
        pages = {
            "about": ("درباره ما", f"{brand} سامانه نوبت‌دهی اینترنتی پزشکان، مراکز درمانی و آزمایشگاه‌هاست. هدف ما دسترسی سریع، شفاف و بدون صف به خدمات درمانی است."),
            "terms": ("قوانین و مقررات", "## شرایط استفاده\n\n- مسئولیت صحت اطلاعات بیمار با کاربر است.\n- لغو نوبت تا ۲۴ ساعت قبل از زمان نوبت با استرداد کامل وجه به کیف پول انجام می‌شود.\n- لغو نوبت توسط پزشک یا مرکز درمانی همواره با استرداد کامل همراه است.\n- هزینه ویزیت در مطب و طبق تعرفه پزشک دریافت می‌شود؛ مبلغ پرداختی آنلاین بابت رزرو نوبت است."),
            "privacy": ("حریم خصوصی", "اطلاعات شخصی و پزشکی شما فقط برای ارائه خدمت به پزشک یا مرکز انتخابی ارسال می‌شود و بدون رضایت شما در اختیار شخص ثالث قرار نمی‌گیرد."),
            "contact": ("تماس با ما", "برای پشتیبانی از طریق بخش «پشتیبانی» در پنل کاربری یا شماره پشتیبانی درج‌شده در پایین صفحه با ما در تماس باشید."),
        }
        for slug, (title, body) in pages.items():
            Page.objects.update_or_create(slug=slug, defaults={"title": title, "body": body})
        faqs = [
            ("booking", "چگونه نوبت بگیرم؟", "پزشک یا مرکز موردنظر را جستجو کنید، روز و ساعت خالی را انتخاب کنید، اطلاعات بیمار را وارد و در صورت نیاز هزینه رزرو را پرداخت کنید. کد پیگیری پیامک می‌شود."),
            ("booking", "آیا می‌توانم برای اعضای خانواده نوبت بگیرم؟", "بله. در بخش «اعضای خانواده» پنل کاربری، اطلاعات آن‌ها را اضافه کنید و هنگام رزرو انتخابشان کنید."),
            ("booking", "چطور نوبتم را لغو کنم؟", "از بخش «نوبت‌های من» گزینه لغو را بزنید. اگر بیش از ۲۴ ساعت به نوبت مانده باشد، وجه به کیف پول شما برمی‌گردد."),
            ("payment", "وجه استرداد شده کجا می‌رود؟", "به کیف پول شما واریز می‌شود و می‌توانید برای نوبت‌های بعدی از آن استفاده کنید."),
            ("payment", "هزینه ویزیت را کجا پرداخت کنم؟", "مبلغ آنلاین فقط بابت رزرو نوبت است؛ هزینه ویزیت در مطب پرداخت می‌شود مگر خلاف آن در صفحه پزشک ذکر شده باشد."),
            ("lab", "پذیرش آنلاین آزمایشگاه چگونه است؟", "آزمایشگاه را انتخاب کنید، آزمایش‌ها یا تصویر نسخه را ثبت و زمان مراجعه یا نمونه‌گیری در منزل را رزرو کنید. جواب آزمایش در پنل شما بارگذاری می‌شود."),
            ("doctor", "چطور به عنوان پزشک ثبت‌نام کنم؟", "وارد حساب شوید، از منوی «ثبت‌نام پزشکان» اطلاعات و مدارک (کارت نظام پزشکی) را ثبت کنید. پس از تأیید اپراتور، پروفایل شما در سایت نمایش داده می‌شود."),
        ]
        for i, (cat, q, a) in enumerate(faqs):
            Faq.objects.update_or_create(question=q, defaults={"category": cat, "answer": a, "order": i})
