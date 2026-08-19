import { SkeletonTable } from '@/components/common/UI';

/**
 * Generic responsive data table: a real <table> on desktop/tablet,
 * a stacked card layout on mobile so wide tables never break the viewport.
 */
export function DataTable({ columns, data, keyField = 'id', onRowClick, loading, emptyState }) {
  if (loading) {
    return (
      <div className="card p-5">
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="card">{emptyState}</div>;
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="table-wrapper hidden md:block">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.tdClassName}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={`card p-4 space-y-1.5 ${onRowClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-400 flex-shrink-0">{c.header}</span>
                  <span className="text-slate-700 text-right font-medium">
                    {c.render ? c.render(row) : row[c.key]}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
