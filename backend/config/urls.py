from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from apps.accounts import views as accounts
from apps.catalog import views as catalog
from apps.centers import panel as center_panel
from apps.centers import views as centers
from apps.cms import views as cms
from apps.consult import views as consult
from apps.core import search
from apps.core.storage import private_media_view
from apps.doctors import panel as doctor_panel
from apps.doctors import views as doctors
from apps.geo import views as geo
from apps.lab import views as lab
from apps.ops import views as ops
from apps.payments import views as payments
from apps.reviews import views as reviews
from apps.scheduling import views as scheduling


class Router(DefaultRouter):
    """Accept URLs with or without the trailing slash (Next.js rewrites strip it)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = "/?"


def p(route, view, name=None):
    return re_path(rf"^{route}/?$", view, name=name)


public = Router()
public.register("provinces", geo.ProvinceViewSet, basename="province")
public.register("cities", geo.CityViewSet, basename="city")
public.register("specialties", catalog.SpecialtyViewSet, basename="specialty")
public.register("degrees", catalog.DegreeViewSet, basename="degree")
public.register("conditions", catalog.ConditionViewSet, basename="condition")
public.register("insurances", catalog.InsuranceViewSet, basename="insurance")
public.register("lab-tests", lab.LabTestViewSet, basename="lab-test")
public.register("doctors", doctors.DoctorViewSet, basename="doctor")
public.register("centers", centers.CenterViewSet, basename="center")
public.register("pages", cms.PageViewSet, basename="page")
public.register("faqs", cms.FaqViewSet, basename="faq")
public.register("banners", cms.BannerViewSet, basename="banner")

me = Router()
me.register("family", accounts.FamilyMemberViewSet, basename="family")
me.register("appointments", scheduling.MyAppointmentViewSet, basename="my-appointment")
me.register("reviews", reviews.MyReviewViewSet, basename="my-review")
me.register("consultations", consult.ConsultationViewSet, basename="my-consultation")

doctor_router = Router()
doctor_router.register("documents", doctor_panel.DocumentViewSet, basename="dp-document")
doctor_router.register("offices", doctor_panel.OfficeViewSet, basename="dp-office")
doctor_router.register("schedules", doctor_panel.ScheduleViewSet, basename="dp-schedule")
doctor_router.register("exceptions", doctor_panel.ExceptionViewSet, basename="dp-exception")
doctor_router.register("appointments", doctor_panel.AppointmentViewSet, basename="dp-appointment")
doctor_router.register("reviews", doctor_panel.ReviewViewSet, basename="dp-review")
doctor_router.register("consultations", consult.DoctorConsultationViewSet, basename="dp-consultation")
doctor_router.register("online-schedules", consult.OnlineScheduleViewSet, basename="dp-online-schedule")
doctor_router.register("online-exceptions", consult.OnlineExceptionViewSet, basename="dp-online-exception")

center_router = Router()
center_router.register("lab-tests", center_panel.LabTestPriceViewSet, basename="cp-labtest")
center_router.register("schedules", center_panel.CenterScheduleViewSet, basename="cp-schedule")
center_router.register("exceptions", center_panel.CenterExceptionViewSet, basename="cp-exception")
center_router.register("receptions", center_panel.ReceptionViewSet, basename="cp-reception")

ops_router = Router()
ops_router.register("users", ops.UserViewSet, basename="ops-user")
ops_router.register("doctors", ops.OpsDoctorViewSet, basename="ops-doctor")
ops_router.register("centers", ops.OpsCenterViewSet, basename="ops-center")
ops_router.register("appointments", ops.OpsAppointmentViewSet, basename="ops-appointment")
ops_router.register("reviews", ops.OpsReviewViewSet, basename="ops-review")
ops_router.register("settlements", ops.OpsSettlementViewSet, basename="ops-settlement")
ops_router.register("payments", ops.OpsPaymentViewSet, basename="ops-payment")
ops_router.register("sms-logs", ops.SmsLogViewSet, basename="ops-sms")
ops_router.register("audit-logs", ops.AuditLogViewSet, basename="ops-audit")
ops_router.register("catalog/specialties", ops.OpsSpecialtyViewSet, basename="ops-specialty")
ops_router.register("catalog/conditions", ops.OpsConditionViewSet, basename="ops-condition")
ops_router.register("catalog/insurances", ops.OpsInsuranceViewSet, basename="ops-insurance")
ops_router.register("catalog/cities", ops.OpsCityViewSet, basename="ops-city")
ops_router.register("catalog/lab-tests", ops.OpsLabTestViewSet, basename="ops-labtest")

api = [
    # auth
    p("auth/otp/request", accounts.OtpRequestView.as_view()),
    p("auth/otp/verify", accounts.OtpVerifyView.as_view()),
    p("auth/refresh", accounts.RefreshView.as_view()),
    p("auth/logout", accounts.LogoutView.as_view()),
    # public helpers
    p("search/suggest", search.SuggestView.as_view()),
    p("stats", search.StatsView.as_view()),
    p("home", search.HomeView.as_view()),
    re_path(r"^private-media/?$", private_media_view, name="private-media"),
    # patient
    p("me", accounts.MeView.as_view()),
    p("me/wallet", payments.WalletView.as_view()),
    p("me/payments", payments.MyPaymentsView.as_view()),
    re_path(r"^me/payments/(?P<pk>\d+)/?$", payments.PaymentDetailView.as_view()),
    path("me/", include(me.urls)),
    p("payments/start", payments.StartPaymentView.as_view()),
    p("payments/topup", payments.TopupView.as_view()),
    p("payments/callback", payments.CallbackView.as_view()),
    # doctor panel
    p("doctor-panel/onboarding", doctor_panel.OnboardingView.as_view()),
    p("doctor-panel/profile", doctor_panel.ProfileView.as_view()),
    p("doctor-panel/submit", doctor_panel.SubmitForReviewView.as_view()),
    p("doctor-panel/dashboard", doctor_panel.DashboardView.as_view()),
    p("doctor-panel/finance", doctor_panel.FinanceView.as_view()),
    p("doctor-panel/consult-services", consult.ConsultServicesView.as_view()),
    p("doctor-panel/presence", consult.PresenceView.as_view()),
    re_path(r"^doctor-panel/endorse/(?P<short_id>[\w]+)/?$", doctor_panel.EndorseView.as_view()),
    path("doctor-panel/", include(doctor_router.urls)),
    # center panel
    p("center-panel/onboarding", center_panel.CenterOnboardingView.as_view()),
    p("center-panel/mine", center_panel.MyCentersView.as_view()),
    p("center-panel/profile", center_panel.CenterProfileView.as_view()),
    p("center-panel/finance", center_panel.CenterFinanceView.as_view()),
    path("center-panel/", include(center_router.urls)),
    # operator panel
    p("ops/dashboard", ops.DashboardView.as_view()),
    path("ops/", include(ops_router.urls)),
    # docs
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("", include(public.urls)),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = f"مدیریت {settings.BRAND_NAME}"
admin.site.site_title = settings.BRAND_NAME
