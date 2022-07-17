import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { sessionMiddleware } from "../middleware/session.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<any>,
) {
  return await sessionMiddleware(req, ctx);
}
