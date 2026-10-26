import { z } from "zod";

export const GarminRuntimeRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("garmin:get-connection") }),
  z.object({
    apiKey: z.string().trim().min(1).max(4096),
    type: z.literal("garmin:save-key-and-list"),
  }),
  z.object({
    activityId: z.string().regex(/^\d+$/),
    type: z.literal("garmin:download-dive"),
  }),
  z.object({ type: z.literal("garmin:disconnect") }),
  z.object({ type: z.literal("garmin:list-dives") }),
]);

export type GarminRuntimeRequest = z.infer<typeof GarminRuntimeRequestSchema>;

const GarminErrorCodeSchema = z.enum([
  "invalid-key",
  "network",
  "response",
  "file-too-large",
  "unexpected",
]);

export const GarminActivitySummarySchema = z.object({
  activityId: z.string().regex(/^\d+$/),
  activityName: z.string().optional(),
  beginTimestamp: z.number().int().nonnegative().optional(),
  bottomTimeSeconds: z.number().nonnegative().optional(),
  locationName: z.string().optional(),
  maxDepthCentimeters: z.number().nonnegative().optional(),
  startTimeLocal: z.string().optional(),
});

export type GarminActivitySummary = z.infer<typeof GarminActivitySummarySchema>;

export const GarminRuntimeResponseSchema = z.discriminatedUnion("status", [
  z.object({ configured: z.boolean(), status: z.literal("connection") }),
  z.object({ status: z.literal("disconnected") }),
  z.object({ status: z.literal("setup-required") }),
  z.object({ status: z.literal("no-dives") }),
  z.object({
    activities: z.array(GarminActivitySummarySchema).max(50),
    checkedCount: z.number().int().nonnegative(),
    status: z.literal("dives"),
  }),
  z.object({
    activityId: z.string().regex(/^\d+$/),
    dataBase64: z.string().min(1),
    fileName: z.string().min(1),
    status: z.literal("dive"),
  }),
  z.object({
    code: GarminErrorCodeSchema,
    message: z.string().min(1),
    status: z.literal("error"),
  }),
]);

export type GarminRuntimeResponse = z.infer<typeof GarminRuntimeResponseSchema>;

export const GarminActivityListSchema = z.array(
  z.object({
    activityId: z.number().int().positive().safe(),
    activityName: z.string().trim().min(1).optional(),
    beginTimestamp: z.number().int().nonnegative().optional(),
    bottomTime: z.number().nonnegative().optional(),
    locationName: z.string().trim().min(1).optional(),
    maxDepth: z.number().nonnegative().optional(),
    startTimeLocal: z.string().optional(),
  }),
);

export type GarminAccessToken = {
  readonly expiresAt: number;
  readonly value: string;
};
