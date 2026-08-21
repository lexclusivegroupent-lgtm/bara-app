import { pgTable, serial, text, boolean, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  // "partner" = B2B service provider (lead-gen model); "driver"/"both" kept for legacy accounts
  role: text("role").notNull().$type<"customer" | "driver" | "both" | "partner">(),
  city: text("city").notNull(),
  profilePhoto: text("profile_photo"),
  isAvailable: boolean("is_available").notNull().default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  totalJobs: integer("total_jobs").notNull().default(0),
  vehicleType: text("vehicle_type").$type<"cargo_bike" | "car_trailer" | "pickup" | "small_van" | "large_van" | "truck">(),
  vehicleDescription: text("vehicle_description"),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<"unverified" | "pending" | "verified">(),
  driverLicenseStatus: text("driver_license_status").notNull().default("not_submitted").$type<"not_submitted" | "submitted" | "approved" | "rejected">(),
  cancellationsCount: integer("cancellations_count").notNull().default(0),
  noShowCount: integer("no_show_count").notNull().default(0),
  pushToken: text("push_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  passwordChangedAt: timestamp("password_changed_at"),
  // Age verification: required (≥18) for carrier registration; nullable so
  // existing accounts are unaffected.
  dateOfBirth: date("date_of_birth"),
  // Email verification. Nullable on purpose: NULL = legacy account created
  // before this column existed, treated as verified so existing users are not
  // locked out. New registrations set false explicitly until the OTP is confirmed.
  emailVerified: boolean("email_verified"),
  emailVerificationToken: text("email_verification_token"),
  driverAgreementAccepted: boolean("driver_agreement_accepted").notNull().default(false),
  driverAgreementAcceptedAt: timestamp("driver_agreement_accepted_at"),
  driverOnboardingComplete: boolean("driver_onboarding_complete").notNull().default(false),
  isDeactivated: boolean("is_deactivated").notNull().default(false),
  deactivationReason: text("deactivation_reason"),
  annualEarnings: integer("annual_earnings").notNull().default(0),
  // ⚖️ F-skatt compliance — legal review required before launch (Swedish tax law)
  ftaxRegistered: boolean("ftax_registered").notNull().default(false),
  ftaxNumber: text("ftax_number"),
  ftaxVerifiedByAdmin: boolean("ftax_verified_by_admin").notNull().default(false),
  // ⚖️ Liability insurance — self-declared by the partner, verified by admin.
  // Bära positions itself as a professional, insured, company-only service:
  // partners are expected to carry liability insurance for transport work.
  insuranceRegistered: boolean("insurance_registered").notNull().default(false),
  insuranceProvider: text("insurance_provider"),
  insuranceVerifiedByAdmin: boolean("insurance_verified_by_admin").notNull().default(false),
  // ⚖️ DAC7 EU directive — KYC data required for annual Skatteverket reporting
  personnummer: text("personnummer"),
  fullLegalName: text("full_legal_name"),
  registeredAddress: text("registered_address"),
  bankAccountNumber: text("bank_account_number"),
  dac7Consented: boolean("dac7_consented").notNull().default(false),
  dac7ConsentDate: timestamp("dac7_consent_date"),
  // Set true when the carrier crosses a DAC7 reporting threshold
  // (30 completed jobs OR 22,000 SEK gross in a calendar year) without consent.
  dac7Required: boolean("dac7_required").notNull().default(false),
  // B2B lead-gen pivot: partner business profile
  companyName: text("company_name"),
  orgNumber: text("org_number"),
  phone: text("phone"),
  serviceAreas: text("service_areas").array(),
  serviceCategories: text("service_categories").array(),
  // Referral programme
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
  referralCount: integer("referral_count").notNull().default(0),
  referralBonusEarned: integer("referral_bonus_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
