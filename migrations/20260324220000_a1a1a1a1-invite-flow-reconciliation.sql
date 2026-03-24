-- ============================================================
-- RECONCILIATION MIGRATION: Canonical invite-flow
-- ============================================================
-- This migration is the single source of truth for all invite-related
-- database objects. It drops and recreates everything idempotently
-- to eliminate conflicts from prior partial migrations.
-- ============================================================

-- ============================================================
-- PART 1: Ensure profiles has invitation_status column
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'invitation_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_status text DEFAULT 'invited';
  END IF;
END $$;

-- Set all existing NULL values to 'invited' (existing users are active)
UPDATE public.profiles SET invitation_status = 'invited' WHERE invitation_status IS NULL;

-- Ensure invited_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invited_at timestamptz;
  END IF;
END $$;

-- Index for fast pending lookup
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status
ON public.profiles(invitation_status)
WHERE invitation_status = 'pending';

-- Drop overly restrictive CHECK constraint if it exists
-- (edge function sets 'pending', admin sets 'invited' — both must be allowed)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_invitation_status_check;

-- ============================================================
-- PART 2: Ensure unique constraint on tenant_memberships
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenant_memberships'::regclass
    AND contype = 'u'
    AND conname = 'tenant_memberships_tenant_id_user_id_key'
  ) THEN
    ALTER TABLE public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_user_id_key
    UNIQUE (tenant_id, user_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================
-- PART 3: Remove anon policy on invitations (security)
-- Validation uses SECURITY DEFINER RPCs only.
-- ============================================================
DROP POLICY IF EXISTS "Anon can read invitations by token" ON public.invitations;

-- ============================================================
-- PART 4: Canonical RPCs — DROP all variants, then CREATE final versions
-- ============================================================

-- 4a. get_invitation_by_token(text) — used by frontend validate-step
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.id, i.email, i.role, i.expires_at, i.status
  FROM public.invitations i
  WHERE i.token::text = invitation_token
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
$$;

-- 4b. get_invitation_for_registration(text) — used by edge function submit fallback
DROP FUNCTION IF EXISTS public.get_invitation_for_registration(text);

CREATE OR REPLACE FUNCTION public.get_invitation_for_registration(invitation_token text)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  invited_by uuid,
  email text,
  role text,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.tenant_id, i.invited_by,
    i.email::text, i.role::text, i.expires_at, i.status::text
  FROM public.invitations i
  WHERE i.token::text = invitation_token
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
END;
$$;

-- 4c. accept_invitation_for_registration(uuid) — marks invitation accepted
DROP FUNCTION IF EXISTS public.accept_invitation_for_registration(uuid);

CREATE OR REPLACE FUNCTION public.accept_invitation_for_registration(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status
  FROM public.invitations WHERE id = p_invitation_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  IF v_current_status = 'accepted' THEN
    RETURN jsonb_build_object('success', true, 'already_accepted', true);
  END IF;
  IF v_current_status NOT IN ('pending', 'sent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status: ' || v_current_status);
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'already_accepted', false);
END;
$$;

-- 4d. approve_pending_user_membership(uuid) — ONLY way to create membership (admin approval)
DROP FUNCTION IF EXISTS public.approve_pending_user_membership(uuid);

CREATE OR REPLACE FUNCTION public.approve_pending_user_membership(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_invitation_role text;
  v_existing_membership_id uuid;
  v_new_membership_id uuid;
BEGIN
  -- Get tenant_id from profile
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles WHERE id = p_user_id;

  -- Fallback: find tenant from invitation
  IF v_tenant_id IS NULL THEN
    SELECT i.tenant_id, i.role
    INTO v_tenant_id, v_invitation_role
    FROM public.invitations i
    JOIN public.profiles p ON lower(p.email) = lower(i.email)
    WHERE p.id = p_user_id
      AND i.status IN ('accepted', 'pending', 'sent')
      AND i.tenant_id IS NOT NULL
    ORDER BY i.created_at DESC LIMIT 1;
  ELSE
    SELECT i.role INTO v_invitation_role
    FROM public.invitations i
    JOIN public.profiles p ON lower(p.email) = lower(i.email)
    WHERE p.id = p_user_id AND i.tenant_id = v_tenant_id
    ORDER BY i.created_at DESC LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tenant found for user');
  END IF;

  -- Idempotent: check existing membership
  SELECT id INTO v_existing_membership_id
  FROM public.tenant_memberships
  WHERE tenant_id = v_tenant_id AND user_id = p_user_id;

  IF v_existing_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'membership_id', v_existing_membership_id, 'already_existed', true);
  END IF;

  -- Create membership
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, p_user_id, COALESCE(v_invitation_role, 'member'))
  RETURNING id INTO v_new_membership_id;

  RETURN jsonb_build_object('success', true, 'membership_id', v_new_membership_id, 'already_existed', false);
END;
$$;

-- 4e. ensure_invited_user_membership — legacy, still exists for backward compat but NOT used in new flow
-- Keep it but document it's deprecated
DROP FUNCTION IF EXISTS public.ensure_invited_user_membership(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.ensure_invited_user_membership(
  p_invitation_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_existing_membership_id uuid;
  v_new_membership_id uuid;
BEGIN
  SELECT i.tenant_id INTO v_tenant_id
  FROM public.invitations i WHERE i.id = p_invitation_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or has no tenant');
  END IF;

  SELECT id INTO v_existing_membership_id
  FROM public.tenant_memberships
  WHERE tenant_id = v_tenant_id AND user_id = p_user_id;

  IF v_existing_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'membership_id', v_existing_membership_id, 'already_existed', true);
  END IF;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, p_user_id, COALESCE(p_role, 'member'))
  RETURNING id INTO v_new_membership_id;

  RETURN jsonb_build_object('success', true, 'membership_id', v_new_membership_id, 'already_existed', false);
END;
$$;

-- ============================================================
-- PART 5: Done. Summary:
-- - profiles.invitation_status: 'pending' (new reg) / 'invited' (approved)
-- - No anon access to invitations table
-- - Validate: get_invitation_by_token(text)
-- - Submit fallback: get_invitation_for_registration(text)
-- - Accept: accept_invitation_for_registration(uuid)
-- - Approval (only membership creation): approve_pending_user_membership(uuid)
-- ============================================================
