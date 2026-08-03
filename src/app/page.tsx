import { HeroIntro } from "@/components/h5/HeroIntro";
import { EvidenceOverview } from "@/components/h5/EvidenceOverview";
import { InformationModules } from "@/components/h5/InformationModules";
import { BrandStory } from "@/components/h5/BrandStory";
import { PageFooter } from "@/components/h5/PageFooter";
export default function HomePage() { return <main className="h5-shell"><HeroIntro /><EvidenceOverview /><InformationModules /><BrandStory /><PageFooter /></main>; }
