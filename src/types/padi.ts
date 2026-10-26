import { z } from "zod";

export const PadiTokenClaimsSchema = z.object({
  aud: z.string().optional(),
  "custom:affiliate_id": z.union([z.string(), z.number()]),
  exp: z.number(),
});

export type PadiTokenClaims = z.infer<typeof PadiTokenClaimsSchema>;

export const PadiUnitResponseSchema = z.object({
  data: z.object({
    logbook_units_settings: z.array(
      z.object({
        unit: z.enum(["Imperial", "Metric"]),
      }),
    ),
  }),
  errors: z.array(z.unknown()).optional(),
});

export const PadiCreateDiveResponseSchema = z.object({
  data: z.object({
    insert_logbook_logs: z.object({
      affected_rows: z.number(),
      returning: z.array(
        z.object({
          id: z.number(),
        }),
      ),
    }),
  }),
  errors: z.array(z.unknown()).optional(),
});

export const PadiRecentDivesResponseSchema = z.object({
  data: z.object({
    logbook_logs: z.array(
      z.object({
        depth_times: z.array(
          z.object({
            bottom_time: z.number().nullable(),
            max_depth: z.number().nullable(),
          }),
        ),
        dive_date: z.string().nullable(),
        id: z.number().int().positive(),
      }),
    ),
  }),
  errors: z.array(z.unknown()).optional(),
});

export type PadiExistingDive = z.infer<
  typeof PadiRecentDivesResponseSchema
>["data"]["logbook_logs"][number];

export type PadiDuplicateCandidate = {
  readonly bottomTimeMinutes?: number;
  readonly localDate?: string;
  readonly maxDepthMeters?: number;
};

export type PadiSession = {
  readonly affiliateId: number;
  readonly idToken: string;
};
