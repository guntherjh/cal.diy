const RETRY_INTERVAL_MS = 250;
const MAX_ATTEMPTS = 40;

// clearSession isn't stubbed by the install snippet, so on a cold page load we wait for the agent script
export function clearPendoSession(): () => void {
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const attempt = (): void => {
    const agent = window.pendo;
    if (typeof agent?.clearSession === "function") {
      agent.clearSession();
      return;
    }
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) {
      timer = setTimeout(attempt, RETRY_INTERVAL_MS);
    }
  };

  attempt();

  return (): void => clearTimeout(timer);
}
