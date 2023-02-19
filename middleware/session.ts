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
    const expiresAt = new Date();
    // TODO: make expiry configurable
    expiresAt.setDate(expiresAt.getDate() + 30);
    sessionsRepository.create({
      id,
      data: JSON.stringify({}),
      expiresAt: expiresAt.toISOString(),
    });
    return new Session(id);
  }

  static getSession(id: string): Session | undefined {
    return new Session(id);
  }

  get(key: string): unknown {
    return JSON.parse(sessionsRepository.get(this.id)!.data)[key];
  }

  set(key: string, value: unknown) {
    const existingSession = sessionsRepository.get(this.id)!;
    const data = JSON.parse(existingSession!.data) as Record<
      string,
      unknown
    >;
    data[key] = value;
    sessionsRepository.updateSession({
      ...existingSession,
      data: JSON.stringify(data),
    });
  }

  isExpired(): boolean {
    const session = sessionsRepository.get(this.id);
    if (!session) {
      return true;
    }

    // if no expiresAt is set, or it's empty, fall back to an old date, thats expired for sure
    const expiresAt = new Date(session.expiresAt || "1990-01-01");
    return expiresAt > new Date();
  }

  getExpiresAt(): Date {
    const session = sessionsRepository.get(this.id);
    console.log("session", session);
    const expiresAt = new Date(session?.expiresAt || "1990-01-01");
    return expiresAt;
  }
}

function ensureSession(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  const { sid } = getCookies(req.headers);

  if (sid && Session.sessionExists(sid)) {
    const existingSession = Session.getSession(sid)!;
    if (existingSession.isExpired()) {
      ctx.state.session = existingSession;
      return;
    }
  }

  const newSession = Session.createSession();
  ctx.state.session = newSession;

  return newSession.id;
}

export async function sessionMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<MiddlewareState>,
) {
  const newSid = ensureSession(req, ctx);

  const res = await ctx.next();

  if (newSid) {
    try { // we can't set the headers on redirects.
      console.log("setCookie!");
      setCookie(res.headers, {
        name: "sid",
        value: newSid,
        path: "/",
        httpOnly: true,
        expires: ctx.state.session.getExpiresAt(),
      });
    } catch (e) {
      console.log(e, req);
    }
  }
  return res;
}
