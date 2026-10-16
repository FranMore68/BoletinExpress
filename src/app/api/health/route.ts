// Liveness exclusivamente: no afirma que Supabase u otros proveedores estén disponibles.
export function GET() {
  return Response.json(
    { status: "ok", service: "boletinexpress-web", mode: "evaluation" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
