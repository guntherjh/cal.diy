type PendoMetadataValue = string | number | boolean | string[];

type PendoMetadata = { id: string | number } & Record<string, PendoMetadataValue>;

type PendoLocationTransform =
  | {
      attr: "search";
      action: "AllowOnlyKeys" | "ExcludeKeys";
      data: string[] | ((search: string, url: URL) => string[]);
    }
  | {
      attr: "search" | "hash" | "pathname" | "hostname" | "href";
      action: "Replace";
      data: string | ((value: string, url: URL) => string);
    };

type PendoInitializeOptions = {
  visitor: { id: string | number } & Record<string, PendoMetadataValue>;
  account?: PendoMetadata;
  location?: { transforms: PendoLocationTransform[] };
  events?: { ready?: () => void };
};

type PendoIdentifyOptions = {
  visitor: PendoMetadata;
  account?: PendoMetadata;
};

interface PendoAgent {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (options: PendoIdentifyOptions) => void;
  // Not part of the install snippet's stub, so these exist only after the agent script has loaded.
  clearSession?: () => void;
  isAnonymousVisitor?: () => boolean;
}

declare var pendo: PendoAgent | undefined;
