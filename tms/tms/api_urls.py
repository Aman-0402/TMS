from rest_framework.routers import DefaultRouter

from batch.views import BatchViewSet
from labs.views import LabViewSet
from results.views import ResultViewSet

router = DefaultRouter()
router.register("batches", BatchViewSet, basename="batch")
router.register("labs", LabViewSet, basename="lab")
router.register("results", ResultViewSet, basename="result")

urlpatterns = router.urls
