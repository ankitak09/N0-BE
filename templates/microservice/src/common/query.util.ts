export function parseNullableQueryParam(value?: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "null" || value === "") {
    return null;
  }
  return value;
}
