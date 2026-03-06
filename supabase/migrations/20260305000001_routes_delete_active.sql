-- Allow deleting active routes (in addition to drafts)
-- Previously only draft routes could be deleted; this enables the DELETE
-- button on OPEN routes in My Routes.

DROP POLICY IF EXISTS "Routes: delete own draft" ON public.routes;
CREATE POLICY "Routes: delete own"
    ON public.routes FOR DELETE
    USING (auth.uid() = user_id AND status IN ('draft', 'active'));
