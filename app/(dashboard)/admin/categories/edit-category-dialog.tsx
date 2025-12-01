'use client';

import { useState, useEffect } from 'react';
import { updateCategory } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Category } from '@/types/database';

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: EditCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(category.name);

  // Reset form when category changes
  useEffect(() => {
    setName(category.name);
    setErrors({});
  }, [category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const result = await updateCategory(category.id, { name });

    if (result.success) {
      toast.success('Category updated successfully');
      onOpenChange(false);
      
      // Hard refresh to show updated category
      window.location.reload();
    } else {
      if (result.error.field) {
        setErrors({ [result.error.field]: result.error.message });
      } else {
        toast.error(result.error.message);
      }
    }
    
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category information below
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Electronics, Furniture, Software"
                required
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
