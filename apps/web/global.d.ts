type PendoMetadataValue = string | number | boolean | null | undefined | string[];

type PendoMetadata = Record<string, PendoMetadataValue>;

interface PendoIdentity {
  visitor: PendoMetadata & { id: string | number };
  account?: PendoMetadata & { id: string | number };
}

type PendoLocationTransform =
  | {
      attr: "search";
      action: "AllowOnlyKeys" | "ExcludeKeys";
      data: string[] | ((search: string, url?: URL) => string[]);
    }
  | {
      attr: "search" | "hash" | "pathname" | "hostname" | "href";
      action: "Replace";
      data: string | ((value: string, url?: URL) => string);
    }
  | { attr: "search" | "hash" | "pathname"; action: "Clear" };

interface PendoInitializeOptions extends PendoIdentity {
  location?: { transforms: PendoLocationTransform[] };
  events?: { ready?: () => void };
}

interface PendoAgent {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (identity: PendoIdentity) => void;
  // Only the install snippet's stubs exist until the agent script finishes loading.
  clearSession?: () => void;
  isAnonymousVisitor?: () => boolean;
}

declare var pendo: PendoAgent | undefined;
