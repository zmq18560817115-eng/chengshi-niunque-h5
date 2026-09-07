import Image from "next/image";
import { archiveRibbonBacking, getArchiveRibbonBackingStyles } from "./archive-entry-transition-visual";

/** Stationary original artwork underneath the single animated purple tab. */
export function ArchiveRibbonBacking() {
  const styles = getArchiveRibbonBackingStyles();
  return <div className="archive-ribbon-backing" style={styles.clip} aria-hidden="true">
    {styles.tiles.map((style, index) => <div key={index} className="archive-ribbon-backing-texture" style={style}/>)}
    <Image className="archive-ribbon-backing-strap" src={archiveRibbonBacking.strap.src} alt="" width={archiveRibbonBacking.strap.width} height={archiveRibbonBacking.strap.height} style={styles.strap} loading="eager" unoptimized/>
  </div>;
}
