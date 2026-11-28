type PendoMetadataValue = string | number | boolean | null | undefined;

type PendoMetadata = { id: string | number } & Record<string, PendoMetadataValue>;

type PendoIdentity = {
  visitor: PendoMetadata;
  account?: PendoMetadata;
};

type PendoLocationTransform = {
  attr: "search" | "hash" | "pathname" | "hostname" | "href" | "protocol";
  action: "AllowOnlyKeys" | "ExcludeKeys" | "AddTo" | "Replace" | "Clear" | "ForceSecure";
  data?: string | string[] | ((value: string, url: URL) => string | string[]);
};

type PendoInitializeOptions = PendoIdentity & {
  location?: { transforms: PendoLocationTransform[] };
  events?: { ready?: () => void };
};

type PendoAgent = {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (identity: PendoIdentity) => void;
  // Not stubbed by the install snippet, so these exist only once the agent script has loaded.
  clearSession?: () => void;
  isAnonymousVisitor?: () => boolean;
};

declare var pendo: PendoAgent | undefined;
