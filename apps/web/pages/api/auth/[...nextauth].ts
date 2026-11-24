import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

import { getOptions } from "@calcom/features/auth/lib/next-auth-options";
import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import { getTrackingFromCookies } from "@calcom/lib/tracking";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  const options = getOptions({
    getDubId: () => req.cookies.dub_id || req.cookies.dclid,
    getTrackingData: () => getTrackingFromCookies(req.cookies, req.query),
  });

  return NextAuth(req, res, {
    ...options,
    events: {
      ...options.events,
      async signIn(message) {
        await options.events?.signIn?.(message);
        void sendPendoTrackEvent({
          event: "Signed in",
          visitorId: message.user.id,
          accountId: message.user.org?.id,
          properties: {
            provider: message.account?.provider ?? "unknown",
            is_new_user: message.isNewUser ?? false,
          },
        });
      },
    },
  });
};

export default handler;
