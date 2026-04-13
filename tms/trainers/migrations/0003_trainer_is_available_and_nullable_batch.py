from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("batch", "0005_add_is_active_to_batch"),
        ("trainers", "0002_remove_trainer_unique_trainer_per_batch_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainer",
            name="is_available",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name="trainer",
            name="batch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="trainers",
                to="batch.batch",
            ),
        ),
    ]
