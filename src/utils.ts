/** Checks if value is strictly equal to `null` or `undefined` */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
