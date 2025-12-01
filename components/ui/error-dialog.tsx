"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ErrorDialogProps {
  error: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
  title?: string
  description?: string
}

export function ErrorDialog({
  error,
  open,
  onOpenChange,
  onRetry,
  title = "Error Loading Data",
  description = "There was a problem loading the data.",
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-900">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
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
              onOpenChange(false)
              onRetry()
            }}
          >
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
