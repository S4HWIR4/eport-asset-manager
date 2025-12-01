'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types/database';

interface ViewUserDialogProps {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewUserDialog({ user, open, onOpenChange }: ViewUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Complete information about this user account
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
                {user.email}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">
                {user.full_name || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>

            {/* Role */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
              <div className="flex items-center">
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
            </div>

            {/* User ID */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">User ID</p>
              <p className="text-xs font-mono bg-muted px-3 py-2 rounded-md break-all">
                {user.id}
              </p>
            </div>

            {/* Created At */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Account Created</p>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">
                {new Date(user.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            {/* Updated At */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">
                {new Date(user.updated_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          {/* Password Information */}
          <div className="border-t pt-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Password Security
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    For security reasons, passwords are encrypted and cannot be retrieved or displayed. 
                    If the user needs to reset their password, use the Edit function to set a new password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
