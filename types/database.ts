// Database types for Asset Manager application

export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface Asset {
  id: string;
  name: string;
  category_id: string;
  department_id: string;
  date_purchased: string;
  cost: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  // Joined data (optional)
  category?: Category;
  department?: Department;
  creator?: Profile;
  updater?: Profile;
}

export interface AssetStats {
  total_count: number;
  total_value: number;
  by_category: { category: string; count: number; value: number }[];
  by_department: { department: string; count: number; value: number }[];
}

// Input types for creating records
export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  full_name?: string;
}

export interface CreateCategoryInput {
  name: string;
}

export interface CreateDepartmentInput {
  name: string;
}

export interface CreateAssetInput {
  name: string;
  category_id: string;
  department_id: string;
  date_purchased: string;
  cost: number;
}

export type AuditAction = 
  | 'asset_deleted' 
  | 'asset_created' 
  | 'asset_updated' 
  | 'user_created' 
  | 'user_updated'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  | 'department_created'
  | 'department_updated'
  | 'department_deleted'
  | 'deletion_request_submitted'
  | 'deletion_request_cancelled'
  | 'deletion_request_approved'
  | 'deletion_request_rejected';
export type AuditEntityType = 'asset' | 'user' | 'category' | 'department' | 'deletion_request';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_data: Record<string, any> | null;
  performed_by: string;
  created_at: string;
}

// Deletion Request types
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DeletionRequest {
  id: string;
  asset_id: string | null; // Nullable: set to NULL when asset is deleted (preserves audit trail)
  asset_name: string;
  asset_cost: number;
  requested_by: string;
  requester_email: string;
  justification: string;
  status: DeletionRequestStatus;
  reviewed_by: string | null;
  reviewer_email: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  asset?: Asset;
  requester?: Profile;
  reviewer?: Profile;
}

export interface DeletionRequestStats {
  pending_count: number;
  approved_last_30_days: number;
  rejected_last_30_days: number;
  average_review_time_hours: number;
  oldest_pending_days: number;
}
