import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { HttpError } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { pendoTrack } from "@calcom/lib/server/pendoTrack";
import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler, AppHandler } from "@calcom/types/AppHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";

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

// OAuth apps store their credential in "callback" while declarative apps store it in "add".
const CREDENTIAL_STORING_ENDPOINTS = ["add", "callback"];

const findLatestCredentialForUser = (userId: number) =>
  prisma.credential.findFirst({
    where: { OR: [{ userId }, { team: { members: { some: { userId, accepted: true } } } }] },
    orderBy: { id: "desc" },
    select: { id: true, appId: true, teamId: true },
  });

// Comparing the newest credential before and after the app handler runs is the only reliable success
// signal, because callback handlers redirect on both success and provider errors.
const trackAppInstalledIfCredentialStored = async ({
  user,
  previousCredentialId,
  apiEndpoint,
}: {
  user: Session["user"];
  previousCredentialId: number | null;
  apiEndpoint: string;
}) => {
  try {
    const latestCredential = await findLatestCredentialForUser(user.id);
    if (!latestCredential || latestCredential.id === previousCredentialId) return;
    pendoTrack({
      event: "App installed",
      visitorId: user.id,
      accountId: user.org?.id,
      properties: {
        app_slug: latestCredential.appId,
        is_team_install: Boolean(latestCredential.teamId),
        install_step: apiEndpoint,
      },
    });
  } catch (error) {
    console.error("Unable to track app install", error);
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

  const sessionUser = req.session?.user;
  let shouldTrackInstall = Boolean(sessionUser?.id) && CREDENTIAL_STORING_ENDPOINTS.includes(apiEndpoint);
  let previousCredentialId: number | null = null;
  if (sessionUser && shouldTrackInstall) {
    try {
      previousCredentialId = (await findLatestCredentialForUser(sessionUser.id))?.id ?? null;
    } catch (error) {
      shouldTrackInstall = false;
      console.error("Unable to read credentials before app install", error);
    }
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

    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      await defaultIntegrationAddHandler({ user: req.session?.user, teamId: Number(teamId), ...handler });
      const redirectUrl = handler.redirect?.url ?? undefined;
      res.json({ url: redirectUrl, newTab: handler.redirect?.newTab });
    }
    if (sessionUser && shouldTrackInstall) {
      await trackAppInstalledIfCredentialStored({ user: sessionUser, previousCredentialId, apiEndpoint });
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
