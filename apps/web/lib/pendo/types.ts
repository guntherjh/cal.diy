declare global {
  interface Window {
    pendo?: PendoAgent;
  }
}

type PendoMetadataValue = string | number | boolean | null;

type PendoIdentity = {
  visitor: { id: string } & Record<string, PendoMetadataValue>;
  account?: { id: string } & Record<string, PendoMetadataValue>;
};

type PendoAgent = {
  initialize: (options: Record<string, unknown>) => void;
  identify: (identity: PendoIdentity) => void;
  // Only defined once the agent script has loaded, because the install snippet does not stub it.
  clearSession?: () => void;
};

export type { PendoAgent, PendoIdentity, PendoMetadataValue };
