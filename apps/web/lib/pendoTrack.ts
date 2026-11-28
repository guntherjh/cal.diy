type PendoTrackProperties = Record<string, string | number | boolean | null | undefined>;

type PendoAgent = {
  track: (event: string, properties?: PendoTrackProperties) => void;
};

/**
 * Sends a client-side Track Event through the Pendo agent when it's loaded on the page.
 * The agent attaches the current visitor and account, so they're never passed as properties.
 */
export function trackPendoEvent(event: string, properties?: PendoTrackProperties): void {
  if (typeof window === "undefined") return;
  const { pendo } = window as Window & { pendo?: PendoAgent };
  try {
    pendo?.track(event, properties);
  } catch (error) {
    console.error(`Pendo track call for "${event}" failed`, error);
  }
}
