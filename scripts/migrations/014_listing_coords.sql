-- 014_listing_coords.sql
-- Run in Supabase SQL editor.
--
-- Push-to-Pro now matches off professional *listings* (an explicit "I offer this
-- service" signal) instead of raw profile fields. Listings already carry a required
-- trade_category, city/state, travel_radius_miles and remote_eligible — they just
-- lacked coordinates. Add lat/lng so distance/radius matching works for real members.
--
-- These are populated client-side at listing create/edit (geocoded from city/state).
-- Existing rows are backfilled once via scripts/backfill-listing-coords.mjs.

alter table listings add column if not exists lat double precision;
alter table listings add column if not exists lng double precision;
