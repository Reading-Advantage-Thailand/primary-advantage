# Permission System Guide

This guide explains how to implement and use the permission-based navigation locking system in the Primary Advantage platform.

## Overview

The permission system allows you to control access to navigation items based on user roles and permissions. Items can be:

- **Locked**: Shown with a lock icon and disabled interaction
- **Hidden**: Completely hidden from the navigation
- **Accessible**: Normal functionality for users with proper permissions

## Quick Start

### 1. Basic Usage in Navigation Config

```typescript
// configs/admin-page-config.ts
export const adminPageConfig: PageConfig = {
  sidebarNav: [
    {
      title: "dashboard",
      href: "/admin/dashboard",
      icon: "LayoutDashboardIcon",
      requiredPermissions: ["ADMIN_ACCESS"], // User needs admin access
      items: [
        {
          title: "teachers",
          href: "/admin/dashboard/teachers",
          icon: "ChevronRightIcon",
          requiredPermissions: ["USER_MANAGEMENT"], // More specific permission
        },
        {
          title: "systemOnly",
          href: "/admin/system-settings",
          icon: "SettingsIcon",
          requiredPermissions: ["SYSTEM_ACCESS"],
          hideWhenNoPermission: true, // Hide completely instead of showing lock
        },
      ],
    },
  ],
};
```

### 2. Using Permission Hooks in Components

```typescript
import { usePermissions, PermissionGuard } from "@/hooks/use-permissions";

function MyComponent() {
  const { canManageUsers, hasPermission, isAdmin } = usePermissions();

  return (
    <div>
      {/* Simple permission check */}
      {canManageUsers() && (
        <button>Add User</button>
      )}

      {/* Using PermissionGuard component */}
      <PermissionGuard permissions={["ARTICLE_CREATION"]}>
        <button>Create Article</button>
      </PermissionGuard>

      {/* Multiple permissions (user needs ANY) */}
      <PermissionGuard permissions={["ADMIN_ACCESS", "SYSTEM_ACCESS"]}>
        <AdminPanel />
      </PermissionGuard>

      {/* Require ALL permissions */}
      <PermissionGuard
        permissions={["ADMIN_ACCESS", "USER_MANAGEMENT"]}
        requireAll={true}
      >
        <SuperAdminFeature />
      </PermissionGuard>

      {/* Show fallback when no permission */}
      <PermissionGuard
        permissions={["REPORTS_ACCESS"]}
        hideWhenNoPermission={false}
        fallback={<div>You need reports access to view this.</div>}
      >
        <ReportsChart />
      </PermissionGuard>
    </div>
  );
}
```

## Available Permissions

| Permission            | Description                      | Allowed Roles                        |
| --------------------- | -------------------------------- | ------------------------------------ |
| `STUDENT_ACCESS`      | Basic student functionality      | Student, Teacher, Admin, System      |
| `TEACHER_ACCESS`      | Teacher dashboard and features   | Teacher, Admin, System               |
| `ADMIN_ACCESS`        | School administration            | Admin, System, School Admin          |
| `SYSTEM_ACCESS`       | System-wide administration       | System only                          |
| `SCHOOL_ADMIN_ACCESS` | School admin privileges          | Admin, System, School Admin          |
| `ARTICLE_CREATION`    | Create and manage articles       | Admin, System, School Admin          |
| `USER_MANAGEMENT`     | Manage users (teachers/students) | Admin, System, School Admin          |
| `IMPORT_DATA`         | Import data functionality        | Admin, System, School Admin          |
| `REPORTS_ACCESS`      | View reports and analytics       | Teacher, Admin, System, School Admin |
| `CLASS_MANAGEMENT`    | Manage classrooms                | Teacher, Admin, System, School Admin |

## Configuration Options

### Navigation Item Properties

```typescript
interface SidebarNavItem {
  title: string;
  href?: string;
  icon?: string;
  disabled?: boolean;

  // Permission properties
  requiredPermissions?: Permission[]; // User needs ANY of these permissions
  hideWhenNoPermission?: boolean; // Hide completely (default: false, shows lock)

  items?: NavLink[]; // Child items
}
```

### Permission Checking Functions

```typescript
import { hasPermission, hasAnyPermission } from "@/lib/permissions";

// Check single permission
const canAccess = hasPermission(user, "ADMIN_ACCESS");

// Check multiple permissions (user needs ANY)
const canManage = hasAnyPermission(user, ["ADMIN_ACCESS", "TEACHER_ACCESS"]);

// Check multiple permissions (user needs ALL)
const hasFullAccess = hasAllPermissions(user, [
  "ADMIN_ACCESS",
  "USER_MANAGEMENT",
]);
```

## Visual Indicators

### Locked Items

- Show lock icon instead of regular icon
- Disabled appearance (opacity reduced)
- Tooltip explaining lack of permission
- Click events prevented

### Hidden Items

- Completely removed from navigation
- No visual indication of existence
- Use `hideWhenNoPermission: true`

## Role Hierarchy

The system uses a role hierarchy where higher roles inherit lower role permissions:

1. **Student** (Level 1): Basic access
2. **Teacher** (Level 2): Student access + teaching features
3. **Admin** (Level 3): Teacher access + school administration
4. **System** (Level 4): Full platform access

**School Admins** have special privileges equivalent to Admin level for their school.

## Best Practices

### 1. Granular Permissions

Use specific permissions rather than broad role checks:

```typescript
// Good - specific permission
requiredPermissions: ["USER_MANAGEMENT"];

// Less ideal - broad role check
requiredPermissions: ["ADMIN_ACCESS"];
```

### 2. Consistent Permission Names

Follow the naming convention: `FEATURE_ACTION` (e.g., `ARTICLE_CREATION`, `USER_MANAGEMENT`)

### 3. Fallback Handling

Always consider what happens when users don't have permission:

```typescript
// Option 1: Hide completely
hideWhenNoPermission: true

// Option 2: Show locked with tooltip (default)
hideWhenNoPermission: false

// Option 3: Custom fallback component
<PermissionGuard
  permissions={["ADMIN_ACCESS"]}
  fallback={<div>Contact admin for access</div>}
>
  <AdminFeature />
</PermissionGuard>
```

### 4. Performance Considerations

- Permission checks are lightweight but avoid excessive nesting
- Use the `usePermissions` hook for repeated checks in the same component
- Consider memoization for complex permission calculations

## Examples

### Example 1: Teacher Dashboard with Mixed Permissions

```typescript
export const teacherPageConfig: PageConfig = {
  sidebarNav: [
    {
      title: "myClasses",
      href: "/teacher/my-classes",
      icon: "SchoolIcon",
      requiredPermissions: ["CLASS_MANAGEMENT"],
    },
    {
      title: "reports",
      icon: "ChartColumnBigIcon",
      requiredPermissions: ["REPORTS_ACCESS"],
      items: [
        {
          title: "Overview Reports",
          href: "/teacher/reports",
          icon: "ChartColumnBigIcon",
          requiredPermissions: ["REPORTS_ACCESS"],
        },
        {
          title: "Advanced Analytics",
          href: "/teacher/reports/advanced",
          icon: "BarChartIcon",
          requiredPermissions: ["ADMIN_ACCESS"], // Only admins see this
          hideWhenNoPermission: true,
        },
      ],
    },
  ],
};
```

### Example 2: Component with Permission Guards

```typescript
function UserManagement() {
  const { canManageUsers, isSystem } = usePermissions();

  return (
    <div className="space-y-4">
      <h1>User Management</h1>

      {/* Basic permission check */}
      {canManageUsers() && (
        <div className="flex gap-2">
          <button>Add Teacher</button>
          <button>Add Student</button>
        </div>
      )}

      {/* System-only features */}
      <PermissionGuard permissions={["SYSTEM_ACCESS"]}>
        <div className="border-red-200 border p-4">
          <h2>System Administration</h2>
          <button className="bg-red-500 text-white">Delete All Data</button>
        </div>
      </PermissionGuard>

      {/* Conditional rendering with fallback */}
      <PermissionGuard
        permissions={["USER_MANAGEMENT"]}
        fallback={
          <div className="text-gray-500">
            You need user management permissions to access this feature.
          </div>
        }
      >
        <UserTable />
      </PermissionGuard>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Permissions not working**: Check that the user's session includes the correct role information
2. **Items always locked**: Verify permission names match exactly between config and permission definitions
3. **TypeScript errors**: Ensure you're importing types correctly: `import type { Permission } from "@/lib/permissions"`

### Debugging

```typescript
import { getEffectiveRole } from "@/lib/permissions";

function DebugPermissions() {
  const { currentUser, getEffectiveRole } = usePermissions();

  console.log("Current user:", currentUser);
  console.log("Effective role:", getEffectiveRole());

  return (
    <div>
      <p>User: {currentUser?.email}</p>
      <p>Role: {getEffectiveRole()}</p>
    </div>
  );
}
```

This permission system provides flexible, role-based access control while maintaining a good user experience through clear visual indicators and helpful tooltips.
