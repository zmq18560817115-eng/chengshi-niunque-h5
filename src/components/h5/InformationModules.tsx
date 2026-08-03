"use client";

import { useEffect, useState } from "react";
import type { PublicContent, PublicModule } from "@/server/services/public-content-service";
import { ModuleDetail } from "./ModuleDetail";

const moduleColors = ["var(--color-green)", "var(--color-yellow)", "var(--color-brown)"];

export function InformationModules() {
  const [modules, setModules] = useState<PublicModule[]>([]);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadContent() {
      try {
        const response = await fetch("/api/public/content", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Public content request failed");
        const content = (await response.json()) as PublicContent;
        setModules(content.modules);
        setOpenModuleId(content.modules[0]?.id ?? null);
        setState(content.modules.length > 0 ? "ready" : "empty");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setState("error");
      }
    }

    void loadContent();
    return () => controller.abort();
  }, []);

  if (state === "loading") {
    return <section className="section module-state" aria-live="polite">正在加载公开资料…</section>;
  }
  if (state === "error") {
    return <section className="section module-state" role="alert">公开资料暂时无法加载，请刷新后重试。</section>;
  }
  if (state === "empty") {
    return <section className="section module-state">暂无已发布资料。</section>;
  }

  return (
    <section data-component="InformationModules" aria-label="公开资料模块">
      {modules.map((module, index) => {
        const expanded = openModuleId === module.id;
        return (
          <article
            key={module.id}
            className="section information-module"
            style={{ background: moduleColors[index % moduleColors.length] }}
          >
            <button
              type="button"
              className="module-trigger"
              aria-expanded={expanded}
              aria-controls={`module-panel-${module.id}`}
              onClick={() => setOpenModuleId(expanded ? null : module.id)}
            >
              <span className="display module-title">{module.title}</span>
              <span aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            {module.description && <p className="module-description">{module.description}</p>}
            {expanded && <ModuleDetail module={module} />}
          </article>
        );
      })}
    </section>
  );
}
