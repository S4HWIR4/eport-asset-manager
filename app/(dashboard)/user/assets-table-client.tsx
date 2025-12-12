'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
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
import { MobileFilterPanel } from '@/components/ui/mobile-filter-panel';
import { TablePagination } from '@/components/table-pagination';
import { Search, Eye, Pencil, ArrowUp, ArrowDown, Trash2, CheckCircle } from 'lucide-react';
import { EditAssetDialog } from './edit-asset-dialog';
import { RequestDeletionDialog } from './request-deletion-dialog';
import { DeletionRequestBadge } from '@/components/deletion-request-badge';
import { DeletionRequestStatus } from './deletion-request-status';
import { AssetAuditHistory } from '../admin/assets/asset-audit-history';
import { getDeletionRequestForAsset } from '@/app/actions/deletion-requests';
import { WarrantyRegistrationButton } from '@/components/warranty-registration-button';
import { WarrantyStatusBadge } from '@/components/warranty-status-badge';
import type { Asset, DeletionRequest } from '@/types/database';

function ViewAssetDialog({
  asset,
  open,
  onOpenChange,
  deletionRequest,
  onCancelRequest,
  currentUser,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletionRequest?: DeletionRequest | null;
  onCancelRequest?: () => void;
  currentUser?: { id: string; email: string; full_name?: string };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
          <DialogDescription>
            Complete information about this asset
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Asset Information</h3>
            <div className="grid grid-cols-1 gap-4">
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

          {/* Warranty Management Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Warranty Management</h3>
            <div className="space-y-3">
              {/* Warranty Status */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Current Status</p>
                <WarrantyStatusBadge 
                  assetId={asset.id} 
                  showDetails={true}
                  autoRefresh={true}
                />
              </div>
              
              {/* Warranty Registration */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Registration</p>
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <WarrantyRegistrationButton
                      asset={asset}
                      currentUserEmail={currentUser.email}
                      currentUserName={currentUser.full_name}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {deletionRequest && (
            <div className="border-t pt-4">
              <DeletionRequestStatus 
                request={deletionRequest} 
                onCancel={onCancelRequest}
              />
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Change History</h3>
            <AssetAuditHistory assetId={asset.id} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssetsTableClient({ 
  assets: initialAssets,
  currentUser
}: { 
  assets: Asset[];
  currentUser?: { id: string; email: string; full_name?: string };
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [deletionRequests, setDeletionRequests] = useState<Record<string, DeletionRequest>>({});
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Update assets when initialAssets changes (from server refresh)
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [requestDeletionDialogOpen, setRequestDeletionDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Sort states
  const [sortColumn, setSortColumn] = useState<'name' | 'cost' | 'date_purchased' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Update assets when prop changes
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Fetch deletion requests for all assets
  useEffect(() => {
    const fetchDeletionRequests = async () => {
      setLoadingRequests(true);
      const requests: Record<string, DeletionRequest> = {};
      
      try {
        // Fetch deletion requests for each asset with timeout
        await Promise.all(
          assets.map(async (asset) => {
            try {
              const result = await getDeletionRequestForAsset(asset.id);
              if (result.success && result.data) {
                requests[asset.id] = result.data;
              }
            } catch (error) {
              // Silently fail for individual assets
              console.error(`Failed to fetch deletion request for asset ${asset.id}:`, error);
            }
          })
        );
      } catch (error) {
        console.error('Failed to fetch deletion requests:', error);
      } finally {
        setDeletionRequests(requests);
        setLoadingRequests(false);
      }
    };

    if (assets.length > 0) {
      fetchDeletionRequests();
    } else {
      setLoadingRequests(false);
    }
  }, [assets]);

  // Extract unique categories and departments from assets
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    assets.forEach((asset) => {
      if (asset.category?.name) {
        uniqueCategories.add(asset.category.name);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [assets]);

  const departments = useMemo(() => {
    const uniqueDepartments = new Set<string>();
    assets.forEach((asset) => {
      if (asset.department?.name) {
        uniqueDepartments.add(asset.department.name);
      }
    });
    return Array.from(uniqueDepartments).sort();
  }, [assets]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter((asset) => {
      // Search filter (case-insensitive)
      const matchesSearch =
        searchQuery === '' ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        categoryFilter === 'all' || asset.category?.name === categoryFilter;

      // Department filter
      const matchesDepartment =
        departmentFilter === 'all' || asset.department?.name === departmentFilter;

      return matchesSearch && matchesCategory && matchesDepartment;
    });

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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
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

  const handleRequestDeletionClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setRequestDeletionDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // Hard refresh to show updated asset
    window.location.reload();
  };

  const handleRequestDeletionSuccess = () => {
    // Hard refresh to show updated asset with deletion request
    window.location.reload();
  };

  const handleCancelRequestSuccess = () => {
    // Hard refresh to show updated asset without deletion request
    window.location.reload();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters = Boolean(searchQuery) || categoryFilter !== 'all' || departmentFilter !== 'all';

  if (assets.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4">
          No assets found. Create your first asset to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filters */}
        <MobileFilterPanel
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          collapsible={true}
          defaultCollapsed={false}
          title="Search & Filters"
        >
          <div className="space-y-2 w-full">
            <Label htmlFor="search">Search</Label>
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>

          <div className="space-y-2 w-full">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
              <SelectTrigger id="department" className="w-full">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </MobileFilterPanel>

        {/* Results count */}
        {filteredAndSortedAssets.length !== assets.length && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedAssets.length} of {assets.length} assets
          </p>
        )}

        {/* Table */}
        {filteredAndSortedAssets.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No assets match your search criteria.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('date_purchased')}
                    >
                      <div className="flex items-center gap-1">
                        Purchase Date
                        {sortColumn === 'date_purchased' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center gap-1">
                        Cost
                        {sortColumn === 'cost' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category?.name || 'N/A'}</TableCell>
                      <TableCell>{asset.department?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {formatDate(asset.date_purchased)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(asset.cost))}
                      </TableCell>
                      <TableCell>
                        {deletionRequests[asset.id] ? (
                          <DeletionRequestBadge status={deletionRequests[asset.id].status} />
                        ) : loadingRequests ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span className="text-sm text-xs">Loading...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Active</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <WarrantyStatusBadge 
                          assetId={asset.id} 
                          className="max-w-[200px]"
                        />
                      </TableCell>
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
                            onClick={() => handleRequestDeletionClick(asset)}
                            aria-label="Request deletion"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 min-h-[44px] min-w-[44px]"
                            disabled={deletionRequests[asset.id]?.status === 'pending'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={filteredAndSortedAssets.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>

      {selectedAsset && (
        <>
          <ViewAssetDialog
            asset={selectedAsset}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            deletionRequest={deletionRequests[selectedAsset.id]}
            onCancelRequest={handleCancelRequestSuccess}
            currentUser={currentUser}
          />
          <EditAssetDialog
            asset={selectedAsset}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleEditSuccess}
          />
          <RequestDeletionDialog
            asset={selectedAsset}
            open={requestDeletionDialogOpen}
            onOpenChange={setRequestDeletionDialogOpen}
            onSuccess={handleRequestDeletionSuccess}
          />
        </>
      )}
    </>
  );
}
