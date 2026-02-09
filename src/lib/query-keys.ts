export const fileKeys = {
  all: ["files"] as const,
  lists: () => [...fileKeys.all, "list"] as const,
  list: () => fileKeys.lists(),
  details: () => [...fileKeys.all, "detail"] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

export const logKeys = {
  all: ["logs"] as const,
  lists: () => [...logKeys.all, "list"] as const,
  list: (params: Record<string, string>) =>
    [...logKeys.lists(), params] as const,
  aggregations: () => [...logKeys.all, "aggregations"] as const,
  aggregation: (fileKey: string, filters?: string) =>
    [...logKeys.aggregations(), fileKey, filters] as const,
};

export const processingKeys = {
  all: ["processing"] as const,
  stats: () => [...processingKeys.all, "stats"] as const,
};

export const meKeys = {
  all: ["me"] as const,
  profile: () => [...meKeys.all, "profile"] as const,
};

export const adminKeys = {
  all: ["admin"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  user: (id: string) => [...adminKeys.all, "user", id] as const,
};
