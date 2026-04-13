from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from batch.models import Batch, Course
from labs.models import Lab
from trainers.models import Trainer


User = get_user_model()


class TrainerAssignmentAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123",
            role="ADMIN",
            is_approved=True,
            is_staff=True,
            is_superuser=False,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.course = Course.objects.create(
            name="Software Testing",
            certification="ISTQB",
        )
        self.batch = Batch.objects.create(
            name="Batch A",
            course=self.course,
            start_date="2026-04-01",
            end_date="2026-06-30",
        )

        self.trainer_user = User.objects.create_user(
            username="trainer1",
            email="trainer1@example.com",
            password="password123",
            role="TRAINER",
            is_approved=True,
        )

        self.lab = Lab.objects.create(
            name="Lab 101",
            batch=self.batch,
        )

    def test_post_assigns_trainer_and_optional_lab(self):
        response = self.client.post(
            reverse("trainer-list"),
            {
                "trainer_id": self.trainer_user.id,
                "batch_id": self.batch.id,
                "lab_id": self.lab.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Trainer assigned successfully.")
        self.assertEqual(response.data["data"]["user"], self.trainer_user.id)
        self.assertEqual(response.data["data"]["batch"], self.batch.id)
        self.assertEqual(response.data["data"]["current_lab_id"], self.lab.id)
        self.assertEqual(response.data["data"]["assigned_lab_names"], ["Lab 101"])

        trainer = Trainer.objects.get(user=self.trainer_user)
        self.assertEqual(trainer.batch_id, self.batch.id)
        self.assertEqual(list(trainer.labs.values_list("name", flat=True)), ["Lab 101"])

    def test_put_updates_existing_assignment(self):
        trainer = Trainer.objects.create(user=self.trainer_user, batch=self.batch)
        new_lab = Lab.objects.create(
            name="Lab 102",
            batch=self.batch,
        )

        response = self.client.put(
            reverse("trainer-detail", args=[trainer.id]),
            {
                "trainer_id": self.trainer_user.id,
                "batch_id": self.batch.id,
                "lab_id": new_lab.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Trainer assignment updated successfully.")
        self.assertEqual(response.data["data"]["current_lab_id"], new_lab.id)
        self.assertEqual(response.data["data"]["assigned_lab_names"], ["Lab 102"])

        trainer.refresh_from_db()
        self.assertEqual(list(trainer.labs.values_list("name", flat=True)), ["Lab 102"])

    def test_rejects_lab_from_different_batch(self):
        other_course = Course.objects.create(
            name="Cloud Basics",
            certification="AWS",
        )
        other_batch = Batch.objects.create(
            name="Batch B",
            course=other_course,
            start_date="2026-04-01",
            end_date="2026-06-30",
        )
        other_lab = Lab.objects.create(
            name="Lab 202",
            batch=other_batch,
        )

        response = self.client.post(
            reverse("trainer-list"),
            {
                "trainer_id": self.trainer_user.id,
                "batch_id": self.batch.id,
                "lab_id": other_lab.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lab", response.data)
        self.assertEqual(
            response.data["lab"][0],
            "Assigned lab must belong to the same batch as the trainer.",
        )

    def test_rejects_assignment_for_unavailable_trainer(self):
        Trainer.objects.create(user=self.trainer_user, is_available=False)

        response = self.client.post(
            reverse("trainer-list"),
            {
                "trainer_id": self.trainer_user.id,
                "batch_id": self.batch.id,
                "lab_id": self.lab.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["user"][0],
            "Trainer is not marked as available for a new batch.",
        )
