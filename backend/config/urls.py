"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from attendance import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", views.health),
    path("api/test-email", views.test_email),
    path("api/auth/login", views.login),
    path("api/auth/demo-login", views.demo_login),
    path("api/auth/logout", views.logout),
    path("api/super-admin/companies", views.super_admin_companies),
    path("api/super-admin/members", views.super_admin_members),
    path("api/company/members", views.company_members),
    path("api/company/attendance-reports", views.company_attendance_reports),
    path("api/company/settings", views.company_settings),
    path("api/member/location-label", views.member_location_label),
    path("api/member/attendance", views.member_attendance),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
