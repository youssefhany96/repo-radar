import { useEffect, useState } from "react";

// Debounces the value, not the request — the input stays responsive and only
// the settled value triggers a fetch.
export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
