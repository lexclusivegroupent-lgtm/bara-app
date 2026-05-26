import { z } from "zod";

// ─── Sweden geographic bounding box ──────────────────────────────────────────
// Approximate extents: lat 55–70 °N, lon 10–25 °E

const SWEDEN = { latMin: 55, latMax: 70, lonMin: 10, lonMax: 25 } as const;

export const swedenCoordinate = z.object({
  latitude: z
    .number()
    .min(SWEDEN.latMin, `Latitude must be within Sweden (${SWEDEN.latMin}–${SWEDEN.latMax})`)
    .max(SWEDEN.latMax, `Latitude must be within Sweden (${SWEDEN.latMin}–${SWEDEN.latMax})`),
  longitude: z
    .number()
    .min(SWEDEN.lonMin, `Longitude must be within Sweden (${SWEDEN.lonMin}–${SWEDEN.lonMax})`)
    .max(SWEDEN.lonMax, `Longitude must be within Sweden (${SWEDEN.lonMin}–${SWEDEN.lonMax})`),
});

export type SwedenCoordinate = z.infer<typeof swedenCoordinate>;

// ─── Job coordinate validation ────────────────────────────────────────────────
// Supplements the generated CreateJobBody — validates that pickup/dropoff
// coordinates actually lie within Sweden.

export const jobCoordinatesSchema = z.object({
  pickup: swedenCoordinate,
  dropoff: swedenCoordinate,
});

export type JobCoordinates = z.infer<typeof jobCoordinatesSchema>;

// ─── File upload ──────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates file metadata before accepting an upload.
 * Note: also verify magic bytes server-side — declared MIME type can be spoofed.
 */
export const fileUploadSchema = z.object({
  mimetype: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
    }),
  }),
  size: z
    .number()
    .int()
    .min(1, "File cannot be empty")
    .max(MAX_FILE_SIZE_BYTES, "File must be 5 MB or smaller"),
  originalname: z.string().min(1).max(255),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// ─── Message ──────────────────────────────────────────────────────────────────

/**
 * Chat message between customer and driver.
 * HTML is stripped before the length check so markup doesn't inflate the count,
 * and stored content is always plain text.
 */
export const messageSchema = z.object({
  text: z
    .string()
    .transform((s) => s.replace(/<[^>]*>/g, ""))
    .pipe(
      z
        .string()
        .min(1, "Message cannot be empty after stripping HTML")
        .max(1000, "Message must be 1000 characters or fewer"),
    ),
  jobId: z.number().int().positive("jobId must be a positive integer"),
});

export type MessageInput = z.infer<typeof messageSchema>;

// ─── Auth: refresh token exchange ────────────────────────────────────────────

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

// ─── Auth: registration password policy ──────────────────────────────────────
// This supplements the generated RegisterBody — use it to validate the password
// field before passing the full body to the generated schema.

/**
 * Password policy: min 8 chars, ≥1 uppercase, ≥1 digit.
 * Capped at 128 chars to prevent bcrypt DoS (bcrypt silently truncates at 72 bytes).
 */
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,128}$/;

export const passwordPolicySchema = z.string().regex(PASSWORD_RE, {
  message: "Password must be 8–128 characters with at least one uppercase letter and one number",
});

/**
 * Swedish mobile number: +46 or 07x followed by 7 digits.
 * Examples: +46701234567, 0701234567
 */
const SWEDISH_PHONE_RE = /^(\+46|0)(7[0-9])\d{7}$/;

export const swedishPhoneSchema = z.string().regex(SWEDISH_PHONE_RE, {
  message: "Phone must be a valid Swedish mobile number (e.g. +46701234567)",
});
