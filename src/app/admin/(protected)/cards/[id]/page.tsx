import { notFound, redirect } from "next/navigation";
import { AdminContentService } from "@/server/services/admin-content-service";

export default async function LegacyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await new AdminContentService().getCard(id);
  if (!card) notFound();
  redirect(`/admin/modules/${card.moduleId}`);
}
