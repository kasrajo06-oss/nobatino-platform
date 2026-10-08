"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, get } from "./api";
import type { User } from "./types";

function hasSessionCookie() {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("has_session="));
}

export function useMe() {
  return useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      // the JWT cookies are httpOnly; a readable flag tells us whether asking the API makes sense
      if (!hasSessionCookie()) return null;
      try {
        return await get<User>("/me/");
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export function useInvalidateMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}
