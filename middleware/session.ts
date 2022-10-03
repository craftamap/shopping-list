import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { sessionsRepository } from "../db/index.ts";
import {
  getCookies,
  setCookie,
} from "https://deno.land/std@0.148.0/http/cookie.ts"; // TODO: move to import map
import { MiddlewareState } from "./MiddlewareState.ts";

// TODO: sessions should expire?
export class Session {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  static sessionExists(id: string): boolean {
    return sessionsRepository.exists(id);
  }

  static createSession(): Session {
    const id = crypto.randomUUID();
    sessionsRepository.create({ id, data: JSON.stringify({}) });
    return new Session(id);
  }

  static getSession(id: string): Session | undefined {
    return new Session(id);
  }

  get(key: string): unknown {
    return JSON.parse(sessionsRepository.get(this.id)!.data)[key];
  }

  set(key: string, value: unknown) {
    const data = JSON.parse(sessionsRepository.get(this.id)!.data) as Record<
      string,
      unknown
    >;
    data[key] = value;
    sessionsRepository.updateSession({
      id: this.id,
      data: JSON.stringify(data),
    });
  }
}

export async function sessionMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  const { sid } = getCookies(req.headers);
  console.log("sid", sid);
  let newSid;
  if (sid && Session.sessionExists(sid)) {
    ctx.state.session = Session.getSession(sid)!;
  } else {
    console.log("no sid");
    const newSession = Session.createSession();
    ctx.state.session = newSession;
    newSid = ctx.state.session.id;
    console.log("newSid", newSid);
  }
  const res = await ctx.next();
  if (newSid) {
    try { // we can't set the headers on redirects for some reason.
      setCookie(res.headers, {
        name: "sid",
        value: newSid,
        path: "/",
        httpOnly: true,
      });
    } catch (e) {
      console.log(e, req);
    }
  }
  return res;
}
