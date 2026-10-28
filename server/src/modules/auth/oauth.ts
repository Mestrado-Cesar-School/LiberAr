// Verificação de tokens dos provedores sociais (Google / Apple).
import appleSignin from "apple-signin-auth";
import { OAuth2Client } from "google-auth-library";
import { config } from "../../config";
import { AppError, unauthorized } from "../../lib/errors";

export type OAuthProvider = "google" | "apple";

export type OAuthIdentity = {
  /** "google:<sub>" | "apple:<sub>" */
  subject: string;
  email: string | null;
  name: string | null;
};

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthIdentity> {
  if (!config.GOOGLE_CLIENT_ID) {
    throw new AppError(503, "INTERNAL_ERROR", "Login com Google não configurado neste ambiente");
  }
  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  let payload: { sub?: string; email?: string; name?: string } | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized("Token do Google inválido");
  }
  if (!payload?.sub) throw unauthorized("Token do Google inválido");
  return {
    subject: `google:${payload.sub}`,
    email: payload.email?.toLowerCase() ?? null,
    name: payload.name ?? null,
  };
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<OAuthIdentity> {
  if (!config.APPLE_CLIENT_ID) {
    throw new AppError(503, "INTERNAL_ERROR", "Login com Apple não configurado neste ambiente");
  }
  let payload: { sub?: string; email?: string };
  try {
    payload = await appleSignin.verifyIdToken(identityToken, { audience: config.APPLE_CLIENT_ID });
  } catch {
    throw unauthorized("Token da Apple inválido");
  }
  if (!payload?.sub) throw unauthorized("Token da Apple inválido");
  return { subject: `apple:${payload.sub}`, email: payload.email?.toLowerCase() ?? null, name: null };
}
