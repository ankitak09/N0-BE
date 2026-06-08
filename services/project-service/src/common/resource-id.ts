export const RESOURCE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function isResourceId(value: string): boolean {
  return RESOURCE_ID_PATTERN.test(value);
}
