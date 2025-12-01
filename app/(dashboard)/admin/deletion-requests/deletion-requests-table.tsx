'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TablePagination } from '@/components/table-pagination';
import { ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { DeletionRequestBadge } from '@/components/deletion-request-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { DeletionRequest, DeletionRequestStatus } from '@/types/database';

interface DeletionRequestsTableProps {
  requests: DeletionRequest[];
  onReview: (request: DeletionRequest) => void;
}

export function DeletionRequestsTable({ requests, onReview }: DeletionRequestsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<DeletionRequestStatus | 'all'>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    // Apply status filter
    let filtered = requests;
    if (statusFilter !== 'all') {
      filtered = requests.filter((request) => request.status === statusFilter);
    }

    // Apply sorting by submission date (created_at)
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });

    return sorted;
  }, [requests, statusFilter, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedRequests.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRequests = filteredAndSortedRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No deletion requests found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Status:
          </label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DeletionRequestStatus | 'all')}>
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {statusFilter !== 'all' && (
          <Button variant="ghost" onClick={() => setStatusFilter('all')} size="sm">
            Clear filter
          </Button>
        )}
      </div>

      {/* Results count */}
      {filteredAndSortedRequests.length !== requests.length && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedRequests.length} of {requests.length} requests
        </p>
      )}

      {/* Table */}
      {filteredAndSortedRequests.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No requests match your filter.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={toggleSortDirection}
                  >
                    <div className="flex items-center gap-1">
                      Submission Date
                      {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Justification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{request.asset_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(request.asset_cost))}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.requester?.full_name || request.requester_email}
                    </TableCell>
                    <TableCell>
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={request.justification}>
                        {request.justification}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DeletionRequestBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReview(request)}
                        aria-label="Review request"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={filteredAndSortedRequests.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
