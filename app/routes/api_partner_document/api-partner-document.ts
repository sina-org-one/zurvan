import { createFileRoute } from "@tanstack/react-router";

import { db } from "~/db/client.server";
import { authForHeaders } from "~/lib/auth.server";
import { getObject, partnerDocumentKey } from "~/lib/storage.server";
import { isUuid } from "~/lib/uuid";
import { isPartnerDocumentFormat, PARTNER_DOCUMENT_CONTENT_TYPES } from "~/orpc/partner_application/documents";
import { findDocument } from "~/orpc/partner_application/repository";

/*===== Partner Document =====*/
// A server route (docs/app-spec.md, F7, "Becoming a partner"). An applicant's papers are private: the media route never
// serves their prefix, so this is the only way to read one, and only the Admin may. Shown inline (a photo or a PDF in
// the browser's own viewer), never cached.

const NO_STORE = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/partner-documents/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) => read({ request, id: params.id }),
    },
  },
});

async function read({ request, id }: { request: Request; id: string }) {
  /*------ Who ------*/
  const session = await authForHeaders(request.headers).api.getSession({ headers: request.headers });
  if (!session || session.user.status === "blocked") {
    return new Response("Sign in to continue.", { status: 401, headers: NO_STORE });
  }
  // The same answer as a missing document, so nobody else learns which ids exist.
  if (session.user.role !== "admin") return new Response("Not found", { status: 404, headers: NO_STORE });

  /*------ The File ------*/
  if (!isUuid(id)) return new Response("Not found", { status: 404, headers: NO_STORE });
  const document = await findDocument({ db, id });
  if (!document || !isPartnerDocumentFormat(document.format)) {
    return new Response("Not found", { status: 404, headers: NO_STORE });
  }

  const stored = await getObject({ key: partnerDocumentKey({ documentId: document.id, format: document.format }) });
  if (!stored) return new Response("Not found", { status: 404, headers: NO_STORE });

  return new Response(stored.body, {
    headers: {
      ...NO_STORE,
      "Content-Type": PARTNER_DOCUMENT_CONTENT_TYPES[document.format],
      "Content-Length": String(stored.contentLength),
      "Content-Disposition": `inline; filename="document.${document.format}"`,
      // The bytes are what the type says (checked on upload); don't let the browser guess otherwise.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
