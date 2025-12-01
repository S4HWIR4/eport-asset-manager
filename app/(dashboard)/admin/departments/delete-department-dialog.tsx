'use client';

import { useState } from 'react';
import { deleteDepartment } from '@/app/actions/departments';
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
import type { Department } from '@/types/database';

interface DeleteDepartmentDialogProps {
  department: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteDepartmentDialog({
  department,
  open,
  onOpenChange,
  onSuccess,
}: DeleteDepartmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const result = await deleteDepartment(department.id);

    if (result.success) {
      toast.success('Department deleted successfully');
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
          <DialogTitle>Delete Department</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this department? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Name:</span> {department.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Note: You cannot delete a department that is assigned to assets.
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
            {isDeleting ? 'Deleting...' : 'Delete Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
