-- Roll back only the default; do not erase user dashboard choices.
alter table public.regimen_user_state
  alter column day_modules set default '["agenda", "next", "goals", "habits", "stats", "inputs"]'::jsonb;
