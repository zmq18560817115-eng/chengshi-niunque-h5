"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { archiveEntryMasterHeight, archiveEntryRibbon } from "@/components/h5/archive-entry-transition-visual";

const tabAsset = archiveEntryRibbon.src;
export const archiveUnlockWarmAssets = [tabAsset] as const;

// The complete ribbon is anchored to the document and moves with page scrolling.
// It never unfolds or sticks to the viewport.
export function ArchiveUnlockTabMotion({ preview = false }: { preview?: boolean; enabled?: boolean }) {
  const [ready, setReady] = useState(false);
  const style = {
    "--archive-ribbon-left": `${archiveEntryRibbon.left / 10}%`,
    "--archive-ribbon-top": `${archiveEntryRibbon.top / archiveEntryMasterHeight * 100}%`,
    "--archive-ribbon-width": `${archiveEntryRibbon.width / 10}%`,
    "--archive-ribbon-height": `${archiveEntryRibbon.height / archiveEntryMasterHeight * 100}%`,
  } as CSSProperties;
  return <div data-motion-module="archiveUnlockTab" className={`archive-unlock-tab-motion ${ready ? "is-ready" : ""}`} style={style} data-unlock-state="fixed" data-unlock-progress="1.000" data-unlock-ready={ready} data-preview={preview || undefined} aria-hidden="true">
    <div className="archive-unlock-tab-clip">
      <Image className="archive-unlock-tab-image" src={tabAsset} alt="" width={archiveEntryRibbon.width * 2} height={archiveEntryRibbon.height * 2} loading="eager" sizes="(max-width: 750px) 7.9vw, 59.25px" unoptimized onLoad={() => setReady(true)} />
    </div>
  </div>;
}
