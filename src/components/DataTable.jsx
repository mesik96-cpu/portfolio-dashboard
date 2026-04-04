import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import classNames from 'classnames';
import './DataTable.css';

export function DataTable({ data }) {
  const [sorting, setSorting] = useState([{ id: 'marketValuePLN', desc: true }]);
  const [grouping, setGrouping] = useState([]);

  // Formatters
  const fmtMoney = (val) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(val || 0);
  const fmtPct = (val) => new Intl.NumberFormat('pl-PL', { style: 'percent', minimumFractionDigits: 1 }).format(val || 0);

  const columns = [
    {
      header: 'Ticker',
      accessorKey: 'ticker',
      cell: info => <span className="ticker-badge">{info.getValue()}</span>,
    },
    {
      header: 'Kategoria',
      accessorKey: 'category',
    },
    {
      header: 'Waluta',
      accessorKey: 'currency',
    },
    {
      header: 'Ilość',
      accessorKey: 'quantity',
      cell: info => new Intl.NumberFormat('pl-PL').format(info.getValue() || 0),
    },
    {
      header: 'Koszt (PLN)',
      accessorKey: 'costBasePLN',
      cell: info => fmtMoney(info.getValue()),
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => <span className="text-bold">{fmtMoney(getValue())}</span>,
    },
    {
      header: 'Wartość Rynkowa (PLN)',
      accessorKey: 'marketValuePLN',
      cell: info => fmtMoney(info.getValue()),
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => <span className="text-bold">{fmtMoney(getValue())}</span>,
    },
    {
      header: 'Zysk (PLN)',
      accessorKey: 'unrealizedGainPLN',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={classNames("text-medium", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{fmtMoney(val)}
          </span>
        );
      },
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => {
        const val = getValue() || 0;
        return (
          <span className={classNames("text-bold", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{fmtMoney(val)}
          </span>
        );
      }
    },
    {
      header: 'Zysk % (PLN)',
      accessorKey: 'unrealizedGainPctPLN',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={classNames("text-medium", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{fmtPct(val)}
          </span>
        );
      },
    },
    {
      header: 'Zysk (Waluta)',
      accessorKey: 'unrealizedGainLocal',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={classNames("text-medium", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{new Intl.NumberFormat('pl-PL').format(val)}
          </span>
        );
      },
    },
    {
      header: 'Zysk % (Waluta)',
      accessorKey: 'unrealizedGainPctLocal',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={classNames("text-medium", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{fmtPct(val)}
          </span>
        );
      },
    },
    {
      header: 'Dywidendy (PLN)',
      accessorKey: 'dividendsPLN',
      cell: info => {
        const val = info.getValue() || 0;
        return val > 0 ? <span className="positive-val">{fmtMoney(val)}</span> : <span className="text-muted">—</span>;
      },
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => {
        const val = getValue() || 0;
        return <span className="text-bold positive-val">{val > 0 ? fmtMoney(val) : "—"}</span>;
      }
    },
    {
      id: 'zysk_z_dywidendami',
      header: 'Zysk % z dywidendami',
      accessorFn: row => {
         const gain = row.unrealizedGainPLN || 0;
         const divs = row.dividendsPLN || 0;
         const cost = row.costBasePLN || 0;
         if (cost === 0) return 0;
         return (gain + divs) / cost;
      },
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={classNames("text-bold", val > 0 ? "positive-val" : val < 0 ? "negative-val" : "")}>
            {val > 0 ? "+" : ""}{fmtPct(val)}
          </span>
        );
      }
    }
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      grouping,
    },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="table-container fade-in">
      <div className="pivot-controls">
        <span className="pivot-label">🗂️ Pivotowanie tabeli:</span>
        <button 
          className={classNames("btn-pivot", grouping.includes('category') ? "active" : "")}
          onClick={() => setGrouping(g => g.includes('category') ? [] : ['category'])}
        >
          Wg. Kategorii
        </button>
        <button 
          className={classNames("btn-pivot", grouping.includes('currency') ? "active" : "")}
          onClick={() => setGrouping(g => g.includes('currency') ? [] : ['currency'])}
        >
          Wg. Waluty
        </button>
      </div>

      <div className="glass-panel">
        <table className="glass-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <th 
                      key={header.id} 
                      colSpan={header.colSpan}
                      className="cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="header-cell">
                        {header.isPlaceholder ? null : (
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        )}
                        <span className="sort-icon">
                          {{
                            asc: <ArrowUp size={14} />,
                            desc: <ArrowDown size={14} />,
                          }[header.column.getIsSorted()] ?? <ArrowUpDown size={14} className="sort-icon-idle" />}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              return (
                <tr key={row.id} className={classNames(row.getIsGrouped() ? "grouped-row" : "data-row")}>
                  {row.getVisibleCells().map(cell => {
                    return (
                      <td key={cell.id}>
                        {cell.getIsGrouped() ? (
                          <div className="group-expander" onClick={row.getToggleExpandedHandler()}>
                            <span>
                              {row.getIsExpanded() ? '▼' : '▶'} {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                            </span>
                          </div>
                        ) : cell.getIsAggregated() ? (
                          flexRender(
                            cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        ) : cell.getIsPlaceholder() ? null : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
