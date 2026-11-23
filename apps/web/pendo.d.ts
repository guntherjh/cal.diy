type PendoMetadataValue = string | number | boolean | null;

type PendoIdentity = {
  visitor: { id: string | number } & Record<string, PendoMetadataValue>;
  account?: { id: string | number } & Record<string, PendoMetadataValue>;
};

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

type PendoInitializeOptions = PendoIdentity & {
  location?: { transforms: PendoLocationTransform[] };
  events?: { ready?: () => void };
};

type PendoAgent = {
  initialize: (options: PendoInitializeOptions) => void;
  identify: (identity: PendoIdentity) => void;
  // Only defined once the agent script has loaded, the install snippet doesn't stub them
  clearSession?: () => void;
  getVisitorId?: () => string | number;
  isAnonymousVisitor?: (visitorId: string | number) => boolean;
};

declare var pendo: PendoAgent | undefined;
