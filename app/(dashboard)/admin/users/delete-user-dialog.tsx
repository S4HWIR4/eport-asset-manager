'use client';

import { useState } from 'react';
import { deleteUser } from '@/app/actions/users';
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
import type { Profile } from '@/types/database';

interface DeleteUserDialogProps {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const result = await deleteUser(user.id);

    if (result.success) {
      toast.success('User deleted successfully');
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
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Full Name:</span> {user.full_name || '-'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Role:</span> {user.role}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Note: All assets created by this user will remain in the system.
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
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
