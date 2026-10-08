"""Private file storage for medical documents (prescriptions, lab results, consult attachments, doctor documents).

Files live on a local volume that is never exposed by the web server. `url()` returns a short-lived signed
link to `PrivateMediaView`, so a URL is only usable for PRIVATE_URL_MAX_AGE seconds and can't be guessed.
"""
import os
import uuid

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.http import FileResponse, Http404
from django.urls import reverse
from django.utils.deconstruct import deconstructible

_SALT = "private-media"
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@deconstructible
class PrivateStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_MEDIA_ROOT, base_url=None)

    def get_available_name(self, name, max_length=None):
        # unguessable names: never keep the patient's original file name
        folder, original = os.path.split(name)
        ext = os.path.splitext(original)[1].lower()[:10]
        return super().get_available_name(os.path.join(folder, f"{uuid.uuid4().hex}{ext}"), max_length)

    def url(self, name):
        token = signing.dumps(name, salt=_SALT)
        return f"{settings.API_URL}{reverse('private-media')}?f={token}"


def private_storage():
    return PrivateStorage()


def validate_upload(file):
    """Images or PDF up to 10 MB."""
    if not file:
        return
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError("فقط تصویر (jpg, png, webp) یا PDF قابل بارگذاری است.")
    if file.size > MAX_UPLOAD_BYTES:
        raise ValidationError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.")


def private_media_view(request):
    try:
        name = signing.loads(request.GET.get("f", ""), salt=_SALT, max_age=settings.PRIVATE_URL_MAX_AGE)
    except signing.BadSignature as e:
        raise Http404("لینک منقضی یا نامعتبر است.") from e
    storage = PrivateStorage()
    if ".." in name or not storage.exists(name):
        raise Http404
    response = FileResponse(storage.open(name, "rb"))
    response["Cache-Control"] = "private, max-age=300"
    response["X-Content-Type-Options"] = "nosniff"
    return response
