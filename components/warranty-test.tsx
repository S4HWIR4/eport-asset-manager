'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { registerAssetWarranty, checkWarrantyStatus } from '@/app/actions/warranty';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

export function WarrantyTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [assetId, setAssetId] = useState('TEST-ASSET-' + Date.now());
  const [assetName, setAssetName] = useState('Test Asset Device');
  const [userEmail, setUserEmail] = useState('test@example.com');
  const [userName, setUserName] = useState('Test User');

  const clearResult = () => setTestResult(null);

  const testConnection = async () => {
    setIsLoading(true);
    clearResult();

    try {
      // Import the API client dynamically to test connection
      const { getWarrantyApiClient } = await import('@/lib/warranty-api-client');
      const apiClient = getWarrantyApiClient();
      
      const isConnected = await apiClient.testConnection();
      
      if (isConnected) {
        setTestResult({
          type: 'success',
          message: 'Successfully connected to warranty API at vm6.eport.ws',
        });
      } else {
        setTestResult({
          type: 'error',
          message: 'Failed to connect to warranty API. Service may be unavailable.',
        });
      }
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRegistration = async () => {
    setIsLoading(true);
    clearResult();

    try {
      const result = await registerAssetWarranty({
        asset_id: assetId,
        asset_name: assetName,
        user_email: userEmail,
        user_name: userName,
        warranty_period_months: 12,
        notes: 'Test registration from Next.js app',
      });

      if (result.success) {
        setTestResult({
          type: 'success',
          message: 'Warranty registration successful!',
          details: result.data,
        });
      } else {
        setTestResult({
          type: 'error',
          message: 'Registration failed',
          details: result.error,
        });
      }
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Registration test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testStatusCheck = async () => {
    setIsLoading(true);
    clearResult();

    try {
      const result = await checkWarrantyStatus(assetId);

      if (result.success) {
        setTestResult({
          type: 'success',
          message: result.data.registered 
            ? 'Asset warranty found!' 
            : 'Asset not registered for warranty',
          details: result.data,
        });
      } else {
        setTestResult({
          type: 'error',
          message: 'Status check failed',
          details: result.error,
        });
      }
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Status check test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewAssetId = () => {
    setAssetId('TEST-ASSET-' + Date.now());
  };

  const getResultIcon = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label htmlFor="assetId">Asset ID</Label>
            <div className="flex gap-2">
              <Input
                id="assetId"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="Enter asset ID"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateNewAssetId}
                disabled={isLoading}
              >
                New ID
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="assetName">Asset Name</Label>
            <Input
              id="assetName"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Enter asset name"
            />
          </div>

          <div>
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email"
            />
          </div>

          <div>
            <Label htmlFor="userName">User Name</Label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter user name"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Button
              onClick={testConnection}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test API Connection
            </Button>

            <Button
              onClick={testRegistration}
              disabled={isLoading || !assetId || !assetName || !userEmail}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test Warranty Registration
            </Button>

            <Button
              onClick={testStatusCheck}
              disabled={isLoading || !assetId}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test Status Check
            </Button>
          </div>

          {testResult && (
            <Alert className={`${
              testResult.type === 'success' ? 'border-green-200 bg-green-50' :
              testResult.type === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start gap-2">
                {getResultIcon(testResult.type)}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    <div className="font-medium mb-1">{testResult.message}</div>
                    {testResult.details && (
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p><strong>API Endpoint:</strong> http://vm6.eport.ws/register</p>
        <p><strong>Environment:</strong> {process.env.NEXT_PUBLIC_APP_ENV || 'development'}</p>
        <p><strong>Debug Mode:</strong> {process.env.NEXT_PUBLIC_DEBUG_API === 'true' ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
}