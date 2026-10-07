"""Generate realistic FAKE doctors, centers, schedules, appointments and reviews for development.

Never run this in production. Names come from Faker(fa_IR); nothing is copied from any real website.
"""
import json
import random
from datetime import datetime, time, timedelta
from functools import lru_cache

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from faker import Faker

from apps.accounts.models import Gender, Role, User
from apps.catalog.models import Degree, Insurance, Specialty
from apps.centers.models import Center, CenterStaff, CenterType
from apps.doctors.models import DoctorProfile, Endorsement, Office, VerificationStatus
from apps.geo.models import City
from apps.lab.models import CenterLabTest, LabTest
from apps.reviews.models import Review
from apps.reviews.services import refresh_center_stats, refresh_doctor_stats
from apps.scheduling.models import Appointment, AppointmentStatus, Slot, WeeklySchedule
from apps.scheduling.services import generate_slots

fake = Faker("fa_IR")

CITY_WEIGHTS = {"tehran": 30, "mashhad": 7, "isfahan": 7, "shiraz": 7, "karaj": 5, "tabriz": 5, "ahvaz": 4, "rasht": 3, "qom": 3}
REVIEW_TEXTS = [
    "برخورد بسیار خوب و حوصله زیاد در توضیح بیماری.", "دقیق معاینه کردند و دارو جواب داد.", "منشی خیلی محترم بود و معطلی کم بود.",
    "از درمان راضی هستم، پیشنهاد می‌کنم.", "کمی معطل شدیم ولی دکتر عالی بودند.", "تشخیص درست و سریع، ممنون از دکتر.",
    "مطب تمیز و مرتب بود.", "وقت کافی برای سؤالات گذاشتند.", "زمان انتظار زیاد بود.", "", "",
]


def mobile(n):
    return f"0912{n:07d}"


class Command(BaseCommand):
    help = "Seed fake data for local development (requires seed_reference first)."

    def add_arguments(self, parser):
        parser.add_argument("--doctors", type=int, default=300)
        parser.add_argument("--centers", type=int, default=120)
        parser.add_argument("--days", type=int, default=14, help="days of future slots to generate")
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, **o):
        if not Specialty.objects.exists():
            raise CommandError("Run `python manage.py seed_reference` first.")
        random.seed(o["seed"])
        Faker.seed(o["seed"])
        self.cities = list(City.objects.all())
        self.city_weights = [CITY_WEIGHTS.get(c.slug, 2 if c.is_popular else 0.2) for c in self.cities]
        self.insurances = list(Insurance.objects.all())
        self.patients = self.make_patients(60)
        self.demo_accounts()
        centers = self.make_centers(o["centers"])
        doctors = self.make_doctors(o["doctors"], centers)
        self.stdout.write("Generating slots...")
        for office in Office.objects.select_related("doctor"):
            generate_slots(office=office, days=o["days"])
        for center in Center.objects.filter(online_reception=True):
            generate_slots(center=center, days=o["days"])
        self.history(doctors, centers)
        self.stdout.write(self.style.SUCCESS(f"Done: {len(doctors)} doctors, {len(centers)} centers."))

    def pick_city(self):
        return random.choices(self.cities, weights=self.city_weights, k=1)[0]

    def make_patients(self, n):
        users = []
        for i in range(n):
            g = random.choice([Gender.MALE, Gender.FEMALE])
            u, _ = User.objects.get_or_create(
                mobile=mobile(5_000_000 + i),
                defaults={
                    "first_name": fake.first_name_male() if g == Gender.MALE else fake.first_name_female(),
                    "last_name": fake.last_name(), "national_code": self.national_code(), "gender": g,
                },
            )
            users.append(u)
        return users

    @staticmethod
    def national_code():
        while True:
            digits = [random.randint(0, 9) for _ in range(9)]
            s = sum(d * (10 - i) for i, d in enumerate(digits)) % 11
            check = s if s < 2 else 11 - s
            code = "".join(map(str, digits)) + str(check)
            if len(set(code)) > 1:
                return code

    def demo_accounts(self):
        """Fixed demo logins for each panel (OTP code is printed in the backend console)."""
        op, _ = User.objects.get_or_create(mobile="09120000000", defaults={"first_name": "اپراتور", "last_name": "سیستم"})
        op.role, op.is_staff = Role.OPERATOR, True
        op.save()
        admin, _ = User.objects.get_or_create(mobile="09120000009", defaults={"first_name": "مدیر", "last_name": "کل"})
        admin.role, admin.is_staff, admin.is_superuser = Role.SUPERADMIN, True, True
        admin.save()
        User.objects.get_or_create(
            mobile="09120000003",
            defaults={"first_name": "سارا", "last_name": "بیمار نمونه", "national_code": "0012345679", "gender": Gender.FEMALE},
        )

    @transaction.atomic
    def make_centers(self, n):
        types = [CenterType.LABORATORY] * 4 + [CenterType.CLINIC] * 3 + [CenterType.HOSPITAL] * 2 + [
            CenterType.IMAGING, CenterType.DARMANGAH, CenterType.PHARMACY,
        ]
        prefixes = {
            CenterType.LABORATORY: ["آزمایشگاه پاتوبیولوژی", "آزمایشگاه تشخیص طبی", "آزمایشگاه"],
            CenterType.CLINIC: ["کلینیک تخصصی", "کلینیک فوق تخصصی", "کلینیک زیبایی"],
            CenterType.HOSPITAL: ["بیمارستان", "بیمارستان تخصصی"],
            CenterType.IMAGING: ["مرکز تصویربرداری", "سونوگرافی و رادیولوژی"],
            CenterType.DARMANGAH: ["درمانگاه شبانه‌روزی", "درمانگاه"],
            CenterType.PHARMACY: ["داروخانه دکتر", "داروخانه شبانه‌روزی"],
        }
        tests = list(LabTest.objects.all())
        specialties = list(Specialty.objects.filter(parent__isnull=True))
        centers = []
        for i in range(n):
            t = random.choice(types)
            city = self.pick_city()
            is_lab = t == CenterType.LABORATORY
            c = Center.objects.create(
                type=t,
                name=f"{random.choice(prefixes[t])} {fake.last_name()}",
                city=city,
                address=f"{city.name}، {fake.street_address()}",
                lat=city.lat, lng=city.lng,
                phone=f"0{random.randint(21, 87)}{random.randint(1000000, 9999999)}",
                description="مرکز ساختگی برای محیط توسعه.",
                working_hours="شنبه تا پنجشنبه ۷ تا ۲۱" if not random.random() < 0.2 else "شبانه‌روزی",
                is_24h=random.random() < 0.2,
                is_public_sector=random.random() < 0.25,
                has_home_sampling=is_lab and random.random() < 0.5,
                online_reception=is_lab or t == CenterType.IMAGING,
                reception_fee=random.choice([0, 0, 20000, 30000]) if is_lab else 0,
                home_sampling_fee=random.choice([150000, 200000, 250000]),
                verification_status=VerificationStatus.APPROVED,
            )
            c.insurances.set(random.sample(self.insurances, k=random.randint(2, 8)))
            if t in (CenterType.CLINIC, CenterType.HOSPITAL):
                c.specialties.set(random.sample(specialties, k=random.randint(3, 10)))
            if c.online_reception:
                factor = random.uniform(0.8, 1.4)
                CenterLabTest.objects.bulk_create(
                    [CenterLabTest(center=c, test=tst, price=int(base_price(tst) * factor / 1000) * 1000) for tst in tests]
                )
                for wd in range(6):  # Saturday..Thursday
                    WeeklySchedule.objects.create(center=c, weekday=wd, start_time=time(7), end_time=time(12), slot_minutes=15, capacity=3, kind="lab")
            centers.append(c)
        # demo center staff account
        staff, _ = User.objects.get_or_create(mobile="09120000002", defaults={"first_name": "مدیر", "last_name": "آزمایشگاه"})
        staff.role = Role.CENTER_STAFF
        staff.save()
        lab = next((c for c in centers if c.online_reception), None)
        if lab:
            CenterStaff.objects.get_or_create(center=lab, user=staff)
        return centers

    @transaction.atomic
    def make_doctors(self, n, centers):
        degrees = {d.slug: d for d in Degree.objects.all()}
        top = list(Specialty.objects.filter(parent__isnull=True).prefetch_related("children"))
        weights = [6 if s.is_popular else 1 for s in top]
        clinic_like = [c for c in centers if c.type in (CenterType.CLINIC, CenterType.HOSPITAL, CenterType.DARMANGAH)]
        doctors = []
        used_council = set(DoctorProfile.objects.values_list("medical_council_no", flat=True))
        for i in range(n):
            spec = random.choices(top, weights=weights, k=1)[0]
            children = list(spec.children.all())
            sub = random.choice(children) if children and random.random() < 0.35 else None
            gender = random.choice([Gender.MALE, Gender.FEMALE])
            first = fake.first_name_male() if gender == Gender.MALE else fake.first_name_female()
            user, _ = User.objects.get_or_create(mobile=mobile(1_000_000 + i), defaults={"first_name": first, "last_name": fake.last_name()})
            if hasattr(user, "doctor_profile"):
                doctors.append(user.doctor_profile)
                continue
            user.role, user.gender = Role.DOCTOR, gender
            user.save()
            council = str(random.randint(10000, 299999))
            while council in used_council:
                council = str(random.randint(10000, 299999))
            used_council.add(council)
            if spec.slug == "general-practitioner":
                degree = degrees["gp"]
            elif spec.slug == "dentistry":
                degree = degrees["dentist"]
            elif spec.slug in ("psychology", "nutrition", "physiotherapy", "midwifery", "optometry", "audiology", "speech-therapy", "occupational-therapy"):
                degree = degrees[random.choice(["phd", "msc", "bsc"])]
            elif sub:
                degree = degrees["fellowship"] if "فلوشیپ" in sub.title else degrees["subspecialist"]
            elif "فوق تخصص" in spec.title:
                degree = degrees["subspecialist"]
            else:
                degree = degrees["specialist"]
            doc = DoctorProfile.objects.create(
                user=user, first_name=user.first_name, last_name=user.last_name, gender=gender,
                medical_council_no=council, degree=degree, primary_specialty=sub or spec,
                bio=f"{(sub or spec).title} با سابقه طبابت در {self.pick_city().name}. (داده ساختگی محیط توسعه)",
                experience_start_year=random.randint(1375, 1400),
                offers_phone=random.random() < 0.4, offers_text=random.random() < 0.35, offers_video=random.random() < 0.15,
                offers_instant=random.random() < 0.1,
                verification_status=VerificationStatus.APPROVED,
            )
            doc.specialties.set([spec] + ([sub] if sub else []))
            doc.save()  # rebuild search_text with specialties
            for k in range(1 if random.random() < 0.75 else 2):
                center = random.choice(clinic_like) if clinic_like and random.random() < 0.25 else None
                city = center.city if center else self.pick_city()
                office = Office.objects.create(
                    doctor=doc, center=center, title=center.name if center else "مطب",
                    city=city, address=center.address if center else f"{city.name}، {fake.street_address()}",
                    lat=city.lat, lng=city.lng, phone=f"0{random.randint(21, 87)}{random.randint(1000000, 9999999)}",
                    visit_fee=random.choice([250, 350, 450, 600, 800, 1200]) * 1000,
                    booking_fee=random.choice([0, 0, 25000, 35000, 50000]),
                    booking_enabled=random.random() < 0.9,
                )
                office.insurances.set(random.sample(self.insurances, k=random.randint(0, 6)))
                days = random.sample(range(6), k=random.randint(3, 6))
                start_h = random.choice([9, 10, 15, 16, 17])
                for wd in days:
                    WeeklySchedule.objects.create(
                        office=office, weekday=wd, start_time=time(start_h), end_time=time(start_h + random.choice([3, 4])),
                        slot_minutes=random.choice([10, 15, 20, 30]), capacity=1,
                    )
            doctors.append(doc)
        # colleague endorsements
        for doc in random.sample(doctors, k=min(len(doctors), n // 2)):
            for other in random.sample(doctors, k=min(len(doctors), random.randint(1, 8))):
                if other != doc:
                    Endorsement.objects.get_or_create(from_doctor=other, to_doctor=doc)
        # demo doctor login
        demo = doctors[0]
        if demo.user.mobile != "09120000001" and not User.objects.filter(mobile="09120000001").exists():
            demo.user.mobile = "09120000001"
            demo.user.save(update_fields=["mobile"])
        return doctors

    @transaction.atomic
    def history(self, doctors, centers):
        """Past attended appointments with reviews, so stats/ratings look realistic."""
        self.stdout.write("Generating appointment history and reviews...")
        tz = timezone.get_current_timezone()
        now = timezone.now()
        seq = Appointment.objects.count()
        for doc in doctors:
            office = doc.offices.first()
            if not office:
                continue
            for _ in range(random.choices([0, 3, 8, 20, 40], weights=[2, 3, 3, 2, 1])[0]):
                seq += 1
                day = (now - timedelta(days=random.randint(2, 300))).date()
                start = datetime.combine(day, time(random.randint(9, 19), random.choice([0, 15, 30, 45])), tzinfo=tz)
                slot, _ = Slot.objects.get_or_create(office=office, start=start, kind="in_person", defaults={"end": start + timedelta(minutes=15), "booked_count": 1})
                patient = random.choice(self.patients)
                appt = Appointment.objects.create(
                    tracking_code=f"9{seq:07d}", status=AppointmentStatus.ATTENDED, slot=slot, doctor=doc, office=office,
                    user=patient, patient_name=patient.full_name, patient_national_code=patient.national_code,
                    patient_mobile=patient.mobile, start=start, price=office.booking_fee, paid_amount=office.booking_fee,
                )
                if random.random() < 0.7:
                    rating = random.choices([5, 4, 3, 2, 1], weights=[55, 25, 10, 5, 5])[0]
                    Review.objects.create(
                        appointment=appt, user=patient, doctor=doc, rating=rating, recommends=rating >= 4,
                        wait_minutes=random.choice([10, 10, 25, 45, 75]), text=random.choice(REVIEW_TEXTS),
                        show_name=random.random() < 0.4, status=Review.Status.APPROVED,
                    )
            DoctorProfile.objects.filter(pk=doc.pk).update(
                successful_appointments=Appointment.objects.filter(doctor=doc, status="attended").count()
            )
            doc.refresh_from_db()
            refresh_doctor_stats(doc)
        for c in centers:
            refresh_center_stats(c)



@lru_cache(maxsize=1)
def _base_prices():
    data = json.loads((settings.BASE_DIR / "fixtures" / "catalog.json").read_text(encoding="utf-8"))
    return {t["slug"]: t["base_price"] for t in data["lab_tests"]}


def base_price(test):
    return _base_prices().get(test.slug, 100000)
