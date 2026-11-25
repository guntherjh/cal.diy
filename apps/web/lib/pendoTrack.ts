type PendoTrackProperties = Record<string, string | number | boolean | null | undefined>;

type PendoAgent = {
  track?: (event: string, properties?: PendoTrackProperties) => void;
};

/**
 * Sends a Track Event through the Pendo agent in the browser.
 * It's a no-op when the agent isn't loaded, so tracking never affects the user flow.
 */
export function trackPendoEvent(event: string, properties?: PendoTrackProperties): void {
  if (typeof window === "undefined") return;
  const pendo = (window as Window & { pendo?: PendoAgent }).pendo;
  if (typeof pendo?.track !== "function") return;
  try {
    pendo.track(event, properties);
  } catch (trackError) {
    console.warn("Pendo track call failed", trackError);
  }
}
