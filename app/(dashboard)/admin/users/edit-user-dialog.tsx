'use client';

import { useState, useEffect } from 'react';
import { updateUser } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import type { Profile } from '@/types/database';

interface EditUserDialogProps {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.email;
      return newErrors;
    });
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      // Password is optional for edit
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
      return true;
    }
    if (value.length < 8) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      setErrors(prev => ({ ...prev, password: 'Password must contain an uppercase letter' }));
      return false;
    }
    if (!/[a-z]/.test(value)) {
      setErrors(prev => ({ ...prev, password: 'Password must contain a lowercase letter' }));
      return false;
    }
    if (!/[0-9]/.test(value)) {
      setErrors(prev => ({ ...prev, password: 'Password must contain a number' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.password;
      return newErrors;
    });
    return true;
  };

  // Reset form when user changes
  useEffect(() => {
    setEmail(user.email);
    setFullName(user.full_name || '');
    setRole(user.role);
    setPassword('');
    setShowPassword(false);
    setErrors({});
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      setIsSubmitting(false);
      return;
    }

    const updateData: any = {
      email,
      full_name: fullName || undefined,
      role,
    };

    // Only include password if it's been changed
    if (password) {
      updateData.password = password;
    }

    const result = await updateUser(user.id, updateData);

    if (result.success) {
      toast.success('User updated successfully');
      onOpenChange(false);
      
      // Hard refresh to show updated user
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user information below
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(email)}
                placeholder="you@eport.cloud"
                required
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tinashe Marufu"
                disabled={isSubmitting}
              />
              {errors.full_name && (
                <p className="text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'user' | 'admin')} disabled={isSubmitting}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                New Password <span className="text-muted-foreground">(leave blank to keep current)</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Enter new password"
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
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
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
