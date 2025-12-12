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
import { WarrantyRegistrationButton } from '@/components/warranty-registration-button';
import { WarrantyStatusBadge } from '@/components/warranty-status-badge';
import type { Asset, Category, Department } from '@/types/database';

function ViewAssetDialog({
  asset,
  open,
  onOpenChange,
  currentUser,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: { id: string; email: string; full_name?: string };
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

          {/* Warranty Registration Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Warranty Management</h3>
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

interface AdminAssetsClientProps {
  assets: Asset[];
  currentUser: { id: string; email: string; full_name?: string };
}

export function AdminAssetsClient({ assets: initialAssets, currentUser }: AdminAssetsClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Asset>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Load categories and departments
  useEffect(() => {
    const loadData = async () => {
      const [categoriesResult, departmentsResult] = await Promise.all([
        getCategories(),
        getDepartments(),
      ]);

      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      }

      if (departmentsResult.success) {
        setDepartments(departmentsResult.data);
      }
    };

    loadData();
  }, []);

  // Refresh assets data
  const refreshAssets = async () => {
    setLoading(true);
    try {
      const result = await getAllAssets();
      if (result.success) {
        setAssets(result.data);
      } else {
        toast.error(result.error.message || 'Failed to refresh assets');
      }
    } catch (error) {
      toast.error('Failed to refresh assets');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter((asset) => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || asset.category_id === selectedCategory;
      const matchesDepartment = selectedDepartment === 'all' || asset.department_id === selectedDepartment;
      
      return matchesSearch && matchesCategory && matchesDepartment;
    });

    // Sort assets
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested objects
      if (sortField === 'category_id' && a.category && b.category) {
        aValue = a.category.name;
        bValue = b.category.name;
      } else if (sortField === 'department_id' && a.department && b.department) {
        aValue = a.department.name;
        bValue = b.department.name;
      }

      if (aValue != null && bValue != null) {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [assets, searchTerm, selectedCategory, selectedDepartment, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAssets.length / itemsPerPage);
  const paginatedAssets = filteredAndSortedAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedDepartment]);

  const handleSort = (field: keyof Asset) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
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

  const handleEditSuccess = () => {
    refreshAssets();
    setEditDialogOpen(false);
    setSelectedAsset(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAsset) return;

    try {
      const result = await deleteAsset(selectedAsset.id);
      if (result.success) {
        toast.success('Asset deleted successfully');
        refreshAssets();
      } else {
        toast.error(result.error.message || 'Failed to delete asset');
      }
    } catch (error) {
      toast.error('Failed to delete asset');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAsset(null);
    }
  };

  const handleSelectAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === paginatedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(paginatedAssets.map(asset => asset.id)));
    }
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedAssets(new Set());
    refreshAssets();
  };

  const SortIcon = ({ field }: { field: keyof Asset }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Asset Management</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">View and manage all assets in the system</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CreateAssetDialog />
            <BulkImportDialog onSuccess={() => { refreshAssets(); }} />
            <CsvExportButton assets={filteredAndSortedAssets} />
            {selectedAssets.size > 0 && (
              <BulkDeleteDialog
                selectedAssets={filteredAndSortedAssets.filter(asset => selectedAssets.has(asset.id))}
                onSuccess={handleBulkDeleteSuccess}
                onClearSelection={() => setSelectedAssets(new Set())}
              />
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              Manage all assets in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
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

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
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

              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <TableSkeleton columns={9} />
            ) : (
              <>
                <ResponsiveTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            className="h-8 w-8 p-0"
                          >
                            {selectedAssets.size === paginatedAssets.length && paginatedAssets.length > 0 ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('name')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Asset Name
                            <SortIcon field="name" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('category_id')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Category
                            <SortIcon field="category_id" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('department_id')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Department
                            <SortIcon field="department_id" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('cost')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Cost
                            <SortIcon field="cost" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('date_purchased')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Purchase Date
                            <SortIcon field="date_purchased" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('created_at')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Created
                            <SortIcon field="created_at" />
                          </Button>
                        </TableHead>
                        <TableHead>Warranty</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No assets found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAssets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAsset(asset.id)}
                                className="h-8 w-8 p-0"
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
                            <TableCell>{formatDate(asset.date_purchased)}</TableCell>
                            <TableCell>{formatDate(asset.created_at)}</TableCell>
                            <TableCell>
                              <WarrantyStatusBadge 
                                assetId={asset.id} 
                                className="max-w-[200px]"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
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
                                  className="min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ResponsiveTable>

                {totalPages > 1 && (
                  <div className="mt-4">
                    <TablePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={itemsPerPage}
                      totalRecords={filteredAndSortedAssets.length}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setItemsPerPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        {selectedAsset && (
          <>
            <ViewAssetDialog
              asset={selectedAsset}
              open={viewDialogOpen}
              onOpenChange={setViewDialogOpen}
              currentUser={currentUser}
            />
            <EditAssetDialog
              asset={selectedAsset}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onSuccess={handleEditSuccess}
            />
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Delete Asset
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{selectedAsset.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteConfirm}>
                    Delete Asset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}