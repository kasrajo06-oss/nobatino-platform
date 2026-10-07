from rest_framework import viewsets

from .models import Banner, Faq, Page
from .serializers import BannerSerializer, FaqSerializer, PageSerializer


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.filter(is_published=True)
    serializer_class = PageSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    pagination_class = None


class FaqViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Faq.objects.all()
    serializer_class = FaqSerializer
    filterset_fields = ["category"]
    pagination_class = None


class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    pagination_class = None
