# UI/UX Standards for Asset Manager

This document defines the standard patterns and practices for building consistent, accessible, and user-friendly interfaces across the Asset Manager application.

## Color System

### Primary Colors
- **Primary**: Purple/Magenta `oklch(0.55 0.25 295)` - Use for primary actions, active states, and brand elements
- **Primary Foreground**: White `oklch(1 0 0)` - Text on primary backgrounds

### Semantic Colors
- **Success**: Green `#10b981` (emerald-500) - Successful operations, confirmations
- **Warning**: Amber `#f59e0b` (amber-500) - Warnings, cautions
- **Error/Destructive**: Red `oklch(0.577 0.245 27.325)` - Errors, destructive actions, validation failures
- **Info**: Blue `#3b82f6` (blue-500) - Informational messages, neutral indicators

### Neutral Colors
- **Background**: White/Dark `var(--background)`
- **Foreground**: Dark/Light `var(--foreground)`
- **Muted**: Gray `var(--muted)` - Disabled states, secondary text
- **Border**: Light Gray `var(--border)` - Borders, dividers

## Modal/Dialog Standards

### Size Guidelines
- **Small**: `max-w-[400px]` - Simple forms (1-2 fields)
- **Medium**: `max-w-[500px]` - Standard forms (3-5 fields) - **DEFAULT**
- **Large**: `max-w-[700px]` - Complex forms (6+ fields), View/Detail modals
- **Extra Large**: `max-w-[900px]` - Multi-section forms
- **Half Page**: `max-w-[50vw]` - Detailed view modals with extensive information

### Structure
All CRUD modals must follow this structure:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Action Name</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[500px]">
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Action Title</DialogTitle>
        <DialogDescription>
          Brief description of what this action does
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4 space-y-4">
        {/* Form fields here */}
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
          {isSubmitting ? 'Processing...' : 'Submit'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### Modal Behavior
- Close on successful submission
- Reset form on close
- Show loading state during submission
- Display inline validation errors
- Prevent closing during submission
- Use toast notifications for success/error feedback

### View/Detail Modals
For displaying detailed information (read-only):

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[700px]">
    <DialogHeader>
      <DialogTitle>Asset Details</DialogTitle>
      <DialogDescription>
        Complete information about this asset
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Field Name</p>
          <p className="text-sm">{value}</p>
        </div>
        {/* More fields */}
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Action Buttons in Tables
- **View**: Eye icon, ghost variant - Opens detail modal
- **Edit**: Pencil icon, ghost variant - Opens edit form
- **Delete**: Trash icon, ghost variant with red color - Opens confirmation dialog
- Group action buttons in the rightmost column labeled "Actions"

## Loading States

### Skeleton Loaders
Use skeleton loaders for all async data loading:

```tsx
<Suspense fallback={<TableSkeleton columns={5} rows={10} />}>
  <DataTable />
</Suspense>
```

### Loading Indicators
- **Button Loading**: Show "Processing..." text and disable button
- **Table Loading**: Use `<TableSkeleton />` component
- **Card Loading**: Use `<Skeleton />` for individual elements
- **Page Loading**: Use multiple skeleton cards matching the layout

### Skeleton Component Usage
```tsx
// Single element
<Skeleton className="h-4 w-32" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-4 w-48" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-4 w-24" />
  </CardContent>
</Card>
```

## Table Standards

### Pagination
- **Default Page Size**: 10 records
- **Page Size Options**: [10, 25, 50, 100]
- **Always show pagination controls** when data exists
- Display total count: "Showing X-Y of Z records"

### Filtering and Sorting
All data tables should include appropriate filtering and sorting capabilities:

#### Search/Filter Bar
- Place above the table, below the page header
- Use `<Input>` with search icon for text search
- Debounce search input (300ms) to avoid excessive filtering
- Show filter count badge when filters are active
- Include "Clear filters" button when filters are applied

#### Column Filters
- **Select Filters**: Use `<Select>` for categorical data (category, department, role, status)
- **Multi-select**: Allow multiple selections for better filtering
- **Date Range**: Use date inputs for date-based filtering
- **Number Range**: Use min/max inputs for numeric filtering

#### Sorting
- **Clickable Headers**: Make column headers clickable to sort
- **Sort Indicators**: Show arrow icons (↑↓) to indicate sort direction
- **Default Sort**: Apply sensible default sorting (usually by created_at DESC)
- **Multi-column Sort**: Support sorting by multiple columns when needed

#### Filter/Sort UI Pattern
```tsx
<div className="space-y-4">
  {/* Filter Bar */}
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-1 gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {/* Category options */}
        </SelectContent>
      </Select>
    </div>
    {hasActiveFilters && (
      <Button variant="ghost" onClick={clearFilters}>
        Clear filters
      </Button>
    )}
  </div>

  {/* Table with sortable headers */}
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer select-none"
            onClick={() => handleSort('name')}
          >
            <div className="flex items-center gap-1">
              Name
              {sortColumn === 'name' && (
                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              )}
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
    </Table>
  </div>
</div>
```

### Table Structure
```tsx
<div className="space-y-4">
  {/* Table */}
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column 1</TableHead>
          {/* More columns */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.field}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* Pagination */}
  <div className="flex items-center justify-between">
    <div className="text-sm text-muted-foreground">
      Showing {start}-{end} of {total} records
    </div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
      >
        Previous
      </Button>
      <span className="text-sm">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  </div>
</div>
```

### Empty States
Always provide helpful empty states:

```tsx
{data.length === 0 ? (
  <div className="py-12 text-center">
    <p className="text-muted-foreground mb-4">
      No records found. Create your first one to get started.
    </p>
    <CreateDialog />
  </div>
) : (
  <Table>...</Table>
)}
```

## Form Standards

### Field Structure
```tsx
<div className="space-y-2">
  <Label htmlFor="fieldName">
    Field Label <span className="text-red-500">*</span>
  </Label>
  <Input
    id="fieldName"
    name="fieldName"
    type="text"
    placeholder="Helpful placeholder"
    required
    disabled={isSubmitting}
  />
  {errors.fieldName && (
    <p className="text-sm text-red-600">{errors.fieldName}</p>
  )}
</div>
```

### Validation
- **Required fields**: Mark with red asterisk (*)
- **Inline errors**: Show below field in red text
- **Error color**: `text-red-600` for light mode, `text-red-400` for dark mode
- **Success feedback**: Use toast notifications, not inline
- **Disable during submission**: Prevent double submissions

### Input Types
- **Text**: Use `<Input type="text" />`
- **Number**: Use `<Input type="number" step="0.01" />`
- **Date**: Use `<Input type="date" max={today} />`
- **Select**: Use `<Select>` component from shadcn/ui
- **Textarea**: Use `<Textarea>` for long text

## Button Standards

### Variants
- **Primary**: `<Button>` - Main actions (Create, Submit, Save)
- **Secondary**: `<Button variant="secondary">` - Alternative actions
- **Outline**: `<Button variant="outline">` - Cancel, Back, Secondary actions
- **Destructive**: `<Button variant="destructive">` - Delete, Remove
- **Ghost**: `<Button variant="ghost">` - Subtle actions, icon buttons

### States
- **Loading**: Show loading text, disable button
- **Disabled**: Use `disabled` prop, show muted appearance
- **Icon + Text**: Use lucide-react icons with text

### Sizes
- **Default**: Standard size for most actions
- **Small**: `size="sm"` - Compact spaces, pagination
- **Large**: `size="lg"` - Hero actions, landing pages

## Error Handling

### Error Modals
For critical errors (data fetch failures, system errors), use error modals instead of inline text:

```tsx
function ErrorDialog({
  error,
  open,
  onOpenChange,
  onRetry,
}: {
  error: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>Error Loading Data</DialogTitle>
          </div>
          <DialogDescription>
            There was a problem loading the data.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onRetry();
            }}
          >
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Error Handling Guidelines
- **Critical Errors** (data fetch failures, system errors): Use error modals with retry option
- **Validation Errors**: Show inline below the relevant field
- **Operation Errors** (save/delete failures): Use toast notifications
- **Network Errors**: Use error modals with retry functionality
- **Permission Errors**: Use error modals with clear explanation

### When to Use Each Error Type
- **Error Modal**: Data loading failures, authentication errors, critical system errors
- **Toast Error**: Failed save/update/delete operations, temporary issues
- **Inline Error**: Form validation, field-specific errors
- **Empty State**: No data available (not an error, but informational)

## Toast Notifications

### Usage
```tsx
import { toast } from 'sonner';

// Success
toast.success('Record created successfully');

// Error
toast.error('Failed to create record');

// Info
toast.info('Processing your request');

// Warning
toast.warning('This action cannot be undone');
```

### Guidelines
- **Success**: Green checkmark, brief confirmation
- **Error**: Red X, clear error message
- **Auto-dismiss**: 3-5 seconds for success, 5-7 seconds for errors
- **Action toasts**: Include undo/retry buttons when applicable
- **Use for**: Operation feedback, not critical errors

## Responsive Design

### Breakpoints
- **Mobile**: `< 640px` - Stack elements, full-width buttons
- **Tablet**: `640px - 1024px` - 2-column grids, compact tables
- **Desktop**: `> 1024px` - Multi-column layouts, full tables

### Mobile Considerations
- Stack form fields vertically
- Full-width buttons on mobile
- Horizontal scroll for tables
- Collapsible navigation
- Touch-friendly tap targets (min 44x44px)

## Accessibility

### Requirements
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Focus Indicators**: Visible focus states on all interactive elements
- **ARIA Labels**: Use proper ARIA labels for screen readers
- **Color Contrast**: Maintain WCAG AA contrast ratios (4.5:1 for text)
- **Form Labels**: All inputs must have associated labels
- **Error Announcements**: Use ARIA live regions for dynamic errors

### Implementation
```tsx
// Proper label association
<Label htmlFor="email">Email</Label>
<Input id="email" name="email" aria-describedby="email-error" />
<p id="email-error" role="alert">{error}</p>

// Button with icon
<Button aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>
```

## Performance

### Best Practices
- Use `Suspense` for async data loading
- Implement pagination for large datasets
- Lazy load heavy components
- Optimize images with Next.js Image component
- Use React Server Components for data fetching
- Debounce search inputs (300ms)

## Consistency Checklist

Before implementing any new UI component, verify:

- [ ] Uses established color system
- [ ] Follows modal size guidelines (default: 500px)
- [ ] Includes loading states with skeletons
- [ ] Implements pagination (10 records default)
- [ ] Has proper empty states
- [ ] Shows inline validation errors
- [ ] Uses toast notifications for feedback
- [ ] Follows button variant conventions
- [ ] Is keyboard accessible
- [ ] Has proper ARIA labels
- [ ] Is responsive on mobile
- [ ] Matches existing component patterns

## Code Examples

### Complete CRUD Page Example
See `app/(dashboard)/admin/categories/page.tsx` for reference implementation including:
- Suspense boundaries
- Skeleton loading states
- Modal-based creation
- Paginated table
- Empty states
- Error handling

### Complete Modal Form Example
See `app/(dashboard)/admin/categories/create-category-dialog.tsx` for reference implementation including:
- Form structure
- Validation
- Loading states
- Error display
- Success handling
