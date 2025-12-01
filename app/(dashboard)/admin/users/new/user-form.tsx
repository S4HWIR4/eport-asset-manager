'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/app/actions/users';
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
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@/types/database';

export function UserForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const validateEmail = (value: string) => {
    if (!value) return true;
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
    if (!value) return true;
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email') as string;
    const passwordValue = formData.get('password') as string;
    const role = formData.get('role') as UserRole;
    const full_name = formData.get('full_name') as string;

    // Final validation
    const isEmailValid = validateEmail(emailValue);
    const isPasswordValid = validatePassword(passwordValue);

    if (!isEmailValid || !isPasswordValid) {
      setIsSubmitting(false);
      return;
    }

    const result = await createUser({
      email: emailValue,
      password: passwordValue,
      role,
      full_name: full_name || undefined,
    });

    if (result.success) {
      toast.success('User created successfully');
      router.push('/admin/users');
      router.refresh();
    } else {
      if (result.error.field) {
        setErrors({ [result.error.field]: result.error.message });
      } else {
        toast.error(result.error.message);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@eport.cloud"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validateEmail(e.target.value);
          }}
          onBlur={() => validateEmail(email)}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Tinashe Marufu"
          disabled={isSubmitting}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter a secure password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validatePassword(e.target.value);
            }}
            onBlur={() => validatePassword(password)}
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
        <p className="text-sm text-muted-foreground">
          Must be at least 8 characters with uppercase, lowercase, and numbers
        </p>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-red-500">*</span>
        </Label>
        <Select name="role" required disabled={isSubmitting}>
          <SelectTrigger>
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

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/users')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
