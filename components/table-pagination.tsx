'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 10, 25, 50, 100],
}: TablePaginationProps) {
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Record count - full width on mobile */}
      <div className="flex items-center justify-center sm:justify-start">
        <p className="text-sm text-muted-foreground">
          Showing {startRecord}-{endRecord} of {totalRecords} records
        </p>
      </div>

      {/* Controls - stack on mobile, inline on desktop */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Rows per page selector */}
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <p className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="min-h-[44px] min-w-[44px]"
          >
            Previous
          </Button>
          <span className="text-sm whitespace-nowrap px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="min-h-[44px] min-w-[44px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
