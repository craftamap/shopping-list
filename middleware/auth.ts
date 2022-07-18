import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { MiddlewareState } from "./MiddlewareState.ts";

export async function authMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  console.log(new URL(req.url).pathname);
  console.log("authState", ctx.state);
  const userId = ctx.state.session.get("userId");
  if (!userId) {
    return Response.redirect(new URL("/login", req.url));
  }
  console.log("userId", userId);
  return await ctx.next();
}
