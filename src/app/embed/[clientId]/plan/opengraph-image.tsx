import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Plan de Trabajo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CLIENT_NAMES: Record<string, string> = {
  "client-cygnuss": "CYGNUSS",
  "client-dentilandia": "Dentilandia",
  "client-acautos": "AC Autos",
  "client-paulina": "Paulina Zarrabe",
  c5: "Lativo",
};

export default function Image({ params }: { params: { clientId: string } }) {
  const name = CLIENT_NAMES[params.clientId] || "Cliente";
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #0D7C5F 0%, #065043 100%)",
          padding: "80px",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            opacity: 0.85,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Estrategia en Acción · Plan en vivo
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 32,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 400,
            opacity: 0.9,
            lineHeight: 1.3,
          }}
        >
          Plan de Trabajo · Avance por módulo
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            opacity: 0.7,
            marginTop: 48,
          }}
        >
          Haz clic para ver el estado actualizado en la app
        </div>
      </div>
    ),
    { ...size }
  );
}
