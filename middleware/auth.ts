import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { SessionState } from "./session.ts";

export type AuthState = SessionState & {
  userId: string;
};

export async function authMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<AuthState>,
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
