"use client";

import { useEffect, useState } from "react";
import type { PublicContent, PublicModule } from "@/server/services/public-content-service";
import { ModuleDetail } from "./ModuleDetail";
import type { H5PreviewFocus } from "./ReportViewer";

const moduleColors = ["var(--color-green)", "var(--color-yellow)", "var(--color-brown)"];

export function InformationModules({ initialModules, previewFocus, previewMode = false }: { initialModules?: PublicModule[]; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  const [modules, setModules] = useState<PublicModule[]>(initialModules ?? []);
  const [openModuleId, setOpenModuleId] = useState<string | null>(previewFocus?.moduleId ?? initialModules?.[0]?.id ?? null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">(initialModules ? (initialModules.length ? "ready" : "empty") : "loading");

  useEffect(() => {
    if (initialModules) { setModules(initialModules); setState(initialModules.length ? "ready" : "empty"); return; }
    const controller = new AbortController();
    void (async () => { try { const response = await fetch("/api/public/content", { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Public content request failed"); const content = await response.json() as PublicContent; setModules(content.modules); setOpenModuleId(content.modules[0]?.id ?? null); setState(content.modules.length ? "ready" : "empty"); } catch (error) { if ((error as Error).name !== "AbortError") setState("error"); } })();
    return () => controller.abort();
  }, [initialModules]);

  useEffect(() => { if (previewFocus?.moduleId) setOpenModuleId(previewFocus.moduleId); }, [previewFocus?.moduleId]);
  if (state === "loading") return <section className="section module-state" aria-live="polite">正在加载公开资料…</section>;
  if (state === "error") return <section className="section module-state" role="alert">公开资料暂时无法加载，请刷新后重试。</section>;
  if (state === "empty") return <section className="section module-state">暂无已发布资料。</section>;

  return <section data-component="InformationModules" aria-label="公开资料模块">{modules.map((module, index) => { const expanded = openModuleId === module.id; return <article key={module.id} className={`section information-module ${previewFocus?.moduleId === module.id ? "preview-module-focus" : ""}`} style={{ background: moduleColors[index % moduleColors.length] }}><button type="button" className="module-trigger" aria-expanded={expanded} aria-controls={`module-panel-${module.id}`} onClick={() => setOpenModuleId(expanded ? null : module.id)}><span className="display module-title">{module.title}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button>{module.description && <p className="module-description">{module.description}</p>}{expanded && <ModuleDetail module={module} previewFocus={previewFocus} previewMode={previewMode}/>}</article>; })}</section>;
}
