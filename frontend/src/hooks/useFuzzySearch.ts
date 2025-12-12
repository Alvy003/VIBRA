// hooks/useFuzzySearch.ts
import { useMemo } from "react";
import Fuse from "fuse.js";

interface FuzzySearchOptions<T> {
  keys: (keyof T | string)[];
  threshold?: number;
  distance?: number;
  minMatchCharLength?: number;
  returnAllOnEmpty?: boolean;
}

export function useFuzzySearch<T>(
  items: T[],
  query: string,
  options: FuzzySearchOptions<T>
) {
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: options.keys as string[],
      threshold: options.threshold ?? 0.4,
      distance: options.distance ?? 100,
      minMatchCharLength: options.minMatchCharLength ?? 2,
      includeScore: true,
      ignoreLocation: true,
      findAllMatches: true,
    });
  }, [items, options.keys, options.threshold, options.distance, options.minMatchCharLength]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Return all items only if returnAllOnEmpty is true (default: true for admin, false for search page)
      return options.returnAllOnEmpty !== false ? items : [];
    }
    return fuse.search(query).map((result) => result.item);
  }, [fuse, query, items, options.returnAllOnEmpty]);

  return results;
}