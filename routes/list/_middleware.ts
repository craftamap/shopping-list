import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { authMiddleware } from "../../middleware/auth.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<unknown>,
) {
  return await authMiddleware(req, ctx);
}
