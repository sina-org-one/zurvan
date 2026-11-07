import { createFileRoute } from "@tanstack/react-router";

import { db } from "~/db/client.server";
import { authForHeaders } from "~/lib/auth.server";
import type { UserRole } from "~/lib/user-constants";
import { EVALUATION_VIDEO_MAX_BYTES } from "~/orpc/evaluation/constants";
import { uploadEvaluationVideo, VIDEO_MESSAGES } from "~/orpc/evaluation/service";
import { localeFromHeaders, runInLocale } from "~/orpc/locale";
import { m } from "~/paraglide/messages";

/*===== Evaluation Video Upload =====*/
// A server route. A video is too big for the RPC handler's in-memory JSON/multipart path and the
// form wants upload progress, so it has its own endpoint: `POST /api/evaluation-videos` with a multipart `file`. The
// response is the `EvaluationVideo` the evaluation request form then sends back by id.
//
// Its refusals are in the page's language. Paraglide leaves `/api/...` out of its detection (the route strategies in
// `project.inlang/paraglide.config.ts`), so the form names the language in the same `x-locale` header the oRPC client
// sends to `/rpc`, and the handler runs in it; without the header the answer is Persian.

/** The multipart envelope adds a little to the file, so the header limit leaves room for it. */
const BODY_SLACK_BYTES = 1024 * 1024;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function fileError(message: string, status: number) {
  return json({ errors: [], fields: { file: message } }, status);
}

export const Route = createFileRoute("/api/evaluation-videos")({
  server: {
    handlers: {
      // Only POST is accepted: a GET on the collection has nothing to show.
      GET: () => new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } }),
      POST: ({ request }) => runInLocale({ locale: localeFromHeaders(request.headers), run: () => upload(request) }),
    },
  },
});

async function upload(request: Request) {
  /*------ Who ------*/
  const session = await authForHeaders(request.headers).api.getSession({ headers: request.headers });
  if (!session || session.user.status === "blocked")
    return json({ errors: [m.server_evaluation_video_sign_in()], fields: {} }, 401);
  // Better-Auth types additional fields as optional, but the column is NOT NULL with a default.
  const role = session.user.role as UserRole;
  if (role !== "customer" && role !== "partner")
    return json({ errors: [m.server_evaluation_video_customers_only()], fields: {} }, 403);

  /*------ Size, Before Reading the Body ------*/
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > EVALUATION_VIDEO_MAX_BYTES + BODY_SLACK_BYTES) {
    return fileError(VIDEO_MESSAGES.tooBig(), 413);
  }

  /*------ File ------*/
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fileError(m.server_evaluation_video_resend(), 422);
  }
  if (!(file instanceof File)) return fileError(m.server_evaluation_video_choose(), 422);

  const result = await uploadEvaluationVideo({ db, user: { id: session.user.id, role }, file });
  if (result.kind === "forbidden") return json({ errors: [], fields: {} }, 403);
  if (result.kind === "invalid") return fileError(result.message, 422);

  return json(result.video, 201);
}
