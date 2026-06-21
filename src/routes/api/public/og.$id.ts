import { createFileRoute } from "@tanstack/react-router";
import ogFallback from "@/assets/og-fallback.jpg.asset.json";

export const Route = createFileRoute("/api/public/og/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const fallbackUrl = new URL(ogFallback.url, request.url).toString();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin
            .from("gifts")
            .select("photo")
            .eq("id", params.id)
            .eq("paid", true)
            .maybeSingle();

          const photo = row?.photo;
          if (!photo || !photo.startsWith("data:")) {
            return Response.redirect(fallbackUrl, 302);
          }
          const match = photo.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) return Response.redirect(fallbackUrl, 302);
          const [, mime, b64] = match;
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": mime,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (e) {
          console.error("og image error", e);
          return Response.redirect(fallbackUrl, 302);
        }
      },
    },
  },
});
