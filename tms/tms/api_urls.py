from django.urls import path

from rest_framework.routers import DefaultRouter

from accounts.views import (
    AuditLogViewSet,
    AvailableManagerUserListView,
    AvailableTrainerUserListView,
    ManagerViewSet,
)
from batch.views import BatchViewSet, CourseViewSet
from labs.views import LabViewSet
from results.views import ResultViewSet
from trainers.views import TrainerViewSet

router = DefaultRouter()
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("courses", CourseViewSet, basename="course")
router.register("batches", BatchViewSet, basename="batch")
router.register("labs", LabViewSet, basename="lab")
router.register("trainers", TrainerViewSet, basename="trainer")
router.register("managers", ManagerViewSet, basename="manager")
router.register("results", ResultViewSet, basename="result")

urlpatterns = router.urls + [
    path("trainer-users/", AvailableTrainerUserListView.as_view(), name="trainer-users"),
    path("manager-users/", AvailableManagerUserListView.as_view(), name="manager-users"),
]
