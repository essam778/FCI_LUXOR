-- Migration 0012: Add 'roadmap' value to resource_type enum if desired
-- Note: The application now uses 'link' with source_name = 'roadmap' for 100% backward compatibility,
-- but adding 'roadmap' directly to the enum provides database-level support as well.
do $$
begin
  alter type resource_type add value if not exists 'roadmap';
exception
  when duplicate_object then null;
end $$;

