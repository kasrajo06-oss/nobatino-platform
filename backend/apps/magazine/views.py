from django.db.models import Count, F, Q
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsOperator
from apps.core.utils import normalize_fa
from apps.doctors.serializers import DoctorCardSerializer
from apps.doctors.views import public_doctors
from apps.ops.audit import audit

from .models import Article, Category
from .serializers import (
    ArticleCardSerializer,
    ArticleDetailSerializer,
    ArticleWriteSerializer,
    CategorySerializer,
)


class ArticleFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category__slug")
    specialty = filters.CharFilter(field_name="specialties__slug")
    condition = filters.CharFilter(field_name="conditions__slug")
    featured = filters.BooleanFilter(field_name="is_featured")
    q = filters.CharFilter(method="filter_q")

    class Meta:
        model = Article
        fields: list[str] = []

    def filter_q(self, qs, name, value):
        for w in normalize_fa(value).split():
            qs = qs.filter(search_text__contains=w)
        return qs


def published():
    return Article.objects.filter(status=Article.Status.PUBLISHED).select_related("category", "author", "reviewed_by__primary_specialty")


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        return Category.objects.annotate(article_count=Count("articles", filter=Q(articles__status="published")))


class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = ArticleFilter
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = published()
        if self.action == "retrieve":
            qs = qs.prefetch_related("specialties", "conditions")
        if self.request.query_params.get("ordering") == "popular":
            qs = qs.order_by("-views")
        return qs.distinct()

    def get_serializer_class(self):
        return ArticleDetailSerializer if self.action == "retrieve" else ArticleCardSerializer

    def retrieve(self, request, *args, **kwargs):
        article = self.get_object()
        Article.objects.filter(pk=article.pk).update(views=F("views") + 1)
        return Response(ArticleDetailSerializer(article, context={"request": request}).data)

    @action(detail=True)
    def related(self, request, slug=None):
        """Related articles (same specialties/category) and doctors to book with."""
        article = self.get_object()
        spec_ids = list(article.specialties.values_list("id", flat=True))
        articles = published().exclude(pk=article.pk).filter(Q(specialties__in=spec_ids) | Q(category=article.category)).distinct()[:4]
        doctors = public_doctors().filter(specialties__in=spec_ids).distinct().order_by("-popularity")[:4] if spec_ids else []
        return Response({
            "articles": ArticleCardSerializer(articles, many=True, context={"request": request}).data,
            "doctors": DoctorCardSerializer(doctors, many=True, context={"request": request}).data,
        })


class OpsArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = ArticleWriteSerializer

    def get_queryset(self):
        qs = Article.objects.select_related("category").order_by("-updated_at")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("q"):
            qs = qs.filter(title__icontains=p["q"])
        return qs

    def perform_create(self, serializer):
        article = serializer.save(author=self.request.user)
        audit(self.request, "article_create", article)

    def perform_update(self, serializer):
        article = serializer.save()
        audit(self.request, "article_update", article, status=article.status)


class OpsCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = CategorySerializer
    pagination_class = None
    queryset = Category.objects.all()
