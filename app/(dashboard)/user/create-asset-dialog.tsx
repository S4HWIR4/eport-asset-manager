'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAsset } from '@/app/actions/assets';
import { getCategories } from '@/app/actions/categories';
import { getDepartments } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { dateToISOString } from '@/lib/utils';
import type { Category, Department } from '@/types/database';

export function CreateAssetDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [datePurchased, setDatePurchased] = useState<Date | undefined>(undefined);
  const [cost, setCost] = useState('');

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

  // Load categories and departments when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    const result = await createAsset({
      name: name.trim(),
      category_id: categoryId,
      department_id: departmentId,
      date_purchased: dateToISOString(datePurchased!),
      cost: parseFloat(cost),
    });

    if (result.success) {
      toast.success('Asset created successfully');
      setOpen(false);
      
      // Hard refresh the page to show the new asset
      window.location.reload();
      
      // Reset form
      setName('');
      setCategoryId('');
      setDepartmentId('');
      setDatePurchased(undefined);
      setCost('');
      setErrors({});
    } else {
      if (result.error.details) {
        setErrors(result.error.details);
      } else if (result.error.field) {
        setErrors({ [result.error.field]: result.error.message });
      } else {
        toast.error(result.error.message);
      }
    }
    
    setIsSubmitting(false);
  }

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Asset</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Asset</DialogTitle>
            <DialogDescription>
              Add a new asset to track in your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Asset Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="MacBook Pro 16-inch"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value) validateName(e.target.value);
                }}
                onBlur={() => name && validateName(name)}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">
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
              <Label htmlFor="department_id">
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
                maxDate={(() => {
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  return today;
                })()}
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
                placeholder="1299.99"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  if (e.target.value) validateCost(e.target.value);
                }}
                onBlur={() => cost && validateCost(cost)}
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingData}>
              {isSubmitting ? 'Creating...' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
