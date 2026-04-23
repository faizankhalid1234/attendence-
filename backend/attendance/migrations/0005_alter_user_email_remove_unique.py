from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_user_email_unique_dedupe"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254),
        ),
    ]
