-- Categorías
INSERT INTO categorias (id, nombre, color, icono, "updatedAt") VALUES
('cat-bebidas',     'Bebidas',      '#3b82f6', '🍺', NOW()),
('cat-cocteleria',  'Coctelería',   '#8b5cf6', '🍹', NOW()),
('cat-comidas',     'Comidas',      '#f59e0b', '🍔', NOW()),
('cat-shots',       'Shots',        '#ef4444', '🥃', NOW()),
('cat-sin-alcohol', 'Sin Alcohol',  '#10b981', '🥤', NOW());

-- Productos
INSERT INTO productos (id, nombre, precio, costo, "categoriaId", stock, "stockMinimo", unidad, "updatedAt") VALUES
('prod-cerveza-club-colombia',  'Cerveza Club Colombia',  5000,  2800, 'cat-bebidas',     120, 24, 'und', NOW()),
('prod-cerveza-corona',         'Cerveza Corona',         7000,  4000, 'cat-bebidas',      60, 12, 'und', NOW()),
('prod-aguardiente-nectar',     'Aguardiente Néctar',     4000,  2200, 'cat-bebidas',      45, 10, 'und', NOW()),
('prod-ron-medellin',           'Ron Medellín',           5000,  2800, 'cat-bebidas',      30,  6, 'und', NOW()),
('prod-mojito',                 'Mojito',                18000,  6000, 'cat-cocteleria',   50,  0, 'und', NOW()),
('prod-pina-colada',            'Piña Colada',           18000,  7000, 'cat-cocteleria',   50,  0, 'und', NOW()),
('prod-margarita',              'Margarita',             16000,  5500, 'cat-cocteleria',   50,  0, 'und', NOW()),
('prod-sangria',                'Sangría',               15000,  5000, 'cat-cocteleria',   50,  0, 'und', NOW()),
('prod-hamburguesa-sencilla',   'Hamburguesa Sencilla',  14000,  6000, 'cat-comidas',      30,  5, 'und', NOW()),
('prod-alitas-x-8',             'Alitas x 8',            22000,  9000, 'cat-comidas',      20,  5, 'und', NOW()),
('prod-papas-fritas',           'Papas Fritas',           8000,  2500, 'cat-comidas',      40, 10, 'und', NOW()),
('prod-nachos-con-guacamole',   'Nachos con Guacamole',  15000,  5000, 'cat-comidas',      25,  5, 'und', NOW()),
('prod-shot-tequila',           'Shot Tequila',           6000,  2000, 'cat-shots',        80, 20, 'und', NOW()),
('prod-shot-vodka',             'Shot Vodka',             6000,  2000, 'cat-shots',        80, 20, 'und', NOW()),
('prod-shot-whisky',            'Shot Whisky',            8000,  3000, 'cat-shots',        60, 15, 'und', NOW()),
('prod-gaseosa',                'Gaseosa',                3000,  1500, 'cat-sin-alcohol',  48, 12, 'und', NOW()),
('prod-agua-botella',           'Agua Botella',           2000,   800, 'cat-sin-alcohol',  60, 12, 'und', NOW()),
('prod-jugo-natural',           'Jugo Natural',           6000,  2500, 'cat-sin-alcohol',  20,  5, 'und', NOW());

-- Mesas
INSERT INTO mesas (id, numero, nombre, capacidad, zona, "updatedAt") VALUES
(gen_random_uuid(), 1,  'VIP 1', 6, 'Interior', NOW()),
(gen_random_uuid(), 2,  'VIP 2', 6, 'Interior', NOW()),
(gen_random_uuid(), 3,  'VIP 3', 6, 'Interior', NOW()),
(gen_random_uuid(), 4,  'VIP 4', 6, 'Interior', NOW()),
(gen_random_uuid(), 5,  NULL,    4, 'Interior', NOW()),
(gen_random_uuid(), 6,  NULL,    4, 'Interior', NOW()),
(gen_random_uuid(), 7,  NULL,    4, 'Exterior', NOW()),
(gen_random_uuid(), 8,  NULL,    4, 'Exterior', NOW()),
(gen_random_uuid(), 9,  NULL,    4, 'Exterior', NOW()),
(gen_random_uuid(), 10, NULL,    4, 'Exterior', NOW()),
(gen_random_uuid(), 11, NULL,    4, 'Exterior', NOW()),
(gen_random_uuid(), 12, NULL,    4, 'Exterior', NOW());

-- Boliranas
INSERT INTO boliranas (id, numero, "precioPorHora", "updatedAt") VALUES
(gen_random_uuid(), 1, 30000, NOW()),
(gen_random_uuid(), 2, 30000, NOW()),
(gen_random_uuid(), 3, 20000, NOW()),
(gen_random_uuid(), 4, 20000, NOW()),
(gen_random_uuid(), 5, 20000, NOW()),
(gen_random_uuid(), 6, 20000, NOW());

-- Proveedores
INSERT INTO proveedores (id, nombre, contacto, telefono, email, nit, "updatedAt") VALUES
('prov-1', 'Distribuidora Bavaria', 'Carlos López', '3001234567', 'ventas@bavaria.com',       '890903938-8', NOW()),
('prov-2', 'Licores del Valle',     'María García', '3109876543', 'info@licoresdelvalle.com', NULL,          NOW());
