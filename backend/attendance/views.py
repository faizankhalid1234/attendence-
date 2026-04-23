import datetime
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal
from functools import wraps
from zoneinfo import ZoneInfo
from django.conf import settings as django_settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .geo import haversine_meters
from .models import Attendance, Company, Role, User
from .time_rules import company_local_date, company_local_now, in_work_window, stored_timezone_is_valid
from .utils import (
    COOKIE_NAME,
    clear_auth_cookie,
    generate_password,
    hash_password,
    make_token,
    read_token,
    send_credentials_email,
    send_test_email,
    set_auth_cookie,
    verify_password,
)


def parse_body(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        return {}


def require_valid_iana_timezone(tz_name: str) -> str | None:
    raw = (tz_name or "").strip()
    if not raw:
        return None
    try:
        ZoneInfo(raw)
    except Exception:
        return None
    return raw


def parse_hhmm(value: str):
    raw = (value or "").strip()
    parts = raw.split(":")
    if len(parts) < 2:
        raise ValueError("time format HH:MM")
    h, m = int(parts[0]), int(parts[1])
    return datetime.time(h, m, 0)


def allowed_image_type(upload) -> bool:
    ctype = (getattr(upload, "content_type", "") or "").lower()
    if ctype in ("image/jpeg", "image/png", "image/webp", "image/jpg", "application/octet-stream"):
        return True
    name = (getattr(upload, "name", "") or "").lower()
    return name.endswith((".jpg", ".jpeg", ".png", ".webp"))


def auth_required(*roles):
    def outer(fn):
        @wraps(fn)
        def inner(request, *args, **kwargs):
            token = request.COOKIES.get(COOKIE_NAME)
            if not token:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = "No session cookie — log in again (same host as the app, e.g. localhost not 127.0.0.1)."
                return JsonResponse(payload, status=401)
            session = read_token(token)
            if not session:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = "Invalid or expired token — log in again; check JWT_SECRET unchanged since login."
                return JsonResponse(payload, status=401)
            if roles and session.get("role") not in roles:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = (
                        f"Role {session.get('role')!r} is not allowed — this action needs one of: {list(roles)}."
                    )
                return JsonResponse(payload, status=401)
            request.session_user = session
            return fn(request, *args, **kwargs)

        return inner

    return outer


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    body = parse_body(request)
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    if not email or not password:
        return JsonResponse({"error": "Invalid credentials payload"}, status=400)

    user = User.objects.select_related("company").filter(email__iexact=email).first()
    if not user or not verify_password(password, user.password_hash):
        payload = {"error": "Invalid email or password"}
        if user:
            payload["hint"] = "Email sahi hai lekin password galat hai — har account ka apna password hota hai."
        elif Company.objects.filter(email__iexact=email).exists():
            payload["hint"] = (
                "Company record is email par hai lekin user login set nahi. "
                "Django Admin > Companies > edit > Company login password save karein."
            )
        if django_settings.DEBUG:
            payload["debug_hint"] = "user_not_found" if not user else "bad_password"
        return JsonResponse(payload, status=401)

    token = make_token({"userId": str(user.id), "role": user.role, "companyId": str(user.company_id) if user.company_id else None})
    login_payload = {
        "message": "Login successful",
        "role": user.role,
        "userName": user.name,
        "companyId": str(user.company_id) if user.company_id else None,
        "companyName": user.company.name if user.company_id else None,
        "loginAs": (
            "company"
            if user.role == Role.COMPANY_ADMIN
            else "member"
            if user.role == Role.MEMBER
            else "super_admin"
            if user.role == Role.SUPER_ADMIN
            else user.role
        ),
    }
    response = JsonResponse(login_payload)
    set_auth_cookie(response, token)
    return response


@csrf_exempt
@require_http_methods(["POST"])
def demo_login(_request):
    demo_name = "Faizan"
    demo_email = "faizandemo@yopmail.com"
    demo_company_name = "Demo Company"

    company = Company.objects.filter(name=demo_company_name).first()
    if not company:
        company = Company.objects.create(
            name=demo_company_name,
            email="demo-company@attendance.local",
        )
    user = User.objects.select_related("company").filter(email=demo_email).first()
    if not user:
        user = User.objects.create(
            name=demo_name,
            email=demo_email,
            password_hash=hash_password(generate_password()),
            role=Role.MEMBER,
            company=company,
        )
    elif user.role != Role.MEMBER or not user.company_id:
        user.role = Role.MEMBER
        user.company = company
        user.save(update_fields=["role", "company", "updated_at"])

    token = make_token({"userId": str(user.id), "role": user.role, "companyId": str(user.company_id) if user.company_id else None})
    body = {
        "message": "Demo login successful",
        "role": user.role,
        "userName": user.name,
        "companyId": str(user.company_id) if user.company_id else None,
        "companyName": user.company.name if user.company_id else None,
        "demoMode": True,
    }
    response = JsonResponse(body)
    set_auth_cookie(response, token)
    return response


@csrf_exempt
@require_http_methods(["POST"])
def logout(_request):
    response = JsonResponse({"message": "Logged out"})
    clear_auth_cookie(response)
    return response


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.SUPER_ADMIN)
def super_admin_companies(request):
    if request.method == "GET":
        companies = Company.objects.all().order_by("-created_at")
        data = []
        for company in companies:
            members_count = User.objects.filter(company=company, role=Role.MEMBER).count()
            data.append(
                {
                    "id": str(company.id),
                    "name": company.name,
                    "email": company.email,
                    "membersCount": members_count,
                    "workStart": company.work_start_time.strftime("%H:%M"),
                    "workEnd": company.work_end_time.strftime("%H:%M"),
                    "timezone": company.timezone,
                    "officeLatitude": float(company.office_latitude),
                    "officeLongitude": float(company.office_longitude),
                    "locationRadiusMeters": company.location_radius_meters,
                }
            )
        return JsonResponse({"companies": data})

    body = parse_body(request)
    company_name = (body.get("companyName") or "").strip()
    company_email = (body.get("companyEmail") or "").strip().lower()
    admin_name = (body.get("adminName") or "").strip()
    work_start_s = (body.get("workStart") or "").strip()
    work_end_s = (body.get("workEnd") or "").strip()
    tz_name = (body.get("timezone") or "Asia/Karachi").strip()
    tz_valid = require_valid_iana_timezone(tz_name)
    if not tz_valid:
        return JsonResponse(
            {"error": "Timezone IANA format me hona chahiye, maslan Asia/Karachi (Gujranwala bhi isi zone me)."},
            status=400,
        )
    tz_name = tz_valid
    try:
        work_start = parse_hhmm(work_start_s)
        work_end = parse_hhmm(work_end_s)
    except (ValueError, TypeError):
        return JsonResponse(
            {
                "error": "workStart aur workEnd (HH:MM) sahi format me hone chahiye.",
            },
            status=400,
        )

    try:
        office_lat = float(body.get("officeLatitude", 24.860966))
        office_lng = float(body.get("officeLongitude", 67.001100))
        location_radius_meters = int(body.get("locationRadiusMeters", 200))
    except (ValueError, TypeError):
        return JsonResponse({"error": "Office latitude/longitude ya radius number format me hon."}, status=400)
    if "officeLatitude" in body or "officeLongitude" in body:
        if not (-90 <= office_lat <= 90 and -180 <= office_lng <= 180):
            return JsonResponse({"error": "Office latitude/longitude range galat hai."}, status=400)
    if "locationRadiusMeters" in body and (location_radius_meters < 20 or location_radius_meters > 5000):
        return JsonResponse({"error": "locationRadiusMeters 20 se 5000 ke beech hona chahiye."}, status=400)

    if not company_name or not company_email or not admin_name:
        return JsonResponse({"error": "Invalid payload"}, status=400)
    password = generate_password()
    company = Company.objects.create(
        name=company_name,
        email=company_email,
        work_start_time=work_start,
        work_end_time=work_end,
        timezone=tz_name,
        office_latitude=Decimal(str(office_lat)),
        office_longitude=Decimal(str(office_lng)),
        location_radius_meters=location_radius_meters,
    )
    User.objects.create(
        name=admin_name,
        email=company_email,
        password_hash=hash_password(password),
        role=Role.COMPANY_ADMIN,
        company=company,
    )
    mail_result = send_credentials_email(company_email, admin_name, password, "Company")
    payload = {
        "message": "Company created",
        "company": {"id": str(company.id), "name": company.name, "email": company.email, "tempPassword": password},
    }
    if mail_result.get("mocked"):
        payload["emailWarning"] = "SMTP set nahi — password sirf is response / server console me dekho."
    elif not mail_result.get("sent"):
        payload["emailWarning"] = f"Email send fail: {mail_result.get('error', 'unknown')}"
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["POST"])
@auth_required(Role.SUPER_ADMIN)
def super_admin_members(request):
    """Deprecated: member creation is handled by company admins from the company dashboard."""
    return JsonResponse({"error": "This endpoint is disabled. Add members from the company admin dashboard."}, status=410)
    body = parse_body(request)
    company_id = (body.get("companyId") or "").strip()
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not company_id or not name or not email:
        return JsonResponse({"error": "companyId, name, email zaroori hain."}, status=400)
    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company nahi mili."}, status=404)
    password = generate_password()
    member = User.objects.create(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=Role.MEMBER,
        company_id=company_id,
    )
    mail_result = send_credentials_email(email, name, password, "Member")
    payload = {
        "message": "Member add ho gaya",
        "member": {
            "id": str(member.id),
            "name": member.name,
            "email": member.email,
            "companyId": str(company_id),
            "createdAt": member.created_at.isoformat(),
            "tempPassword": password,
        },
    }
    if mail_result.get("mocked"):
        payload["emailWarning"] = "SMTP set nahi — password API response me hi hai."
    elif not mail_result.get("sent"):
        payload["emailWarning"] = f"Email send fail: {mail_result.get('error', 'unknown')}"
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.COMPANY_ADMIN)
def company_members(request):
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method == "GET":
        members = User.objects.filter(company_id=company_id, role=Role.MEMBER).order_by("-created_at")
        data = [
            {"id": str(member.id), "name": member.name, "email": member.email, "createdAt": member.created_at.isoformat()}
            for member in members
        ]
        return JsonResponse({"members": data})

    body = parse_body(request)
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not name or not email:
        return JsonResponse({"error": "Invalid payload"}, status=400)
    password = generate_password()
    member = User.objects.create(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=Role.MEMBER,
        company_id=company_id,
    )
    mail_result = send_credentials_email(email, name, password, "Member")
    payload = {
        "message": "Member created",
        "member": {
            "id": str(member.id),
            "name": member.name,
            "email": member.email,
            "createdAt": member.created_at.isoformat(),
            "tempPassword": password,
        },
    }
    if mail_result.get("mocked"):
        payload["emailWarning"] = "SMTP set nahi — password API response me hi hai."
    elif not mail_result.get("sent"):
        payload["emailWarning"] = f"Email send fail: {mail_result.get('error', 'unknown')}"
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
@auth_required(Role.COMPANY_ADMIN)
def company_settings(request):
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found"}, status=404)

    if request.method == "GET":
        payload = {
            "company": {
                "name": company.name,
                "email": company.email,
                "workStart": company.work_start_time.strftime("%H:%M"),
                "workEnd": company.work_end_time.strftime("%H:%M"),
                "timezone": company.timezone,
                "officeLatitude": float(company.office_latitude),
                "officeLongitude": float(company.office_longitude),
                "locationRadiusMeters": company.location_radius_meters,
            }
        }
        if not stored_timezone_is_valid(company):
            payload["timezoneWarning"] = (
                "Database me timezone invalid hai (mis: 'gujranwala'). "
                "Abhi calculations Asia/Karachi fallback use ho rahi hain — yahan Asia/Karachi save kar dein."
            )
        return JsonResponse(payload)

    body = parse_body(request)
    if "workStart" in body:
        try:
            company.work_start_time = parse_hhmm(str(body.get("workStart")))
        except ValueError:
            return JsonResponse({"error": "workStart HH:MM format me hona chahiye."}, status=400)
    if "workEnd" in body:
        try:
            company.work_end_time = parse_hhmm(str(body.get("workEnd")))
        except ValueError:
            return JsonResponse({"error": "workEnd HH:MM format me hona chahiye."}, status=400)
    if "timezone" in body:
        tz = require_valid_iana_timezone(str(body.get("timezone")))
        if not tz:
            return JsonResponse(
                {"error": "Timezone IANA hona chahiye, maslan Asia/Karachi."},
                status=400,
            )
        company.timezone = tz
    if "officeLatitude" in body and "officeLongitude" in body:
        try:
            olat = float(body.get("officeLatitude"))
            olng = float(body.get("officeLongitude"))
        except (TypeError, ValueError):
            return JsonResponse({"error": "officeLatitude / officeLongitude number hon."}, status=400)
        if not (-90 <= olat <= 90 and -180 <= olng <= 180):
            return JsonResponse({"error": "Office lat/lng range galat."}, status=400)
        company.office_latitude = Decimal(str(olat))
        company.office_longitude = Decimal(str(olng))
    if "locationRadiusMeters" in body:
        try:
            r = int(body.get("locationRadiusMeters"))
        except (TypeError, ValueError):
            return JsonResponse({"error": "locationRadiusMeters number hona chahiye."}, status=400)
        if r < 20 or r > 5000:
            return JsonResponse({"error": "locationRadiusMeters 20-5000 ke beech hon."}, status=400)
        company.location_radius_meters = r

    company.save()
    return JsonResponse({"message": "Company settings save ho gayin."})


@csrf_exempt
@require_http_methods(["GET"])
@auth_required(Role.COMPANY_ADMIN)
def company_attendance_reports(request):
    """Har member ka din-wise status (complete / pending / absent) — graphs ke liye."""
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found"}, status=404)

    try:
        days = int(request.GET.get("days") or 21)
    except (TypeError, ValueError):
        days = 21
    days = max(7, min(days, 90))

    now = timezone.now()
    end_d = company_local_date(company, now)
    start_d = end_d - datetime.timedelta(days=days - 1)

    members = list(User.objects.filter(company_id=company_id, role=Role.MEMBER).order_by("name"))
    member_ids = [m.id for m in members]

    att_map = {}
    if member_ids:
        for a in Attendance.objects.filter(member_id__in=member_ids, date__gte=start_d, date__lte=end_d):
            att_map[(a.member_id, a.date)] = a

    def status_for_row(row):
        if row is None:
            return "absent"
        if row.checked_in_at and row.checked_out_at:
            return "complete"
        if row.checked_in_at:
            return "pending"
        return "absent"

    all_dates = []
    d = start_d
    while d <= end_d:
        all_dates.append(d.isoformat())
        d += datetime.timedelta(days=1)

    out_members = []
    for m in members:
        series = []
        summary = {"complete": 0, "pending": 0, "absent": 0}
        d2 = start_d
        while d2 <= end_d:
            row = att_map.get((m.id, d2))
            st = status_for_row(row)
            series.append({"date": d2.isoformat(), "status": st})
            summary[st] = summary.get(st, 0) + 1
            d2 += datetime.timedelta(days=1)
        out_members.append(
            {
                "id": str(m.id),
                "name": m.name,
                "email": m.email,
                "series": series,
                "summary": summary,
            }
        )

    return JsonResponse(
        {
            "timezone": company.timezone,
            "startDate": start_d.isoformat(),
            "endDate": end_d.isoformat(),
            "dates": all_dates,
            "members": out_members,
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@auth_required(Role.MEMBER)
def member_location_label(request):
    """OpenStreetMap Nominatim reverse geocode — jagah ka naam (street-level zoom)."""
    try:
        lat = float(request.GET.get("latitude") or request.GET.get("lat", ""))
        lng = float(request.GET.get("longitude") or request.GET.get("lng", ""))
    except ValueError:
        return JsonResponse({"error": "latitude aur longitude bhejein"}, status=400)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return JsonResponse({"error": "range galat"}, status=400)

    # zoom=19: finer reverse result near the exact pin (label is still an approximation vs GPS error).
    params = urllib.parse.urlencode(
        {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "zoom": 19,
            "addressdetails": 1,
            "accept-language": "en,ur",
        }
    )
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AttendanceMarkApp/1.0 (internal attendance demo)",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ValueError):
        short = f"{lat:.5f}, {lng:.5f}"
        return JsonResponse(
            {
                "label": short,
                "shortAddress": short,
                "fallback": True,
                "latitude": lat,
                "longitude": lng,
            }
        )

    addr = payload.get("address") or {}
    feat_name = (payload.get("name") or "").strip()
    parts = [
        feat_name,
        addr.get("amenity"),
        addr.get("shop"),
        addr.get("marketplace"),
        addr.get("commercial"),
        addr.get("retail"),
        addr.get("tourism"),
        addr.get("road"),
        addr.get("neighbourhood"),
        addr.get("quarter"),
        addr.get("suburb"),
        addr.get("hamlet"),
        addr.get("village"),
        addr.get("city_district"),
        addr.get("city") or addr.get("town") or addr.get("municipality"),
        addr.get("state"),
        addr.get("country"),
    ]
    seen = set()
    ordered = []
    for p in parts:
        if not p:
            continue
        s = str(p).strip()
        if not s:
            continue
        key = s.casefold()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(s)
    label = ", ".join(ordered)
    if not label.strip():
        dn = (payload.get("display_name") or "").strip()
        label = dn[:220] if dn else f"{lat:.5f}, {lng:.5f}"

    out = {
        "label": label,
        "displayName": payload.get("display_name"),
        "fallback": False,
        "latitude": lat,
        "longitude": lng,
    }
    return JsonResponse(out)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.MEMBER)
def member_attendance(request):
    member_id = request.session_user.get("userId")
    member = User.objects.select_related("company").filter(id=member_id).first()
    if not member or not member.company:
        return JsonResponse({"error": "Member company missing"}, status=400)
    company = member.company

    if request.method == "GET":
        rows = Attendance.objects.filter(member_id=member_id).order_by("-date")[:60]
        data = []
        for row in rows:
            data.append(
                {
                    "id": str(row.id),
                    "date": row.date.isoformat(),
                    "checkedInAt": row.checked_in_at.isoformat() if row.checked_in_at else None,
                    "checkedOutAt": row.checked_out_at.isoformat() if row.checked_out_at else None,
                    "checkInLatitude": float(row.check_in_latitude) if row.check_in_latitude is not None else None,
                    "checkInLongitude": float(row.check_in_longitude) if row.check_in_longitude is not None else None,
                    "checkOutLatitude": float(row.check_out_latitude) if row.check_out_latitude is not None else None,
                    "checkOutLongitude": float(row.check_out_longitude) if row.check_out_longitude is not None else None,
                    "checkInPhotoUrl": row.check_in_photo.url if row.check_in_photo else None,
                    "checkOutPhotoUrl": row.check_out_photo.url if row.check_out_photo else None,
                }
            )
        company_payload = {
            "id": str(company.id),
            "name": company.name,
            "workStart": company.work_start_time.strftime("%H:%M"),
            "workEnd": company.work_end_time.strftime("%H:%M"),
            "timezone": company.timezone,
            "officeLatitude": float(company.office_latitude),
            "officeLongitude": float(company.office_longitude),
            "locationRadiusMeters": company.location_radius_meters,
            "localToday": company_local_date(company, timezone.now()).isoformat(),
        }
        companies = [{"id": str(company.id), "name": company.name}]
        return JsonResponse({"history": data, "company": company_payload, "companies": companies, "demoMode": member.email == "faizandemo@yopmail.com"})

    if member.email == "faizandemo@yopmail.com":
        return JsonResponse({"error": "Demo user is view-only. Attendance marking is disabled."}, status=403)

    now = timezone.now()
    if not in_work_window(company, now):
        local = company_local_now(company, now)
        ws = company.work_start_time.strftime("%H:%M")
        we = company.work_end_time.strftime("%H:%M")
        return JsonResponse(
            {
                "error": (
                    f"Attendance sirf shift ke darmiyan allowed hai "
                    f"({ws} - {we}, timezone: {company.timezone}). "
                    f"Abhi aapka local time: {local.strftime('%H:%M')}."
                ),
                "hint": "Company admin dashboard se shift start/end aur timezone (Asia/Karachi) sahi set karein.",
                "currentLocalTime": local.strftime("%H:%M"),
                "windowStart": ws,
                "windowEnd": we,
            },
            status=400,
        )

    if not request.content_type or "multipart/form-data" not in request.content_type:
        return JsonResponse(
            {"error": "multipart/form-data bhejo: latitude, longitude, photo (live camera se)."},
            status=400,
        )

    lat_s = request.POST.get("latitude")
    lng_s = request.POST.get("longitude")
    posted_company_id = (request.POST.get("companyId") or "").strip()
    photo = request.FILES.get("photo")
    if not lat_s or not lng_s or not photo:
        return JsonResponse({"error": "latitude, longitude, aur live photo zaroori hain."}, status=400)
    if posted_company_id and posted_company_id != str(company.id):
        return JsonResponse(
            {"error": "Aap sirf apni assigned company ki attendance mark kar sakte hain."},
            status=403,
        )
    try:
        lat = float(lat_s)
        lng = float(lng_s)
    except ValueError:
        return JsonResponse({"error": "latitude/longitude number honi chahiye."}, status=400)

    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return JsonResponse({"error": "Location range galat hai."}, status=400)
    if not allowed_image_type(photo):
        return JsonResponse({"error": "Photo sirf JPEG/PNG/WebP honi chahiye."}, status=400)
    if photo.size > 5 * 1024 * 1024:
        return JsonResponse({"error": "Photo 5MB se chhoti honi chahiye."}, status=400)

    # Live GPS coordinates save hoti hain; office radius enforce nahi — member kahin se bhi mark kar sakta hai.
    office_lat = float(company.office_latitude)
    office_lng = float(company.office_longitude)
    distance_m = haversine_meters(lat, lng, office_lat, office_lng)

    today_local = company_local_date(company, now)
    existing = Attendance.objects.filter(member_id=member_id, date=today_local).first()
    lat_dec = Decimal(str(lat))
    lng_dec = Decimal(str(lng))

    if not existing:
        row = Attendance.objects.create(
            member_id=member_id,
            date=today_local,
            checked_in_at=now,
            check_in_latitude=lat_dec,
            check_in_longitude=lng_dec,
            check_in_photo=photo,
        )
        return JsonResponse({"message": "Checked in", "row": {"id": str(row.id)}, "distanceMeters": int(distance_m)})
    if not existing.checked_out_at:
        existing.checked_out_at = now
        existing.check_out_latitude = lat_dec
        existing.check_out_longitude = lng_dec
        existing.check_out_photo = photo
        existing.save(
            update_fields=[
                "checked_out_at",
                "check_out_latitude",
                "check_out_longitude",
                "check_out_photo",
                "updated_at",
            ]
        )
        return JsonResponse(
            {"message": "Checked out", "row": {"id": str(existing.id)}, "distanceMeters": int(distance_m)}
        )
    return JsonResponse({"message": "Attendance already completed for today"})


@require_http_methods(["GET"])
def health(_request):
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def test_email(request):
    """
    Gmail / SMTP verify karne ke liye.
    .env: EMAIL_TEST_SECRET=apna-random-string
    Request: POST /api/test-email
      Header: X-Email-Test-Secret: <same as EMAIL_TEST_SECRET>
      Body JSON: {"to": "you@gmail.com"}
    """
    expected = (os.getenv("EMAIL_TEST_SECRET") or "").strip()
    if not expected:
        return JsonResponse(
            {
                "error": "EMAIL_TEST_SECRET .env me set karo (koi random string), phir server restart karo.",
            },
            status=400,
        )
    got = (request.headers.get("X-Email-Test-Secret") or "").strip()
    if got != expected:
        return JsonResponse({"error": "Header X-Email-Test-Secret galat ya missing hai."}, status=401)

    body = parse_body(request)
    to = (body.get("to") or "").strip().lower()
    if not to or "@" not in to:
        return JsonResponse({"error": "Body me valid \"to\" email chahiye."}, status=400)

    try:
        result = send_test_email(to)
    except Exception as exc:  # noqa: BLE001 — user-facing SMTP errors
        return JsonResponse({"error": str(exc)}, status=500)

    if result.get("mocked"):
        return JsonResponse(
            {
                "ok": True,
                "mocked": True,
                "message": "SMTP_HOST / SMTP_USER / SMTP_PASS khali hain — console me mock log dekho, real mail nahi gaya.",
            }
        )
    return JsonResponse({"ok": True, "mocked": False, "message": f"Test email bhej diya: {to}"})
