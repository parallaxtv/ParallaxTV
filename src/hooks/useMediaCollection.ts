import { useState, useEffect } from "react";

export function useMediaCollection<T>(
  fetchFn: () => Promise<T[]>, 
  dependencies: any[] = []
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchFn()
      .then((data) => {
        if (isMounted) setItems(data);
      })
      .catch((err) => {
        if (isMounted) setError(err);
        console.error("Hook fetch failed:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false; // Prevents memory leaks if the user navigates away before fetch finishes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { items, loading, error };
}