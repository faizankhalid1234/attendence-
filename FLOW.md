# Attendance project — full flow (kya kahan ho raha hai)

Ye repo **do hisson** me split hai: **frontend** (Next.js) aur **backend** (Django + Postgres).

---

## 1) Run order (zaroori)

1. **Backend** (Django) — default hum `4000` port use karte hain taake frontend proxy se match ho:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_super_admin
python manage.py runserver 0.0.0.0:4000
```

2. **Frontend** (Next.js):

```bash
cd frontend
npm install
npm run dev
```

3. Browser: **`http://localhost:3000`** (frontend).  
   API calls browser se **`http://localhost:3000/api/...`** jaati hain — Next.js unhe **server-side** Django par forward karta hai (`BACKEND_URL`, default `http://127.0.0.1:4000`).

> Agar tum `runserver` **8000** par chala rahe ho to `frontend/.env` me `BACKEND_URL=http://127.0.0.1:8000` set karo aur Next dev dubara chalao.

---

## 2) Login flow (email + password + cookie)

| Step | Kahan | Kya hota hai |
|------|--------|----------------|
| 1 | `frontend/app/components/LoginForm.tsx` | User email/password submit karta hai. `apiFetch()` use hota hai = **`credentials: 'include'`** taake cookies save hon. |
| 2 | `frontend/app/api/[[...path]]/route.ts` | Har `/api/*` request **Node (Next) se Django** tak proxy hoti hai; **Set-Cookie** headers browser ko **localhost:3000** ke response me milte hain (yehi pehle rewrite se reliable nahi tha). |
| 3 | `backend/attendance/views.py` → `login` | Email lower-case match, password `verify_password()` se check (Django hashers). |
| 4 | `backend/attendance/utils.py` | JWT cookie `attendance_session` set hoti hai (httpOnly). |
| 5 | Baaki dashboards | `GET /api/super-admin/companies` waghera — same cookie wapas jati hai proxy ke through. |

**`Invalid email or password` iska matlab:**

- DB me user nahi mila (`debug_hint: user_not_found` jab `DEBUG=True`), **ya**
- password galat (`debug_hint: bad_password`).

**Fix:** super admin dubara seed karo (same DB par):

```bash
cd backend
python manage.py seed_super_admin
```

`.env` values `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` wahi use karo jo seed command use karti hai.

---

## 3) Email flow (Gmail / SMTP)

| Step | Kahan | Kya hota hai |
|------|--------|----------------|
| 1 | `backend/.env` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` set hon. Gmail = **App Password** (normal password nahi). |
| 2 | `backend/config/settings.py` | `EMAIL_*` Django mail backend ko point karta hai. |
| 3 | `backend/attendance/utils.py` → `send_credentials_email` | Agar SMTP khali → **mock** (sirf server console / log). Agar set → `send_mail()`. Error par ab **API me `emailWarning`** return hota hai taake pata chale mail fail hui. |

Test endpoint: `POST /api/test-email` (header `X-Email-Test-Secret` + body `{"to":"..."}`) — pehle guide me likha tha.

---

## 4) Roles & features

| Role | UI path | Backend APIs |
|------|---------|--------------|
| Super Admin | `/super-admin/dashboard` | `GET/POST /api/super-admin/companies` — company + shift time + office GPS + radius |
| Company Admin | `/company/dashboard` | `GET/POST /api/company/members` |
| Member | `/member/dashboard` | `GET/POST /api/member/attendance` — **multipart**: live GPS + live camera photo; server time window + geofence check |

**Django Admin** (`/admin/`): superuser se bhi companies / users manage + same email logic.

---

## 5) Important files (map)

| Area | Path |
|------|------|
| Next API proxy | `frontend/app/api/[[...path]]/route.ts` |
| Browser fetch helper | `frontend/lib/api.ts` |
| Media rewrite | `frontend/next.config.ts` → `/media` → Django |
| Django URLs | `backend/config/urls.py` |
| Auth + APIs | `backend/attendance/views.py` |
| JWT + mail + password | `backend/attendance/utils.py` |
| DB models | `backend/attendance/models.py` |
| Geo / time rules | `backend/attendance/geo.py`, `backend/attendance/time_rules.py` |
| Admin UI | `backend/attendance/admin.py` |
| Seed super admin | `backend/attendance/management/commands/seed_super_admin.py` |

---

## 6) Short troubleshooting

| Problem | Check |
|---------|--------|
| Login 401 | Same DB? `seed_super_admin` chala? `DEBUG` true par `debug_hint` dekho. |
| Cookie / 401 after login | `BACKEND_URL` sahi port? Frontend restart? `apiFetch` use ho raha? |
| Email nahi aata | `.env` SMTP; response me `emailWarning`; Gmail App Password + 2FA. |
| Attendance reject | Company ke office lat/lng + radius + shift time vs user ki live location/time. |

---

End. Agar tum chaho to agla step: production ke liye `BACKEND_URL` + HTTPS + cookie `Secure` flags alag se tighten karna.
