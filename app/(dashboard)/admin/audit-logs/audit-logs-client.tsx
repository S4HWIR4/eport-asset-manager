'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ResponsiveTable,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { MobileFilterPanel } from '@/components/ui/mobile-filter-panel';
import { getAuditLogs } from '@/app/actions/audit-logs';
import type { AuditLogWithPerformer } from '@/app/actions/audit-logs';
import { Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogsClientProps {
  initialLogs: AuditLogWithPerformer[];
  initialTotal: number;
  users: { id: string; email: string; full_name: string | null }[];
}

const ACTION_LABELS: Record<string, string> = {
  asset_created: 'Asset Created',
  asset_updated: 'Asset Updated',
  asset_deleted: 'Asset Deleted',
  user_created: 'User Created',
  user_updated: 'User Updated',
  category_created: 'Category Created',
  category_updated: 'Category Updated',
  category_deleted: 'Category Deleted',
  department_created: 'Department Created',
  department_updated: 'Department Updated',
  department_deleted: 'Department Deleted',
  deletion_request_submitted: 'Deletion Request Submitted',
  deletion_request_cancelled: 'Deletion Request Cancelled',
  deletion_request_approved: 'Deletion Request Approved',
  deletion_request_rejected: 'Deletion Request Rejected',
};

const ACTION_COLORS: Record<string, string> = {
  asset_created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  asset_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  asset_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  user_created: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  user_updated: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  category_created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  category_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  category_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  department_created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  department_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  department_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  deletion_request_submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  deletion_request_cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  deletion_request_approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  deletion_request_rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function ViewDetailsDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLogWithPerformer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            Complete information about this audit entry
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Action</p>
              <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                {ACTION_LABELS[log.action] || log.action}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entity Type</p>
              <p className="text-sm capitalize">{log.entity_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Performed By</p>
              <p className="text-sm break-words">
                {log.performer?.full_name || log.performer?.email || 'Unknown'}
              </p>
              {log.performer?.email && log.performer?.full_name && (
                <p className="text-xs text-muted-foreground break-words">{log.performer.email}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
              <p className="text-sm">
                {format(new Date(log.created_at), 'PPpp')}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Entity ID</p>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                {log.entity_id}
              </p>
            </div>
          </div>

          {log.entity_data && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Entity Data
              </p>
              <div className="bg-muted p-4 rounded-md border">
                <pre className="text-xs overflow-auto max-h-96 break-words whitespace-pre-wrap">
                  {JSON.stringify(log.entity_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogsClient({
  initialLogs,
  initialTotal,
  users,
}: AuditLogsClientProps) {
  const [logs, setLogs] = useState<AuditLogWithPerformer[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);

  // View dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogWithPerformer | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const hasActiveFilters =
    selectedUser !== 'all' ||
    selectedAction !== 'all' ||
    selectedEntityType !== 'all' ||
    startDate !== undefined ||
    endDate !== undefined;

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAuditLogs({
        userId: selectedUser !== 'all' ? selectedUser : undefined,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        entityType: selectedEntityType !== 'all' ? selectedEntityType : undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      if (result.success) {
        setLogs(result.data.logs);
        setTotal(result.data.total);
      } else {
        setError(result.error.message);
        toast.error('Failed to load audit logs');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedUser, selectedAction, selectedEntityType, startDate, endDate, page]);

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedAction('all');
    setSelectedEntityType('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const handleViewClick = (log: AuditLogWithPerformer) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 border border-red-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <MobileFilterPanel
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        collapsible={true}
        defaultCollapsed={false}
      >
        <div className="space-y-2 w-full">
          <Label htmlFor="user-filter">User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger id="user-filter" className="w-full">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="action-filter">Action</Label>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger id="action-filter" className="w-full">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="asset_created">Asset Created</SelectItem>
              <SelectItem value="asset_updated">Asset Updated</SelectItem>
              <SelectItem value="asset_deleted">Asset Deleted</SelectItem>
              <SelectItem value="user_created">User Created</SelectItem>
              <SelectItem value="user_updated">User Updated</SelectItem>
              <SelectItem value="category_created">Category Created</SelectItem>
              <SelectItem value="category_updated">Category Updated</SelectItem>
              <SelectItem value="category_deleted">Category Deleted</SelectItem>
              <SelectItem value="department_created">Department Created</SelectItem>
              <SelectItem value="department_updated">Department Updated</SelectItem>
              <SelectItem value="department_deleted">Department Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="entity-filter">Entity Type</Label>
          <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
            <SelectTrigger id="entity-filter" className="w-full">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="department">Department</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="start-date">Start Date</Label>
          <DatePicker
            date={startDate}
            onDateChange={setStartDate}
            placeholder="Select start date"
            maxDate={endDate || new Date()}
          />
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="end-date">End Date</Label>
          <DatePicker
            date={endDate}
            onDateChange={setEndDate}
            placeholder="Select end date"
            minDate={startDate}
            maxDate={new Date()}
          />
        </div>
      </MobileFilterPanel>

      {/* Table */}
      <div className="rounded-md border">
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No audit logs found. {hasActiveFilters && 'Try adjusting your filters.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{log.entity_type}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm font-medium truncate">
                          {log.performer?.full_name || log.performer?.email || 'Unknown'}
                        </p>
                        {log.performer?.email && log.performer?.full_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {log.performer.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap">
                        <p className="text-sm">
                          {format(new Date(log.created_at), 'PP')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'p')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClick(log)}
                        aria-label="View details"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {start}-{end} of {total} records
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || isLoading}
              className="min-h-[44px] min-w-[44px]"
            >
              Previous
            </Button>
            <span className="text-sm whitespace-nowrap px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || isLoading}
              className="min-h-[44px] min-w-[44px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View Details Dialog */}
      <ViewDetailsDialog
        log={selectedLog}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
