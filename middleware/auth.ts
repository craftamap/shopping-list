import { MiddlewareHandlerContext } from "$fresh/server.ts";
import Log from "../log.ts";
import { MiddlewareState } from "./MiddlewareState.ts";

export async function authMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  Log.info(new URL(req.url).pathname);
  Log.info("authState", ctx.state);
  const userId = ctx.state.session.get("userId");
  if (!userId) {
    return Response.redirect(new URL("/login", req.url));
  }
  Log.info("userId", userId);
  return await ctx.next();
}
