type PendoMetadataValue = string | number | boolean | null;

type PendoMetadata = { id: string | number } & Record<string, PendoMetadataValue>;

type PendoIdentity = {
  visitor: PendoMetadata;
  account?: PendoMetadata;
};

interface PendoAgent {
  identify: (identity: PendoIdentity) => void;
  // Not stubbed by the install snippet, so it only exists once the agent script has loaded
  clearSession?: () => void;
}

interface Window {
  pendo?: PendoAgent;
}
