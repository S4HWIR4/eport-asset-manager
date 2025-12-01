'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCategory } from '@/app/actions/categories';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function CreateCategoryDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    const result = await createCategory({ name });

    if (result.success) {
      toast.success('Category created successfully');
      setOpen(false);
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      
      // Hard refresh to show new category
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Category</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new asset category to organize your assets.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
