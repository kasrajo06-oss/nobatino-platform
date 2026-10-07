from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    """Use as HasRole.of("doctor", "operator")."""

    roles: tuple[str, ...] = ()

    @classmethod
    def of(cls, *roles):
        return type(f"HasRole_{'_'.join(roles)}", (cls,), {"roles": roles})

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser or user.role == "superadmin":
            return True
        return user.role in self.roles


IsPatient = HasRole.of("patient", "doctor", "center_staff", "operator")  # every logged-in user can book
IsDoctor = HasRole.of("doctor")
IsCenterStaff = HasRole.of("center_staff")
IsOperator = HasRole.of("operator")
