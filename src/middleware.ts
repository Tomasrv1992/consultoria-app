import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye: rutas de Next.js, assets estáticos, Y endpoints de Netlify
    // Functions (que NO deben pasar por auth de Supabase — son llamadas
    // internas del cron / smoke tests con secret).
    "/((?!api|_next/static|_next/image|favicon.ico|\\.netlify|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
