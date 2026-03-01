export const logger = {
  info: (msg: string, ...args: unknown[]) => console.log("[INFO]", msg, ...args),
  error: (msg: string, ...args: unknown[]) => console.error("[ERROR]", msg, ...args),
};
