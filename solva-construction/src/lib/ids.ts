export const createEntityId = (prefix: string): string =>
  `${prefix}-${crypto.randomUUID()}`;
