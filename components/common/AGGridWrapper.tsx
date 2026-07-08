"use client";

import {
  ClientSideRowModelModule,
  ColDef,
  ColGroupDef,
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  TextFilterModule,
} from "ag-grid-community";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import React, { useCallback, useMemo, useRef, useState } from "react";

// Register AG Grid Community modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  PaginationModule,
  RowSelectionModule,
]);

export interface AGGridWrapperProps<TData = any>
  extends Omit<AgGridReactProps<TData>, "className"> {
  height?: string | number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  showPagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  totalRows?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  serverSidePagination?: boolean;
}

export default function AGGridWrapper<TData = any>({
  height = 500,
  loading = false,
  emptyMessage = "No data available",
  className = "",
  rowData,
  columnDefs,
  defaultColDef: userDefaultColDef,
  showPagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  totalRows,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  serverSidePagination = false,
  ...props
}: AGGridWrapperProps<TData>) {
  const gridRef = useRef<AgGridReact<TData>>(null);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  const defaultColDef = useMemo(() => {
    const mergedFilterParams = {
      debounceMs: 250,
      suppressAndOrCondition: true,
      maxNumConditions: 1,
      ...(userDefaultColDef?.filterParams || {}),
    };

    return {
      flex: 1,
      minWidth: 100,
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: false,
      suppressHeaderMenuButton: false,
      cellStyle: { display: "flex", alignItems: "center" },
      ...userDefaultColDef,
      // Ensure shared behavior is preserved even when custom defaultColDef is passed.
      filterParams: mergedFilterParams,
    };
  }, [userDefaultColDef]);

  const normalizedColumnDefs = useMemo(() => {
    const normalizeColDefs = (
      defs: (ColDef<TData> | ColGroupDef<TData>)[] = []
    ): (ColDef<TData> | ColGroupDef<TData>)[] =>
      defs.map((def) => {
        if ("children" in def && def.children) {
          return {
            ...def,
            children: normalizeColDefs(def.children),
          };
        }

        const colDef = def as ColDef<TData>;
        if (!colDef.filter || colDef.filter === false) {
          return colDef;
        }

        return {
          ...colDef,
          filterParams: {
            debounceMs: 250,
            suppressAndOrCondition: true,
            maxNumConditions: 1,
            ...(colDef.filterParams || {}),
          },
        };
      });

    return normalizeColDefs(columnDefs as (ColDef<TData> | ColGroupDef<TData>)[]);
  }, [columnDefs]);

  const overlayNoRowsTemplate = useMemo(
    () => `<div class="ag-overlay-no-rows-custom">
      <svg class="ag-overlay-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <p class="ag-overlay-message">${emptyMessage}</p>
    </div>`,
    [emptyMessage]
  );

  const overlayLoadingTemplate = useMemo(
    () => `<div class="ag-overlay-loading-custom">
      <div class="ag-overlay-spinner"></div>
      <p class="ag-overlay-message">Loading...</p>
    </div>`,
    []
  );

  const gridHeight = typeof height === "number" ? `${height}px` : height;

  // Calculate pagination values for server-side pagination
  const totalPages = totalRows ? Math.ceil(totalRows / internalPageSize) : 1;
  const startRow = totalRows ? (currentPage - 1) * internalPageSize + 1 : 0;
  const endRow = totalRows
    ? Math.min(currentPage * internalPageSize, totalRows)
    : 0;

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setInternalPageSize(newSize);
      if (onPageSizeChange) {
        onPageSizeChange(newSize);
      }
    },
    [onPageSizeChange]
  );

  return (
    <div className={`ag-grid-wrapper ${className}`}>
      <div
        className="ag-theme-alpine ag-theme-leadsnipper"
        style={{ height: gridHeight, width: "100%" }}
      >
        <AgGridReact<TData>
          ref={gridRef}
          rowData={rowData}
          columnDefs={normalizedColumnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          suppressCellFocus={true}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          overlayLoadingTemplate={overlayLoadingTemplate}
          loading={loading}
          domLayout="normal"
          headerHeight={48}
          rowHeight={52}
          suppressColumnVirtualisation={false}
          enableCellTextSelection={true}
          pagination={!serverSidePagination && showPagination}
          paginationPageSize={
            !serverSidePagination ? internalPageSize : undefined
          }
          paginationPageSizeSelector={
            !serverSidePagination ? pageSizeOptions : undefined
          }
          suppressPaginationPanel={serverSidePagination}
          {...props}
        />
      </div>

      {/* Custom pagination for server-side pagination */}
      {serverSidePagination && showPagination && totalRows !== undefined && (
        <div className="ag-grid-pagination">
          <div className="pagination-left">
            <span className="pagination-label">Page Size:</span>
            <select
              value={internalPageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="pagination-select"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="pagination-center">
            <span className="pagination-info">
              {startRow} to {endRow} of {totalRows}
            </span>
          </div>

          <div className="pagination-right">
            <button
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="First Page"
            >
              «
            </button>
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous Page"
            >
              ‹
            </button>
            <span className="pagination-pages">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
              title="Next Page"
            >
              ›
            </button>
            <button
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
