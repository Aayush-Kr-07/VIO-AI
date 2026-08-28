const ROLES = Object.freeze({
  STUDENT: "student",
  MENTOR: "mentor",
  ADMINISTRATOR: "administrator",
});

const PERMISSIONS = Object.freeze({
  ACCESS_INTERVIEWS: "interviews:access",
  VIEW_OWN_REPORTS: "reports:own",
  ATTEMPT_CHALLENGES: "challenges:attempt",
  VIEW_OWN_PERFORMANCE: "performance:own",
  VIEW_STUDENT_PERFORMANCE: "performance:students",
  REVIEW_REPORTS: "reports:review",
  PROVIDE_FEEDBACK: "feedback:provide",
  ACCESS_MENTOR_FEATURES: "mentor:access",
  MANAGE_USERS: "users:manage",
  MANAGE_ACTIVITY: "activity:manage",
  MANAGE_SETTINGS: "settings:manage",
  MANAGE_ROLES: "roles:manage",
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.STUDENT]: [
    PERMISSIONS.ACCESS_INTERVIEWS,
    PERMISSIONS.VIEW_OWN_REPORTS,
    PERMISSIONS.ATTEMPT_CHALLENGES,
    PERMISSIONS.VIEW_OWN_PERFORMANCE,
  ],
  [ROLES.MENTOR]: [
    PERMISSIONS.VIEW_STUDENT_PERFORMANCE,
    PERMISSIONS.REVIEW_REPORTS,
    PERMISSIONS.PROVIDE_FEEDBACK,
    PERMISSIONS.ACCESS_MENTOR_FEATURES,
  ],
  [ROLES.ADMINISTRATOR]: Object.values(PERMISSIONS),
});

const isValidRole = (role) => Object.values(ROLES).includes(role);

const hasPermission = (role, permission) =>
  ROLE_PERMISSIONS[role]?.includes(permission) || false;

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, isValidRole, hasPermission };