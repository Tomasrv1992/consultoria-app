import { notFound } from "next/navigation";
import { EmbedPlanClient } from "./EmbedPlanClient";

export const dynamic = "force-dynamic";

export default function EmbedPlanPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { token?: string };
}) {
  const expected = process.env.EMBED_SECRET;
  if (!expected || searchParams.token !== expected) {
    notFound();
  }
  return <EmbedPlanClient clientId={params.clientId} />;
}
