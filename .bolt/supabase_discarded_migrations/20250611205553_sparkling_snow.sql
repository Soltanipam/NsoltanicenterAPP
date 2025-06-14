/*
  # Fix User Creation and Authentication System

  1. Policy Updates
    - Create comprehensive RLS policies for user creation
    - Allow first admin creation when no users exist
    - Allow authenticated users to create their own profile
    - Allow admins to create other users
    
  2. Security
    - Maintain RLS protection
    - Enable proper user creation flow
    - Support both username and email login
*/

-- Drop all existing user policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON users;
DROP POLICY IF EXISTS "Allow first user creation when no users exist" ON users;
DROP POLICY IF EXISTS "Allow admins to insert users" ON users;
DROP POLICY IF EXISTS "Users can create their own profile" ON users;
DROP POLICY IF EXISTS "Admins and users can update appropriately" ON users;
DROP POLICY IF EXISTS "Allow admins to delete users" ON users;

-- Create comprehensive SELECT policy
CREATE POLICY "Allow authenticated users to read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Create INSERT policies
-- 1. Allow first user creation when no users exist (for initial setup)
CREATE POLICY "Allow first user creation when no users exist"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT count(*) FROM users) = 0
  );

-- 2. Allow authenticated users to create their own profile
CREATE POLICY "Allow users to create their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- 3. Allow admins to create other users
CREATE POLICY "Allow admins to insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin' 
      AND active = true
    )
  );

-- Create UPDATE policy
CREATE POLICY "Allow admins and users to update appropriately"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update anyone
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin' 
      AND active = true
    )
    OR 
    -- Users can update their own profile
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    -- Admins can update anyone
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin' 
      AND active = true
    )
    OR 
    -- Users can only update their own profile and cannot change their role
    (
      auth_user_id = auth.uid() 
      AND role = (SELECT role FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Create DELETE policy
CREATE POLICY "Allow admins to delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin' 
      AND active = true
    )
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;