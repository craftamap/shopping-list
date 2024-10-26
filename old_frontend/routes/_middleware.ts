import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { MiddlewareState } from "../middleware/MiddlewareState.ts";
import { sessionMiddleware } from "../middleware/session.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  return await sessionMiddleware(req, ctx);
}
