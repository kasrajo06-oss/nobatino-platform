from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = serializers.ValidationError(exc.message_dict if hasattr(exc, "error_dict") else exc.messages)
    return drf_exception_handler(exc, context)
