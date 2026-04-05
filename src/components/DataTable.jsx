import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import classNames from 'classnames';
import './DataTable.css';

export function DataTable({ data }) {
  const [sorting, setSorting] = useState([]);
  const [grouping, setGrouping] = useState([]);

  const fmtMoney = (val) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  const fmtPct = (val) => new Intl.NumberFormat('pl-PL', { style: 'percent', minimumFractionDigits: 2 }).format(val || 0);

  const columns = [
    {
      header: 'Ticker',
      accessorKey: 'ticker',
      cell: info => <span className="ticker-badge">{info.getValue()}</span>,
    },
    {
      header: 'Nazwa',
      accessorKey: 'name',
    },
    {
      header: 'Wartość Rynkowa (PLN)',
      accessorKey: 'marketValuePLN',
      cell: info => <span className="text-medium">{fmtMoney(info.getValue())}</span>,
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
          <span className="text-medium">
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
          <span className="text-medium">
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
        return (
          <span className="text-medium">
            {val > 0 ? "+" : ""}{fmtMoney(val)}
          </span>
        );
      },
    },
    {
      header: 'Zysk % z dywidendami',
      id: 'totalReturnPct',
      accessorFn: row => {
        const cost = row.costBasePLN || 0;
        if (cost === 0) return 0;
        const totalProfit = (row.unrealizedGainPLN || 0) + (row.dividendsPLN || 0);
        return totalProfit / cost;
      },
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className="text-bold">
            {val > 0 ? "+" : ""}{fmtPct(val)}
          </span>
        );
      }
    },
    {
      header: 'Koszt (PLN)',
      accessorKey: 'costBasePLN',
      cell: info => <span className="text-muted">{fmtMoney(info.getValue())}</span>,
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
      {/* Pivot / grouping controls have been removed according to user request */}
      <div className="glass-panel">
        <table className="glass-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={classNames("header-cell", header.column.getCanSort() ? "cursor-pointer select-none" : "")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className={classNames("sort-icon", !header.column.getIsSorted() && "sort-icon-idle")}>
                            {header.column.getIsSorted() ? (
                              header.column.getIsSorted() === 'asc' ? <ArrowUpDown size={14} style={{transform: "rotate(180deg)"}} /> : <ArrowUpDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              return (
                <tr key={row.id} className={classNames("data-row", row.getIsGrouped() ? "grouped-row" : "")}>
                  {row.getVisibleCells().map(cell => {
                    return (
                      <td key={cell.id}>
                        {cell.getIsGrouped() ? (
                          <div 
                            className="group-expander"
                            onClick={row.getToggleExpandedHandler()}
                          >
                            {row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              ({row.subRows.length})
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
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
