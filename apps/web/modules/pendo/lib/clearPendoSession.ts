export function clearPendoSession(): void {
  // clearSession is not stubbed by the install snippet, so it is only callable once the agent has loaded.
  if (typeof pendo === "undefined" || typeof pendo.clearSession !== "function") return;
  pendo.clearSession();
}
