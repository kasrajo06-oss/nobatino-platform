from django.core.management.base import BaseCommand

from apps.catalog.models import Specialty
from apps.magazine.content import ARTICLES, CATEGORIES
from apps.magazine.models import Article, Category


class Command(BaseCommand):
    help = "Create magazine categories and starter guide articles (only those that don't exist yet)."

    def handle(self, *args, **opts):
        for i, (name, slug, desc) in enumerate(CATEGORIES):
            Category.objects.get_or_create(slug=slug, defaults={"name": name, "description": desc, "order": i})
        created = 0
        for a in ARTICLES:
            if Article.objects.filter(slug=a["slug"]).exists():
                continue
            article = Article.objects.create(
                slug=a["slug"], title=a["title"], excerpt=a["excerpt"], body=a["body"],
                category=Category.objects.get(slug=a["category"]), author_name="تیم تحریریه",
                status=Article.Status.PUBLISHED, is_featured=a["featured"],
            )
            article.specialties.set(Specialty.objects.filter(slug__in=a["specialties"]))
            created += 1
        self.stdout.write(self.style.SUCCESS(f"magazine: {Category.objects.count()} categories, {created} new articles"))
