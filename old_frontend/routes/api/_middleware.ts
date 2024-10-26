import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { authMiddleware } from "../../middleware/auth.ts";
import { MiddlewareState } from "../../middleware/MiddlewareState.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  return await authMiddleware(req, ctx);
}
