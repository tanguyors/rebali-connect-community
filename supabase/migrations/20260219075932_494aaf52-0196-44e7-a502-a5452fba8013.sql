
-- Temporarily disable the listing limit trigger for seed data
DROP TRIGGER IF EXISTS check_listing_limit_trigger ON public.listings;

-- Create seed users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed1@rebali.app', crypt('Seed2025!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Bali Trader"}'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed2@rebali.app', crypt('Seed2025!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Island Living"}'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed3@rebali.app', crypt('Seed2025!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Bali Moves"}'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed4@rebali.app', crypt('Seed2025!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Canggu Sales"}')
ON CONFLICT (id) DO NOTHING;

-- Create profiles for seed users
INSERT INTO public.profiles (id, display_name, whatsapp, phone, user_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bali Trader', '+6281234567001', '+6281234567001', 'business'),
  ('00000000-0000-0000-0000-000000000002', 'Island Living', '+6281234567002', '+6281234567002', 'private'),
  ('00000000-0000-0000-0000-000000000003', 'Bali Moves', '+6281234567003', '+6281234567003', 'business'),
  ('00000000-0000-0000-0000-000000000004', 'Canggu Sales', '+6281234567004', '+6281234567004', 'private')
ON CONFLICT (id) DO NOTHING;

-- Insert 20 seed listings (5 per seller to respect future limit)
INSERT INTO public.listings (id, seller_id, category, title_original, description_original, price, currency, location_area, condition, status, lang_original, views_count, created_at) VALUES
-- Seller 1
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'real_estate', 'Beautiful 2BR Villa with Pool in Canggu', 'Stunning 2 bedroom villa with private pool, fully furnished. Open-plan living area, modern kitchen, garden. Available for yearly lease.', 85000000, 'IDR', 'canggu', 'good', 'active', 'en', 42, now() - interval '2 hours'),
('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'vehicles', 'Honda PCX 160 2023 - Low KM', 'Honda PCX 160, year 2023, only 5000km. Excellent condition, regular service at Honda dealer. STNK valid until 2028.', 28000000, 'IDR', 'ubud', 'like_new', 'active', 'en', 31, now() - interval '5 hours'),
('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'furniture_home', 'Teak Wood Dining Table + 6 Chairs', 'Handmade solid teak dining set. Table is 180x90cm. Chairs have rattan seating. Moving sale!', 8500000, 'IDR', 'seminyak', 'good', 'active', 'en', 18, now() - interval '1 day'),
('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'horeca_equipment', 'Professional Espresso Machine - La Marzocco', 'La Marzocco Linea Mini, used 1 year. Perfect condition. Includes tamper, milk pitcher, cleaning kit.', 4500, 'USD', 'denpasar', 'good', 'active', 'en', 67, now() - interval '3 hours'),
('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'business_assets', 'Complete Coworking Space Setup - 20 Desks', '20 desks with ergonomic chairs, 4 meeting pods, reception counter, whiteboards, projector. Full package.', 12000, 'USD', 'canggu', 'good', 'active', 'en', 23, now() - interval '2 days'),
-- Seller 2
('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'relocation_services', 'Full House Moving Service - Bali Wide', 'Professional moving service covering all of Bali. Packing materials, careful handling, insurance included.', 2500000, 'IDR', 'denpasar', 'new', 'active', 'en', 12, now() - interval '6 hours'),
('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'misc', 'Surfboard 6''2 Shortboard - Channel Islands', 'Channel Islands Flyer 6''2, used one season. Minor pressure dings. Comes with FCS II fins and board bag.', 4200000, 'IDR', 'uluwatu', 'good', 'active', 'en', 55, now() - interval '12 hours'),
('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'furniture_home', 'King Size Bed Frame + Mattress', 'Solid wood king size bed frame with premium spring mattress. Used 6 months in guest room. Like new.', 12000000, 'IDR', 'sanur', 'like_new', 'active', 'en', 29, now() - interval '4 hours'),
('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'vehicles', 'Yamaha NMAX 155 2022 - Modified', 'Yamaha NMAX 155, 2022. Custom exhaust, LED lights, phone charger, new tires. 12,000km.', 22000000, 'IDR', 'kuta', 'good', 'active', 'en', 44, now() - interval '1 day'),
('a0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'real_estate', 'Studio Apartment Furnished - Nusa Dua', 'Fully furnished studio in modern complex. Pool, gym, 24/7 security. Close to BTDC and beaches.', 5500000, 'IDR', 'nusa_dua', 'good', 'active', 'en', 38, now() - interval '8 hours'),
-- Seller 3
('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'horeca_equipment', 'Commercial Ice Cream Machine - Carpigiani', 'Carpigiani soft serve machine, 3 flavors. Used 2 years in restaurant. Recently serviced.', 35000000, 'IDR', 'seminyak', 'fair', 'active', 'en', 19, now() - interval '3 days'),
('a0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000003', 'furniture_home', 'L-Shaped Sofa - Scandinavian Style', 'Modern L-shaped sofa in light grey fabric. 280x180cm. Removable washable covers. Moving sale.', 9500000, 'IDR', 'canggu', 'good', 'active', 'en', 35, now() - interval '16 hours'),
('a0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', 'business_assets', 'Restaurant Kitchen Equipment Bundle', 'Complete kitchen: 6-burner stove, industrial hood, prep tables, fridge, freezer, utensils. From Italian restaurant.', 45000000, 'IDR', 'ubud', 'fair', 'active', 'en', 27, now() - interval '5 days'),
('a0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', 'vehicles', 'Toyota Avanza 2020 - 7 Seater', 'Toyota Avanza 1.3G, 2020, automatic. 35,000km. AC cold, all electrics working. STNK & pajak valid.', 165000000, 'IDR', 'denpasar', 'good', 'active', 'en', 52, now() - interval '10 hours'),
('a0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', 'misc', 'Drone DJI Mini 3 Pro + Extra Batteries', 'DJI Mini 3 Pro Fly More Combo. 3 batteries, ND filters, carrying case. Under 250g. 4K video.', 8500000, 'IDR', 'ubud', 'like_new', 'active', 'en', 41, now() - interval '7 hours'),
-- Seller 4
('a0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000004', 'real_estate', 'Traditional Joglo House - Tabanan Rice Fields', 'Authentic Javanese Joglo on 500sqm land. Rice paddy views. 3BR, 2BA. Fully renovated. Freehold available.', 2500000000, 'IDR', 'tabanan', 'good', 'active', 'en', 89, now() - interval '1 day'),
('a0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000004', 'horeca_equipment', 'Pizza Oven - Wood Fired (Portable)', 'Ooni Karu 16 multi-fuel pizza oven. Used a few times. Pizza peel, cover, gas burner included.', 7500000, 'IDR', 'jimbaran', 'like_new', 'active', 'en', 16, now() - interval '2 days'),
('a0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000004', 'relocation_services', 'Shipping Container to Australia - Shared', 'Sharing 20ft container to Melbourne. Mid-March departure. ~5 cubic meters available. Customs handled.', 8000000, 'IDR', 'denpasar', 'new', 'active', 'en', 33, now() - interval '4 days'),
('a0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000004', 'furniture_home', 'Rattan Hanging Chair with Stand', 'Beautiful handwoven rattan egg chair with metal stand. Indoor/outdoor. Cushion included. Bali-made.', 3800000, 'IDR', 'lovina', 'new', 'active', 'en', 22, now() - interval '9 hours'),
('a0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000004', 'misc', 'Complete Yoga Studio Equipment Set', '15 yoga mats, 15 bolsters, 30 blocks, 15 straps, speaker, diffuser, wall mirror. Complete studio setup.', 15000000, 'IDR', 'ubud', 'good', 'active', 'en', 47, now() - interval '6 days');

-- Insert English translations
INSERT INTO public.listing_translations (listing_id, lang, title, description, is_machine) VALUES
('a0000000-0000-0000-0000-000000000001', 'en', 'Beautiful 2BR Villa with Pool in Canggu', 'Stunning 2 bedroom villa with private pool, fully furnished.', false),
('a0000000-0000-0000-0000-000000000002', 'en', 'Honda PCX 160 2023 - Low KM', 'Honda PCX 160, year 2023, only 5000km. Excellent condition.', false),
('a0000000-0000-0000-0000-000000000003', 'en', 'Teak Wood Dining Table + 6 Chairs', 'Handmade solid teak dining set. Table is 180x90cm.', false),
('a0000000-0000-0000-0000-000000000004', 'en', 'Professional Espresso Machine - La Marzocco', 'La Marzocco Linea Mini, used for 1 year. Perfect condition.', false),
('a0000000-0000-0000-0000-000000000005', 'en', 'Complete Coworking Space Setup - 20 Desks', '20 desks with ergonomic chairs and meeting pods.', false),
('a0000000-0000-0000-0000-000000000006', 'en', 'Full House Moving Service - Bali Wide', 'Professional moving service covering all of Bali.', false),
('a0000000-0000-0000-0000-000000000007', 'en', 'Surfboard 6''2 Shortboard - Channel Islands', 'Channel Islands Flyer 6''2, used for one season.', false),
('a0000000-0000-0000-0000-000000000008', 'en', 'King Size Bed Frame + Mattress', 'Solid wood king size bed frame with premium mattress.', false),
('a0000000-0000-0000-0000-000000000009', 'en', 'Yamaha NMAX 155 2022 - Modified', 'Yamaha NMAX 155, 2022 model. Custom exhaust, LED lights.', false),
('a0000000-0000-0000-0000-000000000010', 'en', 'Studio Apartment Furnished - Nusa Dua', 'Fully furnished studio in modern complex with pool and gym.', false),
('a0000000-0000-0000-0000-000000000011', 'en', 'Commercial Ice Cream Machine - Carpigiani', 'Carpigiani soft serve machine, 3 flavors.', false),
('a0000000-0000-0000-0000-000000000012', 'en', 'L-Shaped Sofa - Scandinavian Style', 'Modern L-shaped sofa in light grey fabric.', false),
('a0000000-0000-0000-0000-000000000013', 'en', 'Restaurant Kitchen Equipment Bundle', 'Complete kitchen setup for a restaurant.', false),
('a0000000-0000-0000-0000-000000000014', 'en', 'Toyota Avanza 2020 - 7 Seater', 'Toyota Avanza 1.3G, 2020, automatic. 35,000km.', false),
('a0000000-0000-0000-0000-000000000015', 'en', 'Drone DJI Mini 3 Pro + Extra Batteries', 'DJI Mini 3 Pro Fly More Combo with 3 batteries.', false),
('a0000000-0000-0000-0000-000000000016', 'en', 'Traditional Joglo House - Tabanan Rice Fields', 'Authentic Javanese Joglo house on 500sqm land.', false),
('a0000000-0000-0000-0000-000000000017', 'en', 'Pizza Oven - Wood Fired (Portable)', 'Ooni Karu 16 multi-fuel pizza oven.', false),
('a0000000-0000-0000-0000-000000000018', 'en', 'Shipping Container to Australia - Shared', 'Sharing a 20ft container to Melbourne, Australia.', false),
('a0000000-0000-0000-0000-000000000019', 'en', 'Rattan Hanging Chair with Stand', 'Beautiful handwoven rattan egg chair with metal stand.', false),
('a0000000-0000-0000-0000-000000000020', 'en', 'Complete Yoga Studio Equipment Set', '15 yoga mats, bolsters, blocks, straps, and more.', false);

-- Re-enable the listing limit trigger
CREATE TRIGGER check_listing_limit_trigger
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_listing_limit();
