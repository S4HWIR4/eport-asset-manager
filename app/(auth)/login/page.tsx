import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import LoginForm from './login-form';
import Image from 'next/image';

export default async function LoginPage() {
  // Check if user is already logged in
  const user = await getCurrentUser();

  if (user) {
    // Redirect based on role
    if (user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/user');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Logo and App Name */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/eport-logo.webp"
              alt="ePort Logo"
              width={200}
              height={60}
              priority
              className="h-auto w-auto max-w-[200px]"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Asset Manager
          </h1>
        </div>

        {/* Login Card */}
        <div className="rounded-lg bg-white dark:bg-card p-6 sm:p-8 shadow-md">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Sign In
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Enter your credentials to access your account
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
