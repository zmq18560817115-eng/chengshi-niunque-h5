"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

export function GuideExperience() {
  const router = useRouter();
  useVisualViewportHeight();

  useEffect(() => {
    router.prefetch("/reports");
  }, [router]);

  return <BrandGuide/>;
}
