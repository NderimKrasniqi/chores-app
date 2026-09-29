import { useState } from "react";

/**
 * The value, or the last one it had while defined. A sheet keyed on a
 * selection keeps showing that selection while it animates closed.
 */
export function useLastDefined<T>(value: T | undefined | null): T | undefined {
  const [last, setLast] = useState<T | undefined>(value ?? undefined);
  if (value !== undefined && value !== null && value !== last) setLast(value);
  return value ?? last;
}
