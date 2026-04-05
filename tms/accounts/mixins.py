class RoleScopedQuerysetMixin:
    manager_lookup = None
    trainer_lookup = None
    manager_distinct = False
    trainer_distinct = False

    def get_base_queryset(self):
        raise NotImplementedError("Subclasses must implement get_base_queryset().")

    def get_queryset(self):
        user = self.request.user
        queryset = self.get_base_queryset()
        role = getattr(user, "role", None)

        if role == "ADMIN":
            return queryset

        if role == "MANAGER" and self.manager_lookup:
            filtered_queryset = queryset.filter(**{self.manager_lookup: user})
            return filtered_queryset.distinct() if self.manager_distinct else filtered_queryset

        if role == "TRAINER" and self.trainer_lookup:
            filtered_queryset = queryset.filter(**{self.trainer_lookup: user})
            return filtered_queryset.distinct() if self.trainer_distinct else filtered_queryset

        return queryset.none()
