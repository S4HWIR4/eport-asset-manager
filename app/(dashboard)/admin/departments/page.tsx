'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDepartments } from '@/app/actions/departments';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { TableSkeleton } from '@/components/table-skeleton';
import { TablePagination } from '@/components/table-pagination';
import { Search, ArrowUp, ArrowDown, Pencil, Trash2, CheckSquare, Square } from 'lucide-react';
import { CreateDepartmentDialog } from './create-department-dialog';
import { EditDepartmentDialog } from './edit-department-dialog';
import { DeleteDepartmentDialog } from './delete-department-dialog';
import { BulkDeleteDialog } from '@/components/bulk-delete-dialog';
import { deleteDepartment } from '@/app/actions/departments';
import { formatDate } from '@/lib/utils';
import type { Department } from '@/types/database';

function DepartmentsTable({ departments, onRefresh }: { departments: Department[]; onRefresh: () => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // Selection states for bulk operations
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());

  // Filter and sort departments
  const filteredAndSortedDepartments = useMemo(() => {
    let filtered = departments.filter((department) =>
      searchQuery === '' ||
      department.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
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
  }, [departments, searchQuery, sortColumn, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedDepartments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDepartments = filteredAndSortedDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

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

  // Selection handlers
  const toggleDepartmentSelection = (departmentId: string) => {
    setSelectedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };

  const toggleAllDepartments = () => {
    if (selectedDepartments.size === paginatedDepartments.length) {
      setSelectedDepartments(new Set());
    } else {
      setSelectedDepartments(new Set(paginatedDepartments.map(d => d.id)));
    }
  };

  const clearSelection = () => {
    setSelectedDepartments(new Set());
  };

  const getSelectedDepartmentObjects = (): Department[] => {
    return departments.filter(department => selectedDepartments.has(department.id));
  };

  if (departments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4">
          No departments found. Create your first department to get started.
        </p>
        <CreateDepartmentDialog />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedDepartments.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            {selectedDepartments.size} department(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
            <BulkDeleteDialog
              selectedItems={getSelectedDepartmentObjects()}
              onSuccess={onRefresh}
              onClearSelection={clearSelection}
              deleteFunction={deleteDepartment}
              getItemId={(dept) => dept.id}
              getItemName={(dept) => dept.name}
              entityName="department"
              entityNamePlural="departments"
            />
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-2 w-full md:max-w-sm">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>
        {searchQuery && (
          <Button variant="ghost" onClick={() => setSearchQuery('')} size="sm" className="w-full md:w-auto">
            Clear search
          </Button>
        )}
      </div>

      {/* Results count */}
      {filteredAndSortedDepartments.length !== departments.length && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedDepartments.length} of {departments.length} departments
        </p>
      )}

      {/* Table */}
      {filteredAndSortedDepartments.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No departments match your search.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveTable>
            <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleAllDepartments}
                      className="h-8 w-8 p-0"
                    >
                      {selectedDepartments.size === paginatedDepartments.length && paginatedDepartments.length > 0 ? (
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
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created At
                      {sortColumn === 'created_at' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
            {paginatedDepartments.map((department) => (
              <TableRow key={department.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDepartmentSelection(department.id)}
                    className="h-8 w-8 p-0"
                  >
                    {selectedDepartments.has(department.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell>
                  {formatDate(department.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDepartment(department);
                        setEditDialogOpen(true);
                      }}
                      aria-label="Edit department"
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDepartment(department);
                        setDeleteDialogOpen(true);
                      }}
                      aria-label="Delete department"
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </ResponsiveTable>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredAndSortedDepartments.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
        </>
      )}

      {selectedDepartment && (
        <>
          <EditDepartmentDialog
            department={selectedDepartment}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={onRefresh}
          />
          <DeleteDepartmentDialog
            department={selectedDepartment}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={onRefresh}
          />
        </>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDepartments() {
    setIsLoading(true);
      const result = await getDepartments();
      
      if (result.success) {
        setDepartments(result.data);
      } else {
        setError(result.error.message);
      }
      
      setIsLoading(false);
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Department Management</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Manage organizational departments</p>
          </div>
          <CreateDepartmentDialog />
        </div>

        <Card className="p-4 md:py-6">
          <CardHeader className="px-0">
            <CardTitle>All Departments</CardTitle>
            <CardDescription>
              Manage your organizational departments
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <TableSkeleton columns={2} rows={10} />
            ) : (
              <DepartmentsTable departments={departments} onRefresh={loadDepartments} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
