'use client';

import { useState, useEffect } from 'react';
import { updateAsset } from '@/app/actions/assets';
import { getCategories } from '@/app/actions/categories';
import { getDepartments } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { dateToISOString } from '@/lib/utils';
import type { Asset, Category, Department } from '@/types/database';

interface EditAssetDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditAssetDialog({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: EditAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState(asset.name);
  const [categoryId, setCategoryId] = useState(asset.category_id);
  const [departmentId, setDepartmentId] = useState(asset.department_id);
  const [datePurchased, setDatePurchased] = useState<Date | undefined>(
    asset.date_purchased ? new Date(asset.date_purchased + 'T00:00:00') : undefined
  );
  const [cost, setCost] = useState(String(asset.cost));

  const validateName = (value: string) => {
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, name: 'Asset name is required' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.name;
      return newErrors;
    });
    return true;
  };

  const validateCost = (value: string) => {
    if (!value) {
      setErrors(prev => ({ ...prev, cost: 'Cost is required' }));
      return false;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setErrors(prev => ({ ...prev, cost: 'Cost must be a positive number' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.cost;
      return newErrors;
    });
    return true;
  };

  // Load categories and departments
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      
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
      
      setIsLoadingData(false);
    }

    if (open) {
      loadData();
    }
  }, [open]);

  // Reset form when asset changes
  useEffect(() => {
    setName(asset.name);
    setCategoryId(asset.category_id);
    setDepartmentId(asset.department_id);
    setDatePurchased(asset.date_purchased ? new Date(asset.date_purchased + 'T00:00:00') : undefined);
    setCost(String(asset.cost));
    setErrors({});
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validate required fields
    const validationErrors: Record<string, string> = {};
    if (!name.trim()) validationErrors.name = 'Asset name is required';
    if (!categoryId) validationErrors.category_id = 'Category is required';
    if (!departmentId) validationErrors.department_id = 'Department is required';
    if (!datePurchased) validationErrors.date_purchased = 'Purchase date is required';
    if (!cost || parseFloat(cost) <= 0) validationErrors.cost = 'Valid cost is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    const result = await updateAsset(asset.id, {
      name: name.trim(),
      category_id: categoryId,
      department_id: departmentId,
      date_purchased: dateToISOString(datePurchased!),
      cost: parseFloat(cost),
    });

    if (result.success) {
      toast.success('Asset updated successfully');
      onOpenChange(false);
      
      // Hard refresh to show updated asset
      window.location.reload();
    } else {
      if (result.error.details) {
        setErrors(result.error.details);
      }
      toast.error(result.error.message);
    }

    setIsSubmitting(false);
  };

  // Convert categories and departments to combobox options
  const categoryOptions: ComboboxOption[] = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const departmentOptions: ComboboxOption[] = departments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset information below
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Asset Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value) validateName(e.target.value);
                }}
                onBlur={() => name && validateName(name)}
                placeholder="MacBook Pro 16-inch"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              {isLoadingData ? (
                <div className="flex items-center gap-2 h-10 px-3 py-2 border border-input rounded-md bg-background">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading categories...</span>
                </div>
              ) : (
                <Combobox
                  options={categoryOptions}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Select a category"
                  searchPlaceholder="Search categories..."
                  emptyText="No category found."
                  disabled={isSubmitting}
                />
              )}
              {errors.category_id && (
                <p className="text-sm text-red-600">{errors.category_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">
                Department <span className="text-red-500">*</span>
              </Label>
              {isLoadingData ? (
                <div className="flex items-center gap-2 h-10 px-3 py-2 border border-input rounded-md bg-background">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading departments...</span>
                </div>
              ) : (
                <Combobox
                  options={departmentOptions}
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  placeholder="Select a department"
                  searchPlaceholder="Search departments..."
                  emptyText="No department found."
                  disabled={isSubmitting}
                />
              )}
              {errors.department_id && (
                <p className="text-sm text-red-600">{errors.department_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_purchased">
                Purchase Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                date={datePurchased}
                onDateChange={setDatePurchased}
                placeholder="Pick a purchase date"
                maxDate={new Date()}
                disabled={isSubmitting}
              />
              {errors.date_purchased && (
                <p className="text-sm text-red-600">{errors.date_purchased}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">
                Cost <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0.01"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  if (e.target.value) validateCost(e.target.value);
                }}
                onBlur={() => cost && validateCost(cost)}
                placeholder="1299.99"
                disabled={isSubmitting}
              />
              {errors.cost && (
                <p className="text-sm text-red-600">{errors.cost}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingData}>
              {isSubmitting ? 'Updating...' : 'Update Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
