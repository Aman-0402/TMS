from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("labs", "0004_lab_created_at_and_ordering"),
        ("attendance", "0003_alter_studentattendance_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentattendance",
            name="lab",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_records",
                to="labs.lab",
            ),
        ),
    ]
