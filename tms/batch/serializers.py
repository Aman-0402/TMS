from rest_framework import serializers

from .models import Batch, Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "certification")
        read_only_fields = ("id",)


class BatchSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    certification = serializers.CharField(source="course.certification", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Batch
        fields = (
            "id",
            "name",
            "course",
            "course_name",
            "certification",
            "start_date",
            "end_date",
            "created_by",
            "created_by_username",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_username", "created_at", "updated_at")

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be greater than or equal to start date."}
            )

        # Prevent duplicate: same name + same course (excluding the current instance on update)
        name = attrs.get("name", getattr(self.instance, "name", None))
        course = attrs.get("course", getattr(self.instance, "course", None))
        if name and course:
            qs = Batch.objects.filter(name__iexact=name.strip(), course=course, is_deleted=False)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": f"A batch named '{name}' already exists for this course."}
                )

        return attrs
