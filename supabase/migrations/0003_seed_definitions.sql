-- Seed global deed definitions catalog
insert into deed_definitions (id, name, type, default_schedule) values
  ('fajr', 'الفجر', 'boolean', 'daily'),
  ('dhuhr', 'الظهر', 'boolean', 'daily'),
  ('asr', 'العصر', 'boolean', 'daily'),
  ('maghrib', 'المغرب', 'boolean', 'daily'),
  ('isha', 'العشاء', 'boolean', 'daily'),
  ('sunnah_fajr', 'سنة الفجر', 'boolean', 'daily'),
  ('witr', 'الوتر', 'boolean', 'daily'),
  ('duha', 'الضحى', 'boolean', 'daily'),
  ('quran_reading', 'ورد التلاوة', 'measured', 'daily'),
  ('adhkar_morning', 'أذكار الصباح', 'boolean', 'daily'),
  ('adhkar_evening', 'أذكار المساء', 'boolean', 'daily')
on conflict (id) do nothing;
