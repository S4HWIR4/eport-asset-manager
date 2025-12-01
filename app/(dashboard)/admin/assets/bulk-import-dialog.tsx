'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { bulkImportAssets } from '@/app/actions/assets';
import type { Asset } from '@/types/database';

interface ImportResult {
  success: boolean;
  row: number;
  data?: any;
  error?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

export function BulkImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setSummary(null);
    }
  };

  const downloadTemplate = () => {
    const template = 'name,category,department,date_purchased,cost\n' +
      'Laptop,Electronics,IT,2024-01-15,1200.00\n' +
      'Office Chair,Furniture,HR,2024-02-20,350.50\n' +
      'Software License,Software,IT,2024-03-10,500.00';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      values.push(current.trim());
      return values;
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setSummary(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('CSV file must contain a header row and at least one data row');
        setIsImporting(false);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const requiredHeaders = ['name', 'category', 'department', 'date_purchased', 'cost'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        setIsImporting(false);
        return;
      }

      const dataRows = rows.slice(1);
      const results: ImportResult[] = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header and 0-index
        
        setProgress(Math.round(((i + 1) / dataRows.length) * 100));

        try {
          const assetData: any = {};
          headers.forEach((header, index) => {
            assetData[header] = row[index]?.trim() || '';
          });

          // Validate required fields
          if (!assetData.name) {
            throw new Error('Name is required');
          }
          if (!assetData.category) {
            throw new Error('Category is required');
          }
          if (!assetData.department) {
            throw new Error('Department is required');
          }
          if (!assetData.date_purchased) {
            throw new Error('Date purchased is required');
          }
          if (!assetData.cost) {
            throw new Error('Cost is required');
          }

          // Validate cost is a number
          const cost = parseFloat(assetData.cost);
          if (isNaN(cost) || cost <= 0) {
            throw new Error('Cost must be a positive number');
          }

          // Validate date format
          const date = new Date(assetData.date_purchased);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date format (use YYYY-MM-DD)');
          }

          const result = await bulkImportAssets({
            name: assetData.name,
            category: assetData.category,
            department: assetData.department,
            date_purchased: assetData.date_purchased,
            cost: cost,
          });

          if (result.success) {
            results.push({ success: true, row: rowNumber, data: result.data });
            successful++;
          } else {
            results.push({ success: false, row: rowNumber, error: result.error.message });
            failed++;
          }
        } catch (error: any) {
          results.push({ success: false, row: rowNumber, error: error.message });
          failed++;
        }
      }

      setSummary({
        total: dataRows.length,
        successful,
        failed,
        results,
      });

      if (successful > 0) {
        toast.success(`Successfully imported ${successful} asset(s)`);
        
        // Hard refresh to show imported assets
        window.location.reload();
      }
      
      if (failed > 0) {
        toast.error(`Failed to import ${failed} asset(s)`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setSummary(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Assets</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple assets at once
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Download CSV Template</p>
              <p className="text-xs text-muted-foreground">
                Get a sample CSV file with the correct format
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="csv-file" className="text-sm font-medium">
              Select CSV File
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 border rounded-lg text-center bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="p-3 border rounded-lg text-center bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {summary.failed > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                  <p className="text-sm font-medium">Failed Imports:</p>
                  {summary.results
                    .filter(r => !r.success)
                    .map((result, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Row {result.row}:</span>{' '}
                          <span className="text-muted-foreground">{result.error}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            {summary ? 'Close' : 'Cancel'}
          </Button>
          {!summary && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || isImporting}
            >
              {isImporting ? 'Importing...' : 'Import Assets'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
