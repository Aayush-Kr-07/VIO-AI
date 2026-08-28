export type Role = "student" | "mentor" | "administrator";

export const roleHome: Record<Role, string> = {
  student: "/dashboard",
  mentor: "/mentor",
  administrator: "/admin",
};

export const roleLabel: Record<Role, string> = {
  student: "Student",
  mentor: "Mentor",
  administrator: "Administrator",
};

export const isRole = (value: string | undefined): value is Role =>
  value === "student" || value === "mentor" || value === "administrator";