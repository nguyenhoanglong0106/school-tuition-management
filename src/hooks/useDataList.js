import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared list-loading hook: handles page/pageSize state, loading/error state,
 * and re-fetches whenever the given deps (search/filter values) change,
 * resetting back to page 1 when a filter (not the page itself) changes.
 */
export function useDataList(fetchFn, deps = [], initialPageSize = 20) {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFirstRun = useRef(true);

  // Reset to page 1 whenever filters change (not on first mount, not on page/pageSize change)
  useEffect(() => {
    if (isFirstRun.current) return;
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn({ page, pageSize });
      setData(res.data ?? []);
      setCount(res.count ?? 0);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
      isFirstRun.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, count, page, setPage, pageSize, setPageSize, loading, error, reload };
}
