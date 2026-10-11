import { createFileRoute } from "@tanstack/react-router";
import { handleMobileApi } from "@/lib/mobile-api.server";

// REST endpoints for the React Native app (see mobile/). Bearer-token auth
// is handled inside handleMobileApi; the web UI never calls these.
export const Route = createFileRoute("/api/mobile/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleMobileApi(request, params._splat ?? ""),
      POST: ({ request, params }) => handleMobileApi(request, params._splat ?? ""),
      PATCH: ({ request, params }) => handleMobileApi(request, params._splat ?? ""),
      PUT: ({ request, params }) => handleMobileApi(request, params._splat ?? ""),
    },
  },
});
