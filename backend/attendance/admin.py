from django import forms
from django.contrib import admin, messages
from .models import Attendance, Company, Role, User
from .utils import generate_password, hash_password, send_credentials_email


class CompanyAdminForm(forms.ModelForm):
    company_login_password = forms.CharField(
        label="Company login password",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Nayi company: zaroori. Purani company: khali chhoro — ya naya password bharo (company login fix/change).",
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"].label = "Company login email"
        self.fields["email"].help_text = (
            "Har user ki DB mein unique email. Wahi email dubara nayi company ke liye use ho sakti hai "
            "agar pehle se sirf company-admin is par hai — admin nayi company par shift ho jayega."
        )

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if not email:
            return email
        if self.instance.pk:
            qs = User.objects.filter(email__iexact=email)
            admin = User.objects.filter(company_id=self.instance.pk, role=Role.COMPANY_ADMIN).first()
            if admin:
                qs = qs.exclude(pk=admin.pk)
            if qs.exists():
                raise forms.ValidationError(
                    "Ye email pehle se kisi aur user par hai — member/super ke sath yahi email use nahi ho sakti."
                )
            return email

        # Nayi company: member / super par email block; sirf pehle wala company-admin allow (save par shift hoga)
        if User.objects.filter(email__iexact=email).exclude(role=Role.COMPANY_ADMIN).exists():
            raise forms.ValidationError(
                "Ye email member ya super admin par pehle se hai — company ke liye alag email use karein."
            )
        return email

    def clean(self):
        cleaned = super().clean()
        if not self.instance.pk:
            if not (cleaned.get("company_login_password") or "").strip():
                raise forms.ValidationError("Nayi company ke liye company login password zaroori hai.")
        return cleaned


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    form = CompanyAdminForm
    fieldsets = (
        ("Company login (frontend)", {"fields": ("name", "email", "company_login_password")}),
        ("Timings & location", {"fields": ("work_start_time", "work_end_time", "timezone", "office_latitude", "office_longitude", "location_radius_meters")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    list_display = ("name", "email", "work_start_time", "work_end_time", "timezone", "location_radius_meters", "created_at")
    search_fields = ("name", "email")
    readonly_fields = ("created_at", "updated_at")

    def _sync_company_login_user(self, request, obj, company_password: str) -> None:
        """Is company ka COMPANY_ADMIN: pehle isi company par; warna wahi email kisi aur company ke admin par ho to shift."""
        display_name = (obj.name or "").strip() or obj.email
        admin = User.objects.filter(company=obj, role=Role.COMPANY_ADMIN).first()
        if admin:
            admin.name = display_name
            admin.email = obj.email
            admin.password_hash = hash_password(company_password)
            admin.save(update_fields=["name", "email", "password_hash", "updated_at"])
            self.message_user(
                request,
                f"Company login update: {obj.email} (password form se).",
                level=messages.SUCCESS,
            )
            return

        other_admin = User.objects.filter(email__iexact=obj.email, role=Role.COMPANY_ADMIN).first()
        if other_admin and other_admin.company_id != obj.id:
            old_co = other_admin.company
            old_label = old_co.name if old_co else "—"
            other_admin.company = obj
            other_admin.name = display_name
            other_admin.password_hash = hash_password(company_password)
            other_admin.save(update_fields=["company", "name", "password_hash", "updated_at"])
            self.message_user(
                request,
                f"Isi email ({obj.email}) ka company-admin ab «{obj.name}» par shift ho gaya. "
                f"Purani company «{old_label}» ke paas ab admin login nahi — zarurat ho to wahan edit se naya password / member banaen.",
                level=messages.WARNING,
            )
            mail_result = send_credentials_email(obj.email, display_name, company_password, "Company")
            if mail_result.get("mocked"):
                self.message_user(
                    request,
                    "SMTP off — login ke liye wahi password jo form mein diya.",
                    level=messages.SUCCESS,
                )
            elif not mail_result.get("sent"):
                self.message_user(
                    request,
                    f"Email send fail: {mail_result.get('error', 'unknown')}",
                    level=messages.WARNING,
                )
            else:
                self.message_user(request, f"Credentials {obj.email} par bhej diye.", level=messages.SUCCESS)
            return

        if User.objects.filter(email__iexact=obj.email).exists():
            self.message_user(
                request,
                f"{obj.email} pehle se doosre account par hai — company admin create nahi hua.",
                level=messages.WARNING,
            )
            return

        User.objects.create(
            name=display_name,
            email=obj.email,
            password_hash=hash_password(company_password),
            role=Role.COMPANY_ADMIN,
            company=obj,
        )
        mail_result = send_credentials_email(obj.email, display_name, company_password, "Company")
        if mail_result.get("mocked"):
            self.message_user(
                request,
                f"Company login ready: {obj.email}. SMTP off — wahi password jo form mein diya.",
                level=messages.SUCCESS,
            )
        elif not mail_result.get("sent"):
            self.message_user(
                request,
                f"Company login ready: {obj.email}. Email send fail: {mail_result.get('error', 'unknown')}",
                level=messages.WARNING,
            )
        else:
            self.message_user(
                request,
                f"Company login ready. {obj.email} par credentials bhej diye.",
                level=messages.SUCCESS,
            )

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)

        company_password = (form.cleaned_data.get("company_login_password") or "").strip()
        if is_new:
            if not company_password:
                self.message_user(
                    request,
                    "Company login password missing — company account (login) create nahi hua.",
                    level=messages.ERROR,
                )
                return
            self._sync_company_login_user(request, obj, company_password)
        elif company_password:
            # Pehle se bani company jahan admin user miss ho gaya — edit par password se repair.
            self._sync_company_login_user(request, obj, company_password)


class UserAdminForm(forms.ModelForm):
    plain_password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=True),
        help_text="Khali chhoro to system random password generate karega.",
    )

    class Meta:
        model = User
        fields = ["name", "email", "role", "company", "plain_password"]

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if not email:
            return email
        qs = User.objects.filter(email__iexact=email)
        if self.instance and getattr(self.instance, "pk", None):
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise forms.ValidationError("Ye email pehle se kisi user par hai — har account ki unique email honi chahiye.")
        return email

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
