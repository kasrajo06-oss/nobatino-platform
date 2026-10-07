from django.contrib import admin

from .models import Banner, Faq, Page

admin.site.register(Page)
admin.site.register(Faq)
admin.site.register(Banner)
