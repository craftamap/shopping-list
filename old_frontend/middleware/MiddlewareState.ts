import { Session } from "./session.ts";

export interface MiddlewareState {
  session: Session;
  userId: string;
}
