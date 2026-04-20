import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getInvestigations } from "../services/investigationService";

export async function getInvestigationsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("getInvestigations invoked");

  try {
    const pageSizeResult = parsePageSize(request.query.get("pageSize"));
    if (pageSizeResult instanceof Error) {
      return badRequest(pageSizeResult.message);
    }

    // continuationToken is only relevant when pageSize is also provided.
    const rawToken = request.query.get("continuationToken");
    const continuationToken =
      rawToken && pageSizeResult !== undefined
        ? decodeURIComponent(rawToken)
        : undefined;

    const status = request.query.get("status") ?? undefined;

    const result = await getInvestigations({
      pageSize: pageSizeResult,
      continuationToken,
      status,
    });

    // URL-encode the outbound token so it is safe to embed in a query string.
    const responseBody = {
      ...result,
      ...(result.nextContinuationToken
        ? { nextContinuationToken: encodeURIComponent(result.nextContinuationToken) }
        : {}),
    };

    return { status: 200, jsonBody: responseBody };
  } catch (err) {
    context.error("getInvestigations error", err);
    return { status: 500, jsonBody: { error: "Internal server error" } };
  }
}

/**
 * Returns undefined when the param is absent (fetch-all mode),
 * a positive integer when present and valid, or an Error for bad input.
 */
function parsePageSize(raw: string | null): number | undefined | Error {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return new Error("pageSize must be a positive integer");
  }
  return n;
}

function badRequest(message: string): HttpResponseInit {
  return { status: 400, jsonBody: { error: message } };
}

app.http("getInvestigations", {
  methods: ["GET"],
  authLevel: "function",
  route: "investigations",
  handler: getInvestigationsHandler,
});
