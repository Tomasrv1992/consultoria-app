import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedPlanClient } from "./EmbedPlanClient";
import { getEmbedSecret } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

const CLIENT_NAMES: Record<string, string> = {
  "client-cygnuss": "CYGNUSS",
  "client-dentilandia": "Dentilandia",
  "client-acautos": "AC Autos",
  "client-paulina": "Paulina Zarrabe",
  c5: "Lativo",
};

export function generateMetadata({
  params,
}: {
  params: { clientId: string };
}): Metadata {
  const name = CLIENT_NAMES[params.clientId] || "Cliente";
  const title = `${name} — Plan de Trabajo`;
  const description = `Plan y avance en vivo de ${name}. Se actualiza automáticamente cuando se completan tareas en la consultoría.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Estrategia en Acción · Plan en vivo",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function EmbedPlanPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { token?: string };
}) {
  const expected = getEmbedSecret();
  if (searchParams.token !== expected) {
    notFound();
  }
  return (
    <EmbedPlanClient clientId={params.clientId} token={searchParams.token} />
  );
}
