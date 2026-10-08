from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.scheduling.models import Appointment

from .models import Payment
from .serializers import (
    PaymentSerializer,
    StartPaymentSerializer,
    TopupSerializer,
    WalletTransactionSerializer,
)
from .services import PaymentError, get_wallet, handle_callback, start_appointment_payment, start_wallet_topup


class StartPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = StartPaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        appt = get_object_or_404(Appointment, tracking_code=s.validated_data["tracking_code"], user=request.user)
        try:
            return Response(start_appointment_payment(appt, use_wallet=s.validated_data["use_wallet"]))
        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TopupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = TopupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            return Response(start_wallet_topup(request.user, s.validated_data["amount"]))
        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CallbackView(APIView):
    """The bank redirects the browser here; we verify and bounce to the frontend result page."""

    authentication_classes: list = []

    def get(self, request):
        pid = request.query_params.get("pid")
        authority = request.query_params.get("Authority") or request.query_params.get("authority", "")
        ok = (request.query_params.get("Status") or request.query_params.get("status", "")).upper() == "OK"
        try:
            payment = handle_callback(int(pid), authority, ok)
        except (Payment.DoesNotExist, TypeError, ValueError):
            return redirect(f"{settings.SITE_URL}/payment/result?status=failed")
        params = f"status={'success' if payment.status == Payment.Status.PAID else 'failed'}&payment={payment.pk}"
        if payment.appointment_id:
            params += f"&tracking_code={payment.appointment.tracking_code}"
        if payment.package_order_id:
            params += f"&package_order={payment.package_order_id}"
        return redirect(f"{settings.SITE_URL}/payment/result?{params}")


class WalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = get_wallet(request.user)
        txs = wallet.transactions.all()[:50]
        return Response({"balance": wallet.balance, "transactions": WalletTransactionSerializer(txs, many=True).data})


class MyPaymentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Payment.objects.filter(user=request.user).select_related("appointment")[:50]
        return Response(PaymentSerializer(qs, many=True).data)


class PaymentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        payment = get_object_or_404(Payment.objects.select_related("appointment"), pk=pk, user=request.user)
        return Response(PaymentSerializer(payment).data)
