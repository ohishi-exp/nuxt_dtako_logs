-- Integration test seed data for nuxt_dtako_logs
SET search_path TO alc_api;

-- Test tenant
INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Tenant', 'test-tenant')
  ON CONFLICT DO NOTHING;

-- Test user
INSERT INTO users (id, tenant_id, google_sub, email, name, role) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'google-sub-test', 'test@example.com', 'Test Admin', 'admin')
  ON CONFLICT DO NOTHING;

-- Set tenant for RLS
SELECT set_current_tenant('11111111-1111-1111-1111-111111111111');

-- Dtakologs test data
-- data_date_time は TEXT 列だが backend が ::timestamptz cast (rust-alc-api commit 0b77f6f / PR #97 以降) で
-- 比較するため、PostgreSQL が parse 可能な ISO8601 RFC3339 (JST +09:00) で投入する。
-- 旧 'YY/MM/DD HH:MM' 形式は `date/time field value out of range` で 500 を引き起こす。
INSERT INTO dtakologs (tenant_id, data_date_time, vehicle_cd, vehicle_name, driver_name, gps_direction, gps_latitude, gps_longitude, speed, all_state, state2, address_disp_c, address_disp_p, sub_driver_cd) VALUES
  ('11111111-1111-1111-1111-111111111111', '2026-04-04T10:00:00+09:00', 1, 'Truck-1', 'Driver A', 180, 35123456, 139123456, 60.0, 'Drive', 'Normal', 'Tokyo', 'Shibuya', 0),
  ('11111111-1111-1111-1111-111111111111', '2026-04-04T10:05:00+09:00', 1, 'Truck-1', 'Driver A', 90, 35123500, 139123500, 0.0, 'Rest', 'Parking', 'Tokyo', 'Shibuya', 0),
  ('11111111-1111-1111-1111-111111111111', '2026-04-04T10:00:00+09:00', 2, 'Truck-2', 'Driver B', 270, 34123456, 135123456, 45.5, 'Drive', '', 'Osaka', 'Umeda', 0),
  ('11111111-1111-1111-1111-111111111111', '2026-04-03T15:00:00+09:00', 1, 'Truck-1', 'Driver A', 0, 35000000, 139000000, 30.0, 'Break', 'Rest', 'Tokyo', 'Shinjuku', 0);
