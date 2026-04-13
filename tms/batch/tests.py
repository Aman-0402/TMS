from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from labs.models import Lab

from .models import Batch, Course


User = get_user_model()


class BatchCreationFlowTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123",
            role="ADMIN",
            is_approved=True,
        )
        self.client.force_authenticate(user=self.admin_user)
        self.course = Course.objects.create(name="Software Testing", certification="ISTQB")

    def test_create_batch_with_manual_lab_selection(self):
        response = self.client.post(
            reverse("batch-list"),
            {
                "name": "P06-B01",
                "course": self.course.id,
                "start_date": "2026-04-01",
                "end_date": "2026-06-30",
                "selected_labs": ["701"],
                "lab_range_input": "501-503",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batch = Batch.objects.get(name="P06-B01")
        self.assertEqual(
            list(batch.labs.order_by("name").values_list("name", flat=True)),
            ["501", "502", "503", "701"],
        )

    def test_create_batch_by_copying_previous_lab_structure(self):
        previous_batch = Batch.objects.create(
            name="P05-B09",
            course=self.course,
            start_date="2026-01-01",
            end_date="2026-03-31",
            created_by=self.admin_user,
        )
        Lab.objects.create(name="501", batch=previous_batch)
        Lab.objects.create(name="502", batch=previous_batch)

        response = self.client.post(
            reverse("batch-list"),
            {
                "name": "P06-B02",
                "course": self.course.id,
                "start_date": "2026-07-01",
                "end_date": "2026-09-30",
                "copy_labs_from_batch": previous_batch.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batch = Batch.objects.get(name="P06-B02")
        copied_labs = list(batch.labs.order_by("name").values_list("name", "trainer_id"))
        self.assertEqual(copied_labs, [("501", None), ("502", None)])
