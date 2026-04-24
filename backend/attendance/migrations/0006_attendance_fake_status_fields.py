from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0005_alter_user_email_remove_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendance",
            name="check_in_distance_meters",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendance",
            name="check_out_distance_meters",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendance",
            name="is_check_in_fake",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="attendance",
            name="is_check_out_fake",
            field=models.BooleanField(default=False),
        ),
    ]
