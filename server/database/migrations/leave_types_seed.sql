-- Additional leave types to match the full spec list
INSERT INTO tbl_leave_types (name, code, max_days, carry_forward) VALUES
  ('Carry Forward - Privileged Leave', 'CFPL',  30,  TRUE),
  ('Leaves for Interns',               'LFI',   10,  FALSE),
  ('Annual Leave',                     'AL',    21,  FALSE),
  ('Emergency Leave',                  'EL',    3,   FALSE)
ON CONFLICT (code) DO NOTHING;
