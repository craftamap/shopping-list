import { MiddlewareHandlerContext } from "$fresh/server.ts";
import * as db from "../db/index.ts";
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
    return db.sessionExists(id);
  }

  static createSession(): Session {
    const id = crypto.randomUUID();
    const expiresAt = new Date();
    // TODO: dynamic timing
    expiresAt.setDate(expiresAt.getDate() + 1);
    db.createSession(id, JSON.stringify({}), expiresAt);
    return new Session(id);
  }

  static getSession(id: string): Session | undefined {
    return new Session(id);
  }

  get(key: string): unknown {
    return JSON.parse(db.getSessionById(this.id)!.data)[key];
  }

  set(key: string, value: unknown) {
    const data = JSON.parse(db.getSessionById(this.id)!.data) as Record<
      string,
      unknown
    >;
    data[key] = value;
    db.updateSession(this.id, JSON.stringify(data));
  }

  getExpiresAt(): Date | undefined {
    return new Date(db.getSessionExpiresAt(this.id)?.expiresAt || "1990");
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
    console.log(typeof ctx.state.session.getExpiresAt());
    if (ctx.state.session.getExpiresAt()! < new Date()) {
      console.log("session expired");
      const newSession = Session.createSession();
      ctx.state.session = newSession;
      newSid = ctx.state.session.id;
      console.log("newSid", newSid);
    }
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
        secure: true,
        expires: ctx.state.session.getExpiresAt(),
      });
    } catch (e) {
      console.log(e, req);
    }
  }
  return res;
}
