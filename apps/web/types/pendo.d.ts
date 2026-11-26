type PendoMetadataValue = string | number | boolean | string[] | null | undefined;

type PendoMetadata = Record<string, PendoMetadataValue>;

interface PendoIdentity {
  visitor: PendoMetadata & { id: string | number };
  account?: PendoMetadata & { id: string | number };
}

type PendoLocationTransform =
  | {
      attr: "search";
      action: "AllowOnlyKeys" | "ExcludeKeys";
      data: string[] | ((search: string, url: URL) => string[]);
    }
  | {
      attr: "pathname";
      action: "Replace";
      data: string | ((pathname: string, url: URL) => string);
    };

interface PendoInitializeOptions extends PendoIdentity {
  location?: { transforms: PendoLocationTransform[] };
  events?: { ready?: () => void };
}

interface Pendo {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (identity: PendoIdentity) => void;
  // The install snippet only stubs initialize and identify, so these exist once the agent script has loaded.
  clearSession?: () => void;
  isAnonymousVisitor?: () => boolean;
}

declare var pendo: Pendo | undefined;
