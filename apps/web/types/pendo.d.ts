type PendoMetadataValue = string | number | boolean | null | undefined;

type PendoMetadata = { id: string | number } & Record<string, PendoMetadataValue>;

interface PendoIdentifyOptions {
  visitor: PendoMetadata;
  account?: PendoMetadata;
}

type PendoLocationTransform =
  | {
      attr: "search";
      action: "AllowOnlyKeys" | "ExcludeKeys";
      data: string[] | ((search: string, url: URL) => string[]);
    }
  | {
      attr: "search" | "hash" | "pathname";
      action: "Replace";
      data: string | ((value: string, url: URL) => string);
    }
  | {
      attr: "search" | "hash" | "pathname";
      action: "Clear";
    };

interface PendoInitializeOptions {
  visitor: { id: string | number } & Record<string, PendoMetadataValue>;
  account?: PendoMetadata;
  location?: { transforms: PendoLocationTransform[] };
}

interface PendoAgent {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (options: PendoIdentifyOptions) => void;
  // Not stubbed by the install snippet, so it only exists once the agent script has loaded.
  clearSession?: () => void;
}

declare var pendo: PendoAgent | undefined;
