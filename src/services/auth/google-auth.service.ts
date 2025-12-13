import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_ID } from "../../config/app.config";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export class GoogleAuthService {
  async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error("Invalid Google token");
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Google token verification failed: ${message}`);
    }
  }
}
