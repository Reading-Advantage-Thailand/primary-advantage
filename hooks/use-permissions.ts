import React from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
  getEffectiveRole,
  type Permission,
} from "@/lib/permissions";

/**
 * Custom hook for permission checking in React components
 * Provides convenient access to permission utilities with current user context
 */
export function usePermissions() {
  const { user } = useCurrentUser();

  return {
    // Core permission checks
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) =>
      hasAllPermissions(user, permissions),
    canAccessRoute: (route: string) => canAccessRoute(user, route),

    // User info
    getEffectiveRole: () => getEffectiveRole(user),
    user,

    // Common permission checks for UI components
    canManageUsers: () => hasPermission(user, "USER_MANAGEMENT"),
    canCreateArticles: () => hasPermission(user, "ARTICLE_CREATION"),
    canImportData: () => hasPermission(user, "IMPORT_DATA"),
    canAccessReports: () => hasPermission(user, "REPORTS_ACCESS"),
    canManageClasses: () => hasPermission(user, "CLASS_MANAGEMENT"),

    // Role checks
    isStudent: () => hasPermission(user, "STUDENT_ACCESS"),
    isTeacher: () => hasPermission(user, "TEACHER_ACCESS"),
    isAdmin: () => hasPermission(user, "ADMIN_ACCESS"),
    isSystem: () => hasPermission(user, "SYSTEM_ACCESS"),
    isSchoolAdmin: () => hasPermission(user, "SCHOOL_ADMIN_ACCESS"),
  };
}

/**
 * Higher-order component for protecting components based on permissions
 * @param permissions - Required permissions (user needs ANY of these)
 * @param fallback - Component to render when no permission (default: null)
 * @param hideWhenNoPermission - Whether to hide completely (default: true)
 */
export function withPermissions<P extends object>(
  permissions: Permission[],
  fallback: React.ComponentType<P> | React.ReactElement | null = null,
  hideWhenNoPermission: boolean = true,
) {
  return function PermissionWrapper(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      const { hasAnyPermission } = usePermissions();

      const hasRequiredPermission = hasAnyPermission(permissions);

      if (!hasRequiredPermission) {
        if (hideWhenNoPermission) {
          return null;
        }

        if (fallback) {
          if (React.isValidElement(fallback)) {
            return fallback;
          }
          const FallbackComponent = fallback as React.ComponentType<P>;
          return React.createElement(FallbackComponent, props);
        }

        return null;
      }

      return React.createElement(Component, props);
    };
  };
}

/**
 * Component for conditionally rendering content based on permissions
 */
interface PermissionGuardProps {
  permissions: Permission[];
  requireAll?: boolean; // If true, user needs ALL permissions (default: false - needs ANY)
  fallback?: React.ReactNode;
  hideWhenNoPermission?: boolean;
  children: React.ReactNode;
}

export function PermissionGuard({
  permissions,
  requireAll = false,
  fallback = null,
  hideWhenNoPermission = true,
  children,
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasRequiredPermission = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasRequiredPermission) {
    if (hideWhenNoPermission) {
      return null;
    }
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
}
