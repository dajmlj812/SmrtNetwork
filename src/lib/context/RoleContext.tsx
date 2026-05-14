"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Role = "admin" | "readonly" | "none";

const RoleContext = createContext<Role>("none");

export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role {
  return useContext(RoleContext);
}

export function useIsAdmin(): boolean {
  const role = useContext(RoleContext);
  return role !== "readonly";
}
