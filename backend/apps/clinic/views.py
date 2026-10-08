from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as filters
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOperator
from apps.core.utils import generate_short_id, normalize_fa, slugify_fa
from apps.ops.audit import audit
from apps.payments.services import PaymentError

from . import services
from .models import PackageCategory, PackageOrder, ServicePackage
from .serializers import (
    PackageCardSerializer,
    PackageDetailSerializer,
    PackageOrderSerializer,
    PackageWriteSerializer,
)


def public_packages():
    return ServicePackage.objects.filter(is_active=True, status=ServicePackage.Status.APPROVED).select_related(
        "doctor__primary_specialty", "center", "city__province"
    )


class PackageFilter(filters.FilterSet):
    category = filters.ChoiceFilter(choices=PackageCategory.choices)
    city = filters.CharFilter(field_name="city__slug")
    doctor = filters.CharFilter(field_name="doctor__short_id")
    center = filters.CharFilter(field_name="center__slug")
    q = filters.CharFilter(method="filter_q")
    ordering = filters.CharFilter(method="filter_ordering")

    class Meta:
        model = ServicePackage
        fields: list[str] = []

    def filter_q(self, qs, name, value):
        for w in normalize_fa(value).split():
            qs = qs.filter(search_text__contains=w)
        return qs

    def filter_ordering(self, qs, name, value):
        return {"cheapest": qs.order_by("price"), "newest": qs.order_by("-created_at")}.get(value, qs.order_by("-sold_count", "-created_at"))


class PackageViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = PackageFilter
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        return public_packages()

    def get_serializer_class(self):
        return PackageDetailSerializer if self.action == "retrieve" else PackageCardSerializer

    @action(detail=False)
    def categories(self, request):
        counts = dict(public_packages().values_list("category").annotate(n=Count("id")))
        return Response([{"key": k, "label": v, "count": counts.get(k, 0)} for k, v in PackageCategory.choices])


class MyPackageOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PackageOrderSerializer

    def get_queryset(self):
        return PackageOrder.objects.filter(user=self.request.user).select_related("package__doctor__primary_specialty", "package__center", "package__city")

    def create(self, request):
        package = get_object_or_404(public_packages(), slug=request.data.get("package"))
        try:
            order = services.create_order(request.user, package)
        except services.PackageError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PackageOrderSerializer(order).data, status=201)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        try:
            return Response(services.start_payment(order, use_wallet=bool(request.data.get("use_wallet", True))))
        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        try:
            order, refund = services.cancel_order(self.get_object())
        except services.PackageError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"order": PackageOrderSerializer(order).data, "refunded": refund})


class ProviderPackageViewSet(viewsets.ModelViewSet):
    """Shared by the doctor and center panels: a provider manages its own packages and redeems vouchers."""

    serializer_class = PackageWriteSerializer
    pagination_class = None
    provider_kw: str = ""

    def provider(self):
        if self.provider_kw == "doctor":
            from apps.doctors.panel import current_doctor

            return {"doctor": current_doctor(self.request)}
        from apps.centers.panel import current_center

        return {"center": current_center(self.request)}

    def get_queryset(self):
        return ServicePackage.objects.filter(**self.provider())

    def perform_create(self, serializer):
        title = serializer.validated_data["title"]
        package = serializer.save(slug=f"{slugify_fa(title)[:180]}-{generate_short_id(4).lower()}", status=ServicePackage.Status.PENDING, **self.provider())
        audit(self.request, "package_create", package)

    def perform_update(self, serializer):
        # price/content changes go back to review
        serializer.save(status=ServicePackage.Status.PENDING)

    @action(detail=False)
    def orders(self, request):
        qs = PackageOrder.objects.filter(package__in=self.get_queryset()).exclude(status="pending_payment").select_related("package")[:200]
        return Response(PackageOrderSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"])
    def redeem(self, request):
        try:
            order = services.redeem(request.data.get("voucher_code", ""), provider_user=request.user, **self.provider())
        except services.PackageError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        audit(request, "package_redeem", order)
        return Response(PackageOrderSerializer(order).data)


class DoctorPackageViewSet(ProviderPackageViewSet):
    provider_kw = "doctor"

    def get_permissions(self):
        from apps.core.permissions import IsDoctor

        return [IsDoctor()]


class CenterPackageViewSet(ProviderPackageViewSet):
    provider_kw = "center"

    def get_permissions(self):
        from apps.core.permissions import IsCenterStaff

        return [IsCenterStaff()]


class OpsPackageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = PackageWriteSerializer
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = ServicePackage.objects.select_related("doctor", "center", "city").order_by("-created_at")
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        data = [{**PackageWriteSerializer(p).data, "provider_name": p.provider_name} for p in page]
        return self.get_paginated_response(data)

    def _set(self, request, new_status, reason=""):
        package = self.get_object()
        package.status, package.rejection_reason = new_status, reason
        package.save(update_fields=["status", "rejection_reason", "updated_at"])
        audit(request, f"package_{new_status}", package, reason=reason)
        return Response(PackageWriteSerializer(package).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._set(request, ServicePackage.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if not request.data.get("reason"):
            return Response({"detail": "دلیل رد را وارد کنید."}, status=400)
        return self._set(request, ServicePackage.Status.REJECTED, request.data["reason"])


class OpsPackageOrdersView(APIView):
    permission_classes = [IsOperator]

    def get(self, request):
        qs = PackageOrder.objects.select_related("package").order_by("-created_at")
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(voucher_code=q.upper()) | qs.filter(buyer_mobile__contains=q)
        return Response(PackageOrderSerializer(qs[:100], many=True).data)

    def post(self, request):
        """Operator refund of an unused voucher."""
        order = get_object_or_404(PackageOrder, voucher_code=str(request.data.get("voucher_code", "")).upper())
        try:
            order, refund = services.cancel_order(order, by_provider=True)
        except services.PackageError as e:
            return Response({"detail": str(e)}, status=400)
        audit(request, "package_refund", order, refund=refund)
        return Response({"refunded": refund})

