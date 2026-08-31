"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { syncHierarchyHistoryEntry } from "@/components/h5/hierarchy-navigation";

export function H5HierarchyTracker() {
  const pathname = usePathname();
  useLayoutEffect(() => syncHierarchyHistoryEntry(pathname), [pathname]);
  return null;
}
