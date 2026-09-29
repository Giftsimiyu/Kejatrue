ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kejarue_messages_participants_select ON public.messages;
CREATE POLICY kejarue_messages_participants_select
ON public.messages
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = sender_id
  OR (SELECT auth.uid()) = receiver_id
);

DROP POLICY IF EXISTS kejarue_messages_sender_insert ON public.messages;
CREATE POLICY kejarue_messages_sender_insert
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = sender_id);