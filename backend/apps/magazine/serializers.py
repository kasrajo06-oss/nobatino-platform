from rest_framework import serializers

from apps.catalog.models import Condition, Specialty
from apps.catalog.serializers import SpecialtyMiniSerializer
from apps.doctors.models import DoctorProfile

from .models import Article, Category


class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "order", "article_count"]


class ArticleCardSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    reading_minutes = serializers.IntegerField(read_only=True)
    author = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "title", "slug", "excerpt", "cover", "category", "published_at", "reading_minutes", "is_featured", "views", "author"]

    def get_author(self, obj):
        return obj.author_name or (obj.author.full_name if obj.author_id else "")


class ReviewerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    specialty = serializers.CharField(source="primary_specialty.title")

    class Meta:
        model = DoctorProfile
        fields = ["short_id", "slug", "full_name", "photo", "gender", "specialty"]


class ArticleDetailSerializer(ArticleCardSerializer):
    specialties = SpecialtyMiniSerializer(many=True, read_only=True)
    conditions = serializers.SerializerMethodField()
    reviewed_by = ReviewerSerializer(read_only=True)

    class Meta(ArticleCardSerializer.Meta):
        fields = ArticleCardSerializer.Meta.fields + ["body", "specialties", "conditions", "reviewed_by", "seo_title", "seo_description", "updated_at"]

    def get_conditions(self, obj):
        return [{"slug": c.slug, "name": c.name} for c in obj.conditions.all()]


class ArticleWriteSerializer(serializers.ModelSerializer):
    """Operator editor."""

    specialties = serializers.PrimaryKeyRelatedField(queryset=Specialty.objects.all(), many=True, required=False)
    conditions = serializers.PrimaryKeyRelatedField(queryset=Condition.objects.all(), many=True, required=False)
    reviewed_by = serializers.SlugRelatedField(slug_field="short_id", queryset=DoctorProfile.objects.all(), required=False, allow_null=True)
    reading_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id", "title", "slug", "category", "excerpt", "body", "cover", "author_name", "reviewed_by", "specialties",
            "conditions", "status", "published_at", "is_featured", "seo_title", "seo_description", "views", "reading_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "views", "created_at", "updated_at"]
