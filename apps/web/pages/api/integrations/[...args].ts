import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { HttpError } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { trackPendoEvent } from "@calcom/lib/server/trackPendoEvent";
import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler, AppHandler } from "@calcom/types/AppHandler";

const defaultIntegrationAddHandler = async ({
  slug,
  supportsMultipleInstalls,
  appType,
  user,
  teamId = undefined,
  createCredential,
}: {
  slug: string;
  supportsMultipleInstalls: boolean;
  appType: string;
  user?: Session["user"];
  teamId?: number;
  createCredential: AppDeclarativeHandler["createCredential"];
}) => {
  if (!user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  if (!supportsMultipleInstalls) {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        appId: slug,
        ...(teamId ? { AND: [{ userId: user.id }, { teamId }] } : { userId: user.id }),
      },
    });
    if (alreadyInstalled) {
      throw new Error("App is already installed");
    }
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamId ?? null, userId: user.id });

  await createCredential({ user: user, appType, slug, teamId });
};

const INSTALL_ENDPOINTS = ["add", "callback"];

const getLatestCredentialId = async (): Promise<number | null> => {
  try {
    const { _max } = await prisma.credential.aggregate({ _max: { id: true } });
    return _max.id ?? 0;
  } catch (error) {
    console.error("Failed to read latest credential id for install tracking", error);
    return null;
  }
};

// App handlers don't return the stored credential, so new credentials are detected by id to report installs
// from both declarative handlers and OAuth callbacks.
const trackInstalledApps = async ({
  latestCredentialIdBefore,
  userId,
  teamId,
  apiEndpoint,
}: {
  latestCredentialIdBefore: number;
  userId: number;
  teamId?: number;
  apiEndpoint: string;
}) => {
  try {
    const newCredentials = await prisma.credential.findMany({
      where: {
        id: { gt: latestCredentialIdBefore },
        OR: [{ userId }, ...(teamId ? [{ teamId }] : [])],
      },
      select: { id: true, appId: true, teamId: true },
    });
    for (const credential of newCredentials) {
      trackPendoEvent({
        event: "App installed",
        userId,
        properties: {
          app_slug: credential.appId,
          credential_id: credential.id,
          is_team_install: !!credential.teamId,
          install_step: apiEndpoint,
        },
      });
    }
  } catch (error) {
    console.error("Failed to track app installation", error);
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  req.session = await getServerSession({ req });

  const { args, teamId } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [appName, apiEndpoint] = args;

  if (apiEndpoint === "add" && !req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    /* Absolute path didn't work */
    const handlerMap = (await import("@calcom/app-store/apps.server.generated")).apiHandlers;
    const handlerKey = deriveAppDictKeyFromType(appName, handlerMap);
    const handlers = await handlerMap[handlerKey as keyof typeof handlerMap];
    if (!handlers) throw new HttpError({ statusCode: 404, message: `No handlers found for ${handlerKey}` });
    const handler = handlers[apiEndpoint as keyof typeof handlers] as AppHandler;
    if (typeof handler === "undefined")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    const sessionUserId = req.session?.user?.id;
    const shouldTrackInstall = !!sessionUserId && INSTALL_ENDPOINTS.includes(apiEndpoint);
    const latestCredentialIdBefore = shouldTrackInstall ? await getLatestCredentialId() : null;

    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      await defaultIntegrationAddHandler({ user: req.session?.user, teamId: Number(teamId), ...handler });
      const redirectUrl = handler.redirect?.url ?? undefined;
      res.json({ url: redirectUrl, newTab: handler.redirect?.newTab });
    }
    if (sessionUserId && latestCredentialIdBefore !== null) {
      await trackInstalledApps({
        latestCredentialIdBefore,
        userId: sessionUserId,
        teamId: Number(teamId) || undefined,
        apiEndpoint,
      });
    }
    if (!res.writableEnded) res.status(200);
    return;
  } catch (error) {
    console.error(error);
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }
};

export default handler;
