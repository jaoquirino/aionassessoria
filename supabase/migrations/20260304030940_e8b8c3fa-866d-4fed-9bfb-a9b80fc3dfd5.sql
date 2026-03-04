-- Allow team members to upload logos to avatars bucket
CREATE POLICY "Team members can upload client logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'logos'
  AND is_team_member(auth.uid())
);

-- Allow team members to update/overwrite logos
CREATE POLICY "Team members can update client logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'logos'
  AND is_team_member(auth.uid())
);

-- Allow team members to delete logos
CREATE POLICY "Team members can delete client logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'logos'
  AND is_team_member(auth.uid())
);