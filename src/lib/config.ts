export const CONFIG = {
  pagination: {
    defaultPageSize: 50,
    maxPageSize: 500,
  },
  limits: {
    endpointDistribution: 15,
    slowRequests: 20,
    queryExplorer: 100,
  },
  upload: {
    maxFileSizeMb: 500,
    presignedUrlExpirySec: 3600,
  },
} as const;

export const FILTER_OPTIONS = {
  severity: ["INFO", "WARN", "ERROR"] as const,
  method: ["GET", "POST", "OPTIONS", "HEAD", "PUT"] as const,
  status: [
    "200",
    "204",
    "304",
    "429",
    "402",
    "101",
    "0",
    "403",
    "400",
    "404",
    "502",
    "504",
  ] as const,
  endpoint: [
    "query",
    "images",
    "listen",
    "files",
    "live",
    "projects",
    "socket",
    "doc",
    "help",
    "history",
    "journey",
    "mutate",
    "intake",
    "users",
    "ping",
  ] as const,
  domain: ["api", "cdn", "apicdn"] as const,
} as const;
