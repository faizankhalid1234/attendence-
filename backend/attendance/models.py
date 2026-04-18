import datetime
import uuid
from decimal import Decimal

from django.db import models


class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    COMPANY_ADMIN = "COMPANY_ADMIN", "Company Admin"
    MEMBER = "MEMBER", "Member"


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    # Office timings (company timezone me)
    work_start_time = models.TimeField(
        default=datetime.time(9, 0, 0),
        help_text="Attendance window start (local time)",
    )
    work_end_time = models.TimeField(
        default=datetime.time(18, 0, 0),
        help_text="Attendance window end (local time)",
    )
    timezone = models.CharField(
        max_length=64,
        default="Asia/Karachi",
        help_text="IANA timezone, e.g. Asia/Karachi, UTC",
    )
    # Geofence — member sirf is radius ke andar attendance laga sakta hai
    office_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        default=Decimal("24.8609660"),
        help_text="Office ka GPS latitude — purani rows migrate ke liye default; admin se sahi set karein.",
    )
    office_longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        default=Decimal("67.0011000"),
        help_text="Office ka GPS longitude — default migrate; admin se sahi set karein.",
    )
    location_radius_meters = models.PositiveIntegerField(
        default=200,
        help_text="Office se kitne meter tak attendance allow hai",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, related_name="users")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.role})"


class Attendance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField(help_text="Company timezone ke hisaab se din")
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    check_in_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_photo = models.ImageField(upload_to="attendance/%Y/%m/", null=True, blank=True)
    check_out_photo = models.ImageField(upload_to="attendance/%Y/%m/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["member", "date"], name="unique_member_date")]
