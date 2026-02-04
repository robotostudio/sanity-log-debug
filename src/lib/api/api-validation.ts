import { z } from "zod";
import { Errors } from "./api-errors";

// Base schemas
export const fileKeySchema = z.string().min(1, "fileKey is required");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const sortSchema = z.object({
  sortBy: z
    .enum(["timestamp", "duration", "status", "method", "endpoint"])
    .default("timestamp"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const commaArray = z
  .string()
  .optional()
  .transform((val) => (val ? val.split(",").filter(Boolean) : undefined));

const studioFilter = z
  .enum(["true", "false", "all"])
  .optional()
  .transform((val) => (val === "all" ? undefined : val));

export const filtersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  severity: commaArray,
  method: commaArray,
  status: commaArray,
  endpoint: commaArray,
  domain: commaArray,
  studio: studioFilter,
  search: z.string().optional(),
  groqId: z.string().optional(),
});

export const logsQuerySchema = z
  .object({
    fileKey: fileKeySchema,
  })
  .merge(paginationSchema)
  .merge(sortSchema)
  .merge(filtersSchema);

export const aggregationsQuerySchema = z
  .object({
    fileKey: fileKeySchema,
  })
  .merge(filtersSchema);

export const deleteFileSchema = z.object({
  key: z.string().min(1, "Key is required"),
});

// Type exports
export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type AggregationsQuery = z.infer<typeof aggregationsQuerySchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
export type ValidatedFilters = z.infer<typeof filtersSchema>;

// Validation helpers
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    throw Errors.validation("Validation failed", { issues });
  }
  return result.data;
}

export function searchParamsToObject(
  params: URLSearchParams,
): Record<string, string> {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
