# Har User ki email globally unique — purane duplicate rows merge se pehle hata diye jate hain.

from django.db import migrations, models


def dedupe_users_by_email(apps, schema_editor):
    User = apps.get_model("attendance", "User")
    priority = {"SUPER_ADMIN": 0, "COMPANY_ADMIN": 1, "MEMBER": 2}
    groups = {}
    for u in User.objects.all().order_by("created_at"):
        key = (u.email or "").strip().lower()
        if not key:
            continue
        groups.setdefault(key, []).append(u)
    for _key, rows in groups.items():
        if len(rows) <= 1:
            continue
        keeper = min(rows, key=lambda u: (priority.get(u.role, 9), u.created_at))
        for u in rows:
            if u.pk != keeper.pk:
                User.objects.filter(pk=u.pk).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0003_alter_company_email_alter_user_email"),
    ]

    operations = [
        migrations.RunPython(dedupe_users_by_email, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254, unique=True),
        ),
    ]
