"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isRole, Role, roleHome } from "@/lib/rbac";

export const useRoleGuard = (allowedRoles: Role[]) => {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const allowed = Boolean(user && isRole(user.role) && allowedRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!allowed && user && isRole(user.role)) router.replace(roleHome[user.role]);
  }, [allowed, isLoading, isLoggedIn, router, user]);

  return { isLoading, isAllowed: !isLoading && isLoggedIn && allowed };
};