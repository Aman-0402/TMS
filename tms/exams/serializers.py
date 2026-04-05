from rest_framework import serializers

from .models import Exam, ExamSlot, StudentExamSlot


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = ("id", "batch", "exam_date")
        read_only_fields = ("id",)


class ExamSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSlot
        fields = ("id", "exam", "start_time", "end_time", "lab")
        read_only_fields = ("id",)

    def validate(self, attrs):
        exam = attrs.get("exam", getattr(self.instance, "exam", None))
        lab = attrs.get("lab", getattr(self.instance, "lab", None))
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be later than start time."}
            )

        if exam and lab and lab.batch_id != exam.batch_id:
            raise serializers.ValidationError(
                {"lab": "Assigned lab must belong to the same batch as the exam."}
            )

        return attrs


class StudentExamSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentExamSlot
        fields = ("id", "student", "exam_slot")
        read_only_fields = ("id",)

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        exam_slot = attrs.get("exam_slot", getattr(self.instance, "exam_slot", None))

        if student and exam_slot and student.batch_id != exam_slot.exam.batch_id:
            raise serializers.ValidationError(
                {"student": "Assigned student must belong to the same batch as the exam."}
            )

        if student and exam_slot:
            duplicate_assignment = StudentExamSlot.objects.filter(
                student=student,
                exam_slot__exam=exam_slot.exam,
            )
            if self.instance:
                duplicate_assignment = duplicate_assignment.exclude(pk=self.instance.pk)

            if duplicate_assignment.exists():
                raise serializers.ValidationError(
                    {"student": "This student is already assigned to a slot for the selected exam."}
                )

        return attrs
