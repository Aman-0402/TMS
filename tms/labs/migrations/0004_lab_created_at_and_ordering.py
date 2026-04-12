from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("labs", "0003_alter_lab_trainer"),
    ]

    operations = [
        migrations.AddField(
            model_name="lab",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                db_index=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name="lab",
            options={"ordering": ["batch__name", "created_at", "name", "id"]},
        ),
    ]
