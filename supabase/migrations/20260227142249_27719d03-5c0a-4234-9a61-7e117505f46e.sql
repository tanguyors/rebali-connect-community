
SELECT cron.schedule(
  'purge-old-search-logs',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/purge-search-logs',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZHJzaHlxbHJweGd2eXhwamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODI0MjYsImV4cCI6MjA4NzA1ODQyNn0.On_i0UMaMbhYVV18NTrWZiUDz6mPqVY8Hrv5URj11tc"}'::jsonb,
    body:='{"time": "now"}'::jsonb
  ) as request_id;
  $$
);
