'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllAssets, deleteAsset } from '@/app/actions/assets';
import { getCategories } from '@/app/actions/categories';
import { getDepartments } from '@/app/actions/departments';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/table-skeleton';
import { TablePagination } from '@/components/table-pagination';
import { Trash2, Eye, Pencil, Search, ArrowUp, ArrowDown, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { CreateAssetDialog } from '@/app/(dashboard)/user/create-asset-dialog';
import { EditAssetDialog } from '@/app/(dashboard)/user/edit-asset-dialog';
import { BulkImportDialog } from './bulk-import-dialog';
import { BulkDeleteDialog } from './bulk-delete-dialog';
import { CsvExportButton } from './csv-export-button';
import { AssetAuditHistory } from './asset-audit-history';
import type { Asset, Category, Department } from '@/types/database';

function ViewAssetDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
          <DialogDescription>
            Complete information about this asset
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Asset Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Asset Name</p>
                <p className="text-sm font-semibold">{asset.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                <p className="text-sm">{asset.category?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Department</p>
                <p className="text-sm">{asset.department?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Cost</p>
                <p className="text-sm font-semibold">{formatCurrency(Number(asset.cost))}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Purchase Date</p>
                <p className="text-sm">{formatDate(asset.date_purchased)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Created By</p>
                <p className="text-sm">{asset.creator?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Created At</p>
                <p className="text-sm">{new Date(asset.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm">{new Date(asset.updated_at).toLocaleString()}</p>
              </div>
              {asset.updater && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated By</p>
                  <p className="text-sm">{asset.updater.email}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Audit History</h3>
            <AssetAuditHistory assetId={asset.id} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onDelete,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAsset(asset.id);

    if (result.success) {
      toast.success('Asset deleted successfully');
      onDelete();
      onOpenChange(false);
    } else {
      toast.error(result.error.message);
    }

    setIsDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Asset</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this asset? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Name:</span> {asset.name}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Category:</span>{' '}
              {asset.category?.name || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Department:</span>{' '}
              {asset.department?.name || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Cost:</span> {formatCurrency(Number(asset.cost))}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            {isDeleting ? 'Deleting...' : 'Delete Asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetsTable({ 
  assets, 
  categories,
  departments,
  onAssetDeleted 
}: { 
  assets: Asset[]; 
  categories: Category[];
  departments: Department[];
  onAssetDeleted: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Selection states for bulk operations
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Sort states
  const [sortColumn, setSortColumn] = useState<'name' | 'cost' | 'date_purchased' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.category?.name.toLowerCase().includes(query) ||
          asset.department?.name.toLowerCase().includes(query) ||
          asset.creator?.email?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.category_id === categoryFilter);
    }

    // Apply department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.department_id === departmentFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'cost':
          aValue = Number(a.cost);
          bValue = Number(b.cost);
          break;
        case 'date_purchased':
          aValue = new Date(a.date_purchased).getTime();
          bValue = new Date(b.date_purchased).getTime();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [assets, searchQuery, categoryFilter, departmentFilter, sortColumn, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedAssets.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = filteredAndSortedAssets.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, departmentFilter, pageSize]);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleViewClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewDialogOpen(true);
  };

  const handleEditClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    setSelectedAsset(null);
    onAssetDeleted();
  };

  const handleEditSuccess = () => {
    onAssetDeleted(); // Refresh the data
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || departmentFilter !== 'all';

  // Selection handlers
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const toggleAllAssets = () => {
    if (selectedAssets.size === paginatedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(paginatedAssets.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  const getSelectedAssetObjects = (): Asset[] => {
    return assets.filter(asset => selectedAssets.has(asset.id));
  };

  if (assets.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4">
          No assets found in the system.
        </p>
        <CreateAssetDialog />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        {selectedAssets.size > 0 && (
          <div className="flex flex-col gap-3 p-3 bg-muted rounded-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              {selectedAssets.size} asset(s) selected
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearSelection}
                className="min-h-[44px] min-w-[44px]"
              >
                Clear Selection
              </Button>
              <BulkDeleteDialog
                selectedAssets={getSelectedAssetObjects()}
                onSuccess={onAssetDeleted}
                onClearSelection={clearSelection}
              />
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-1">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 min-h-[44px]"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full min-h-[44px] sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full min-h-[44px] sm:w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              onClick={clearFilters} 
              size="sm" 
              className="w-full min-h-[44px] sm:w-auto sm:self-end"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Table */}
        <ResponsiveTable>
          <div className="rounded-md border">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllAssets}
                    className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]"
                    aria-label="Toggle all assets selection"
                  >
                    {selectedAssets.size === paginatedAssets.length && paginatedAssets.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No assets match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAssetSelection(asset.id)}
                        className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]"
                        aria-label={`Toggle selection for ${asset.name}`}
                      >
                        {selectedAssets.has(asset.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category?.name || 'N/A'}</TableCell>
                    <TableCell>{asset.department?.name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(Number(asset.cost))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(asset)}
                          aria-label="View asset details"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(asset)}
                          aria-label="Edit asset"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(asset)}
                          aria-label="Delete asset"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </ResponsiveTable>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredAndSortedAssets.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {selectedAsset && (
        <>
          <ViewAssetDialog
            asset={selectedAsset}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
          />
          <EditAssetDialog
            asset={selectedAsset}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleEditSuccess}
          />
          <DeleteAssetDialog
            asset={selectedAsset}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDelete={handleDeleteSuccess}
          />
        </>
      )}
    </>
  );
}

function ErrorDialog({
  error,
  open,
  onOpenChange,
  onRetry,
}: {
  error: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>Error Loading Assets</DialogTitle>
          </div>
          <DialogDescription>
            There was a problem loading the assets data.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px]"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onRetry();
            }}
            className="min-h-[44px]"
          >
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    const [assetsResult, categoriesResult, departmentsResult] = await Promise.all([
      getAllAssets(),
      getCategories(),
      getDepartments(),
    ]);

    if (assetsResult.success) {
      setAssets(assetsResult.data);
    } else {
      setError(assetsResult.error.message);
      setErrorDialogOpen(true);
    }

    if (categoriesResult.success) {
      setCategories(categoriesResult.data);
    }

    if (departmentsResult.success) {
      setDepartments(departmentsResult.data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Asset Management</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">View and manage all assets in the system</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CsvExportButton assets={assets} />
            <BulkImportDialog onSuccess={loadData} />
            <CreateAssetDialog />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Assets</CardTitle>
            <CardDescription>
              All assets created by users across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={4} rows={10} />
            ) : (
              <AssetsTable 
                assets={assets} 
                categories={categories}
                departments={departments}
                onAssetDeleted={loadData} 
              />
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <ErrorDialog
          error={error}
          open={errorDialogOpen}
          onOpenChange={setErrorDialogOpen}
          onRetry={loadData}
        />
      )}
    </div>
  );
}
