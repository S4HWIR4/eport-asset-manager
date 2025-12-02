'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Asset } from '@/types/database';

export function CsvExportButton({ assets }: { assets: Asset[] }) {
  const exportToCSV = () => {
    if (assets.length === 0) {
      toast.error('No assets to export');
      return;
    }

    // Create CSV header
    const headers = ['Name', 'Category', 'Department', 'Date Purchased', 'Cost', 'Created By', 'Created At'];
    
    // Create CSV rows
    const rows = assets.map(asset => [
      asset.name,
      asset.category?.name || '',
      asset.department?.name || '',
      asset.date_purchased,
      asset.cost,
      asset.creator?.email || '',
      new Date(asset.created_at).toLocaleString(),
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape cells that contain commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${assets.length} asset(s) to CSV`);
  };

  return (
    <Button variant="outline" onClick={exportToCSV} className="min-h-[44px] min-w-[44px]">
      <FileDown className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
