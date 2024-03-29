import { Handlers, PageProps } from "$fresh/server.ts";
import Root from "../components/static/Root.tsx";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import { usersRepository } from "../db/index.ts";
import { verify } from "https://deno.land/x/scrypt/mod.ts";
import { MiddlewareState } from "../middleware/MiddlewareState.ts";

export const handler: Handlers<unknown, MiddlewareState> = {
  async POST(_req, ctx) {
    const formData = await _req.formData();
    const username = formData.get("username")?.valueOf()! as string;
    const password = formData.get("password")?.valueOf()! as string;
    const user = usersRepository.getByUsername(username);
    if (!user) {
      return Response.redirect(new URL("/login", _req.url));
    }
    const matches = verify(password, user?.passwordHash!);
    if (!matches) {
      console.log("password does not match!");
      return Response.redirect(new URL("/login", _req.url));
    }

    ctx.state.session.set("userId", user?.id);
    return Response.redirect(new URL("/", _req.url));
  },
};

export default function Greet(_props: PageProps) {
  return (
    <Root>
      <Header
        title={"Login"}
      />
      <Main>
        <form method="POST">
          <label class="block">
            <span>Username</span>
            <input
              class="border(b-1 gray-500) w-full"
              type="text"
              name="username"
              id="username"
              required
            />
          </label>
          <label class="block">
            <span>Password</span>
            <input
              class="border(b-1 gray-500) w-full"
              type="password"
              name="password"
              id="password"
              required
            />
          </label>
          <button type="submit">Login</button>
        </form>
      </Main>
    </Root>
  );
}
