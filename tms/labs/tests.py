from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from batch.models import Batch, Course

from .models import Lab


User = get_user_model()


class LabOrderingAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123",
            role="ADMIN",
            is_approved=True,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.course = Course.objects.create(
            name="Software Testing",
            certification="ISTQB",
        )
        self.batch_a = Batch.objects.create(
            name="Batch A",
            course=self.course,
            start_date="2026-04-01",
            end_date="2026-06-30",
        )
        self.batch_b = Batch.objects.create(
            name="Batch B",
            course=self.course,
            start_date="2026-04-01",
            end_date="2026-06-30",
        )

    def test_labs_list_is_sorted_by_batch_then_created_at(self):
        newest_in_batch_a = Lab.objects.create(name="Lab 2", batch=self.batch_a)
        oldest_in_batch_a = Lab.objects.create(name="Lab 1", batch=self.batch_a)
        batch_b_lab = Lab.objects.create(name="Lab 3", batch=self.batch_b)

        Lab.objects.filter(pk=oldest_in_batch_a.pk).update(
            created_at=timezone.now() - timedelta(days=1)
        )
        Lab.objects.filter(pk=newest_in_batch_a.pk).update(created_at=timezone.now())
        Lab.objects.filter(pk=batch_b_lab.pk).update(created_at=timezone.now() - timedelta(days=2))

        response = self.client.get(reverse("lab-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [lab["id"] for lab in response.data],
            [oldest_in_batch_a.id, newest_in_batch_a.id, batch_b_lab.id],
        )
