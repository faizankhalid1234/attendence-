from django import forms
from django.contrib import admin, messages
from .models import Attendance, Company, Role, User
from .utils import generate_password, hash_password, send_credentials_email


class CompanyAdminForm(forms.ModelForm):
    admin_name = forms.CharField(
        required=False,
        help_text="Sirf nayi company ke liye: admin ka naam (credentials isi email par jayenge).",
    )
    admin_password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Sirf nayi company ke liye: company admin ka login password (frontend login ke liye).",
    )

    class Meta:
        model = Company
        fields = [
            "name",
            "email",
            "work_start_time",
            "work_end_time",
            "timezone",
            "office_latitude",
            "office_longitude",
            "location_radius_meters",
        ]

    def clean(self):
        cleaned = super().clean()
        if not self.instance.pk:
            if not (cleaned.get("admin_name") or "").strip():
                raise forms.ValidationError("Nayi company ke liye admin_name zaroori hai.")
            if not (cleaned.get("admin_password") or "").strip():
                raise forms.ValidationError("Nayi company ke liye admin_password zaroori hai.")
        return cleaned


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    form = CompanyAdminForm
    list_display = ("name", "email", "work_start_time", "work_end_time", "timezone", "location_radius_meters", "created_at")
    search_fields = ("name", "email")
    readonly_fields = ("created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)

        # Company create hote hi company admin user bhi create karo.
        if is_new:
            admin_name = (form.cleaned_data.get("admin_name") or "").strip()
            admin_password = (form.cleaned_data.get("admin_password") or "").strip()
            if not admin_name or not admin_password:
                self.message_user(request, "admin_name/admin_password missing — company admin create nahi hua.", level=messages.ERROR)
                return

            existing = User.objects.filter(email=obj.email).order_by("-created_at").first()
            if existing:
                if existing.role != Role.COMPANY_ADMIN:
                    self.message_user(
                        request,
                        f"Company ban gayi lekin {obj.email} par pehle se non-admin user exist karta hai — admin create/update nahi kiya.",
                        level=messages.WARNING,
                    )
                    return
                existing.name = admin_name
                existing.password_hash = hash_password(admin_password)
                existing.company = obj
                existing.save(update_fields=["name", "password_hash", "company", "updated_at"])
                self.message_user(
                    request,
                    f"Company admin update ho gaya: {obj.email} (password admin form se set).",
                    level=messages.SUCCESS,
                )
                return

            User.objects.create(
                name=admin_name,
                email=obj.email,
                password_hash=hash_password(admin_password),
                role=Role.COMPANY_ADMIN,
                company=obj,
            )
            mail_result = send_credentials_email(obj.email, admin_name, admin_password, "Company")
            if mail_result.get("mocked"):
                self.message_user(
                    request,
                    f"Company admin create ho gaya: {obj.email}. SMTP off hai — password admin form wala hi use karein.",
                    level=messages.SUCCESS,
                )
            elif not mail_result.get("sent"):
                self.message_user(
                    request,
                    f"Company admin create ho gaya: {obj.email}. Email send fail: {mail_result.get('error', 'unknown')}",
                    level=messages.WARNING,
                )
            else:
                self.message_user(
                    request,
                    f"Company admin create ho gaya. Credentials {obj.email} par send ho gaye.",
                    level=messages.SUCCESS,
                )


class UserAdminForm(forms.ModelForm):
    plain_password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=True),
        help_text="Khali chhoro to system random password generate karega.",
    )

    class Meta:
        model = User
        fields = ["name", "email", "role", "company", "plain_password"]

    def clean(self):
        cleaned = super().clean()
        role = cleaned.get("role")
        company = cleaned.get("company")
        if role in [Role.COMPANY_ADMIN, Role.MEMBER] and not company:
            raise forms.ValidationError("Company admin/member ke liye company select karna zaroori hai.")
        if role == Role.SUPER_ADMIN:
            cleaned["company"] = None
        return cleaned


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ("name", "email", "role", "company", "created_at")
    search_fields = ("name", "email", "company__name")
    list_filter = ("role", "company")
    readonly_fields = ("created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        raw_password = form.cleaned_data.get("plain_password")
        should_send = False

        if not change:
            raw_password = raw_password or generate_password()
            obj.password_hash = hash_password(raw_password)
            should_send = True
        elif raw_password:
            obj.password_hash = hash_password(raw_password)
            should_send = True

        super().save_model(request, obj, form, change)

        if should_send and obj.role in [Role.COMPANY_ADMIN, Role.MEMBER]:
            send_credentials_email(obj.email, obj.name, raw_password, "Member" if obj.role == Role.MEMBER else "Company")
            self.message_user(
                request,
                f"{obj.role} credentials {obj.email} par send ho gaye.",
                level=messages.SUCCESS,
            )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        "member",
        "member_company",
        "date",
        "checked_in_at",
        "checked_out_at",
        "check_in_latitude",
        "check_in_longitude",
    )
    search_fields = ("member__name", "member__email", "member__company__name")
    list_filter = ("date", "member__company")
    readonly_fields = ("created_at", "updated_at")

    def member_company(self, obj):
        return obj.member.company.name if obj.member.company else "-"

    member_company.short_description = "Company"
