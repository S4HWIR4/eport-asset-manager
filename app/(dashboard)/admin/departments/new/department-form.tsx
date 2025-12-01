'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDepartment } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function DepartmentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    const result = await createDepartment({ name });

    if (result.success) {
      toast.success('Department created successfully');
      router.push('/admin/departments');
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
        <Label htmlFor="name">
          Department Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="e.g., IT, HR, Finance, Operations"
          required
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Department'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/departments')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
