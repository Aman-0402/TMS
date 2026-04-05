from rest_framework.routers import DefaultRouter

from batch.views import BatchViewSet
from labs.views import LabViewSet

router = DefaultRouter()
router.register("batches", BatchViewSet, basename="batch")
router.register("labs", LabViewSet, basename="lab")

urlpatterns = router.urls
