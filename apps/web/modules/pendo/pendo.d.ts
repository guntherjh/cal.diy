type PendoMetadataValue = string | number | boolean | string[] | null | undefined;

interface PendoIdentity {
  visitor: { id: string } & Record<string, PendoMetadataValue>;
  account?: { id: string } & Record<string, PendoMetadataValue>;
}

interface PendoAgent {
  identify: (identity: PendoIdentity) => void;
  // Not part of the install snippet's stub, so it only exists once the agent script has loaded.
  clearSession?: () => void;
}

declare var pendo: PendoAgent | undefined;
