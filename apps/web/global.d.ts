type PendoMetadataValue = string | number | boolean | null | undefined;

interface PendoIdentity {
  visitor: { id: string | number } & Record<string, PendoMetadataValue>;
  account?: { id: string | number } & Record<string, PendoMetadataValue>;
}

interface PendoLocationTransform {
  attr: "search" | "hash" | "pathname" | "hostname" | "href" | "protocol";
  action: "AllowOnlyKeys" | "ExcludeKeys" | "AddTo" | "Replace" | "Clear" | "ForceSecure";
  data?: unknown;
}

interface PendoAgent {
  initialize: (options: PendoIdentity & { location?: { transforms: PendoLocationTransform[] } }) => void;
  identify: (options: PendoIdentity) => void;
  // The install snippet only stubs initialize/identify/updateOptions/pageLoad/track/trackAgent,
  // so clearSession is missing until the agent script has finished loading.
  clearSession?: () => void;
}

declare var pendo: PendoAgent | undefined;
