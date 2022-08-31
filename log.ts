import { IS_BROWSER } from "$fresh/runtime.ts";
import * as denoLog from "https://deno.land/std/log/mod.ts";

export default class Log {
  static {
    if (!IS_BROWSER) {
      denoLog.setup({
        handlers: {
          stringFmt: new denoLog.handlers.ConsoleHandler("DEBUG", {
            formatter(logRecord) {
              return `${logRecord.datetime.toISOString()} ${logRecord.levelName} ${logRecord.msg} ${
                logRecord.args.map((x) => JSON.stringify(x, null)).join(" ")
              }`;
            },
          }),
        },
        loggers: {
          default: {
            level: "DEBUG",
            handlers: ["stringFmt"],
          },
        },
      });
    }
  }

  static info(message: unknown, ...args: unknown[]) {
    if (IS_BROWSER) {
      console.info(message, ...args);
    } else {
      denoLog.info(message, ...args);
    }
  }

  static warn(message: unknown, ...args: unknown[]) {
    if (IS_BROWSER) {
      console.warn(message, ...args);
    } else {
      denoLog.warning(message, ...args);
    }
  }

  static error(message: unknown, ...args: unknown[]) {
    if (IS_BROWSER) {
      console.error(message, ...args);
    } else {
      denoLog.error(message, ...args);
    }
  }
}
