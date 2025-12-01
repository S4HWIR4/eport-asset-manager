'use client';

import { useState } from 'react';
import { deleteCategory } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
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

interface DeleteCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const result = await deleteCategory(category.id);

    if (result.success) {
      toast.success('Category deleted successfully');
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error.message);
    }
    
    setIsDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this category? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Name:</span> {category.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Note: You cannot delete a category that is assigned to assets.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
