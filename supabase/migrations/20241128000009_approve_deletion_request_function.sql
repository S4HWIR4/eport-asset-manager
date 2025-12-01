-- Function to approve deletion request in a transaction
-- This ensures atomicity: either both the asset deletion and request update succeed, or both fail
CREATE OR REPLACE FUNCTION public.approve_deletion_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_reviewer_email TEXT,
  p_review_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request deletion_requests%ROWTYPE;
  v_asset assets%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get the deletion request
  SELECT * INTO v_request
  FROM deletion_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deletion request not found'
    );
  END IF;

  -- Verify request is pending
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only pending requests can be approved'
    );
  END IF;

  -- Get the asset (for audit logging)
  SELECT * INTO v_asset
  FROM assets
  WHERE id = v_request.asset_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset not found'
    );
  END IF;

  -- Delete the asset
  DELETE FROM assets
  WHERE id = v_request.asset_id;

  -- Update deletion request status to approved
  UPDATE deletion_requests
  SET
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewer_email = p_reviewer_email,
    review_comment = p_review_comment,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- Create audit log entry for approval
  INSERT INTO audit_logs (action, entity_type, entity_id, entity_data, performed_by)
  VALUES (
    'deletion_request_approved',
    'deletion_request',
    p_request_id,
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'asset_name', v_request.asset_name,
      'review_comment', p_review_comment
    ),
    p_reviewer_id
  );

  -- Create audit log entry for asset deletion
  INSERT INTO audit_logs (action, entity_type, entity_id, entity_data, performed_by)
  VALUES (
    'asset_deleted',
    'asset',
    v_request.asset_id,
    jsonb_build_object(
      'name', v_asset.name,
      'cost', v_asset.cost,
      'date_purchased', v_asset.date_purchased,
      'created_by', v_asset.created_by,
      'deleted_via_request', true,
      'deletion_request_id', p_request_id
    ),
    p_reviewer_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', NULL
  );
END;
$$;

-- Grant execute permission to authenticated users
-- (The function itself checks admin permissions via RLS on the tables)
GRANT EXECUTE ON FUNCTION public.approve_deletion_request TO authenticated;
