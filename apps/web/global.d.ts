type PendoMetadataValue = string | number | boolean | null;

interface PendoVisitor {
  id: string | number;
  [key: string]: PendoMetadataValue | undefined;
}

interface PendoAgent {
  identify: (options: { visitor: PendoVisitor }) => void;
  // Not part of the install snippet stub, so it exists only after the agent script has loaded.
  clearSession?: () => void;
}

// Undefined on pages that don't render the install snippet.
declare var pendo: PendoAgent | undefined;
