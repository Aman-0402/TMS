from django.db import transaction
from rest_framework import serializers

from labs.models import Lab

from .models import Batch, Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "certification", "is_active")
        read_only_fields = ("id",)


class BatchSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    certification = serializers.CharField(source="course.certification", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    lab_count = serializers.IntegerField(read_only=True)
    copy_labs_from_batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.filter(is_deleted=False),
        write_only=True,
        required=False,
        allow_null=True,
    )
    selected_labs = serializers.ListField(
        child=serializers.CharField(max_length=255),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    lab_range_input = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

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
            "is_active",
            "created_at",
            "updated_at",
            "student_count",
            "lab_count",
            "copy_labs_from_batch",
            "selected_labs",
            "lab_range_input",
        )
        read_only_fields = ("id", "created_by", "created_by_username", "created_at", "updated_at")

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        copy_labs_from_batch = attrs.get("copy_labs_from_batch")
        selected_labs = attrs.get("selected_labs", [])
        lab_range_input = attrs.get("lab_range_input", "")

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

        if copy_labs_from_batch and self.instance and copy_labs_from_batch.pk == self.instance.pk:
            raise serializers.ValidationError(
                {"copy_labs_from_batch": "A batch cannot copy labs from itself."}
            )

        if copy_labs_from_batch and selected_labs:
            raise serializers.ValidationError(
                {"selected_labs": "Choose either copied labs or manually selected labs, not both."}
            )

        manual_labs = self._build_manual_lab_names(selected_labs, lab_range_input)
        attrs["_resolved_lab_names"] = manual_labs

        if not self.instance and not copy_labs_from_batch and not manual_labs:
            raise serializers.ValidationError(
                {
                    "selected_labs": (
                        "Provide lab names manually or choose a previous batch to copy from."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        copy_labs_from_batch = validated_data.pop("copy_labs_from_batch", None)
        validated_data.pop("selected_labs", None)
        validated_data.pop("lab_range_input", None)
        resolved_lab_names = validated_data.pop("_resolved_lab_names", [])

        with transaction.atomic():
            batch = Batch.objects.create(**validated_data)
            self._seed_labs(batch, copy_labs_from_batch, resolved_lab_names)
            return batch

    def update(self, instance, validated_data):
        validated_data.pop("copy_labs_from_batch", None)
        validated_data.pop("selected_labs", None)
        validated_data.pop("lab_range_input", None)
        validated_data.pop("_resolved_lab_names", None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()
        return instance

    def _seed_labs(self, batch, source_batch, resolved_lab_names):
        if source_batch:
            resolved_lab_names = list(
                source_batch.labs.order_by("created_at", "name", "id").values_list("name", flat=True)
            )

        if not resolved_lab_names:
            return

        Lab.objects.bulk_create(
            [Lab(name=lab_name, batch=batch) for lab_name in resolved_lab_names],
            batch_size=200,
        )

    def _build_manual_lab_names(self, selected_labs, lab_range_input):
        ordered_names = []
        seen = set()

        def add_name(value):
            name = str(value).strip()
            if not name:
                return

            normalized = name.lower()
            if normalized in seen:
                return

            seen.add(normalized)
            ordered_names.append(name)

        for lab_name in selected_labs or []:
            add_name(lab_name)

        for token in [part.strip() for part in (lab_range_input or "").split(",") if part.strip()]:
            if "-" in token:
                start_token, end_token = [part.strip() for part in token.split("-", 1)]
                if start_token.isdigit() and end_token.isdigit():
                    start_value = int(start_token)
                    end_value = int(end_token)
                    if end_value < start_value:
                        raise serializers.ValidationError(
                            {"lab_range_input": f"Invalid lab range '{token}'."}
                        )

                    width = max(len(start_token), len(end_token))
                    for number in range(start_value, end_value + 1):
                        add_name(str(number).zfill(width) if width > len(str(number)) else str(number))
                    continue

            add_name(token)

        return ordered_names
