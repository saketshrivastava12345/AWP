-- ===========================================================================
-- AURIX 0007 - the exhaust becomes its own 3D subsystem
--
-- The exploded view separates the car into engineering systems. Until now the
-- exhaust manifold and catalytic converter were grouped with the engine and
-- the tailpipes with the body, so "explode" could not show the exhaust as a
-- system. It gets its own viewer group.
--
-- This file holds only the enum change. ALTER TYPE ... ADD VALUE may run in a
-- transaction, but the new value cannot be USED until that transaction
-- commits, so nothing here references 'exhaust'. supabase/seed.sql moves the
-- exhaust parts across once this has been applied.
-- ===========================================================================

alter type public.viewer_group add value if not exists 'exhaust';
