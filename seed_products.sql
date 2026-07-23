-- ============================================================
-- SaDonTech Hub — seed initial product catalog
-- Run once, after schema.sql and phase2_migration.sql.
-- Inserted in this order so ids come out 1–9, matching the
-- FEATURED_DEALS references in app.js.
-- ============================================================

insert into public.products (name, price, quantity, image_url, description, category, subcategory, is_featured) values
('Hp Notebook', 3500, 12, 'images/Hp_Notebook.jpg', 'Specs RAM 16GB, ROM 256GB SSD, i5 2.5 MHz, 8th gen, Window 11 OS', 'Computers', 'Laptop computers', true),
('Leather Handbag', 200, 13, 'images/Leather_Handbag.jpg', 'Quality leather material – strong and lasting, for business purposes', 'Fashion', 'Bags', false),
('PS 5', 4800, 7, 'images/product3.png', 'PlayStation 5 – next-gen gaming console, affordable', 'Smart Devices', 'Gaming', true),
('MacBook Air', 4500, 3, 'images/product4.png', 'Apple MacBook Air – ultra-thin, ultra-fast', 'Computers', 'Laptop computers', false),
('Apple Watch', 300, 11, 'images/product5.png', 'Apple Watch – health & fitness tracker', 'Smart Devices', 'Watches', false),
('Air Pods', 200, 6, 'images/product6.png', 'Apple AirPods – wireless audio freedom', 'Accessories', 'Airpods', false),
('Samsung TV', 3500, 8, 'images/product1.png', '65-inch 4K Smart TV with HDR', 'Electronics', 'Televisions', false),
('Pixel 4a', 2200, 2, 'images/product2.png', 'Google Pixel 4a – crisp camera, pure Android', 'Smart Devices', 'Phones', false),
('Laptop Stand', 180, 15, 'images/Laptop_Stand.jpg', '2 in 1, Ten speed height adjustment stand', 'Accessories', 'Others', true);
