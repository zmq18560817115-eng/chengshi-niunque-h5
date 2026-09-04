import { GuideExperience } from "@/components/h5/GuideExperience";

// Keep the H5 entry HTML tied to the current deployment. Artwork and Next.js
// chunks retain their own cache policies, while a reopened WebView receives
// the latest route tree instead of a year-long cached shell.
export const dynamic = "force-dynamic";

export default function GoPage() {
  return <GuideExperience/>;
}
