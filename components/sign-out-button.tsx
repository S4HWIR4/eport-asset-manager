'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} variant="outline" className="gap-2">
      <LogOut className="w-4 h-4" />
      Sign Out
    </Button>
  );
}
