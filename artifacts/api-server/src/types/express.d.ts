import type { JWTPayload } from "../middlewares/auth";

/**
 * Augments Express's Request so req.user is available on routes that use
 * requireAuth. Optional because unauthenticated routes don't set it.
 *
 * Existing routes that use AuthenticatedRequest (req.userId / req.userRole)
 * continue to work — those fields are set by the legacy `authenticate` middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
