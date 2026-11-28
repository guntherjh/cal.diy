type PendoMetadataValue = string | number | boolean | null | undefined;

type PendoEntity = { id: string } & Record<string, PendoMetadataValue>;

interface PendoAgent {
  initialize(options: Record<string, unknown>): void;
  identify(options: { visitor: PendoEntity; account?: PendoEntity }): void;
  // Only the queueing stub exists until the agent script loads, and the stub has no clearSession, isReady or isAnonymousVisitor.
  clearSession?: () => void;
  isReady?: () => boolean;
  isAnonymousVisitor?: () => boolean;
}

declare var pendo: PendoAgent | undefined;
