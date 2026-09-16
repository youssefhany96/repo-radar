import { useEffect, useState } from "react";

/**
 * Debounces the VALUE rather than the request.
 *
 * The input stays fully responsive because it's driven by immediate state; only
 * the debounced value is used as a fetch trigger. Debouncing the request itself
 * would mean managing timers next to network code.
 */
export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
