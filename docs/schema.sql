-- ===========================================================================
--  SAJIWA POS — SKEMA BASIS DATA
--  Dialek  : PostgreSQL 14+ (mudah diadaptasi ke MySQL 8)
--  Catatan : Prototipe saat ini menyimpan data pada localStorage melalui
--            modul src/db/database.ts. Skema di bawah ini adalah acuan resmi
--            struktur tabel sehingga migrasi ke backend nyata tidak mengubah
--            bentuk data pada lapisan UI.
--
--  Konvensi wajib pada seluruh tabel:
--    - id          : primary key
--    - created_at  : waktu pembuatan baris
--    - updated_at  : waktu perubahan terakhir
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RBAC : roles, permissions, role_permissions, users
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,   -- owner | kasir | warehouse
    label       VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id          VARCHAR(36)  PRIMARY KEY,
    code        VARCHAR(80)  NOT NULL UNIQUE,   -- mis. 'pos.discount'
    label       VARCHAR(150) NOT NULL,
    group_name  VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id            VARCHAR(36) PRIMARY KEY,
    role_id       VARCHAR(36) NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id VARCHAR(36) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

CREATE TABLE users (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    username      VARCHAR(60)  NOT NULL UNIQUE,
    pin_hash      VARCHAR(255) NOT NULL,         -- WAJIB di-hash (bcrypt/argon2)
    email         VARCHAR(150),
    phone         VARCHAR(30),
    role_id       VARCHAR(36)  NOT NULL REFERENCES roles(id),
    avatar_color  VARCHAR(80)  NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active|inactive|suspended
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role   ON users(role_id);
CREATE INDEX idx_users_status ON users(status);

-- ---------------------------------------------------------------------------
-- 2. KATALOG : categories, products
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
    id         VARCHAR(36)  PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    icon       VARCHAR(16)  NOT NULL DEFAULT '',
    color      VARCHAR(30)  NOT NULL DEFAULT 'slate',
    sort_order INTEGER      NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id                VARCHAR(36)    PRIMARY KEY,
    sku               VARCHAR(50)    NOT NULL UNIQUE,
    barcode           VARCHAR(60),
    name              VARCHAR(180)   NOT NULL,
    description       TEXT           NOT NULL DEFAULT '',
    category_id       VARCHAR(36)    NOT NULL REFERENCES categories(id),
    price             NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cost_price        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    image_url         VARCHAR(255),
    -- Key ikon vektor (lib/glyphs), mis. 'rice'. Bukan karakter emoji.
    emoji             VARCHAR(32)    NOT NULL DEFAULT '',
    gradient          VARCHAR(80)    NOT NULL DEFAULT '',
    is_active         BOOLEAN        NOT NULL DEFAULT TRUE,
    track_stock       BOOLEAN        NOT NULL DEFAULT TRUE,
    has_recipe        BOOLEAN        NOT NULL DEFAULT FALSE,  -- lihat bagian 8 (BOM)
    prep_time_minutes INTEGER        NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(is_active);
CREATE INDEX idx_products_barcode  ON products(barcode);

-- ---------------------------------------------------------------------------
-- 3. MEJA & METODE PEMBAYARAN
-- ---------------------------------------------------------------------------

CREATE TABLE restaurant_tables (
    id         VARCHAR(36) PRIMARY KEY,
    code       VARCHAR(20) NOT NULL UNIQUE,
    name       VARCHAR(60) NOT NULL,
    capacity   INTEGER     NOT NULL DEFAULT 2,
    area       VARCHAR(60) NOT NULL DEFAULT 'Indoor',
    -- available|occupied|reserved|cleaning.
    -- CATATAN: 'occupied' adalah turunan, bukan sumber kebenaran. Sebuah meja
    -- dianggap terisi bila punya order berstatus 'pending' (bill terbuka).
    -- Kolom ini dipakai untuk penandaan manual: 'reserved' dan 'cleaning'.
    status     VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
    id                 VARCHAR(36)   PRIMARY KEY,
    code               VARCHAR(30)   NOT NULL UNIQUE, -- cash|transfer|qris|card|…
    name               VARCHAR(80)   NOT NULL,
    description        VARCHAR(255)  NOT NULL DEFAULT '',
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    requires_reference BOOLEAN       NOT NULL DEFAULT FALSE,
    admin_fee_percent  NUMERIC(5, 2) NOT NULL DEFAULT 0,
    sort_order         INTEGER       NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. TARGET PENJUALAN (KPI)
--    Satu baris per bulan. Progres, proyeksi, dan kebutuhan harian dihitung
--    di aplikasi dari perbandingan target ini dengan tabel orders.
-- ---------------------------------------------------------------------------

CREATE TABLE sales_targets (
    id                 VARCHAR(36)    PRIMARY KEY,
    period             CHAR(7)        NOT NULL UNIQUE,   -- format 'YYYY-MM'
    revenue_target     NUMERIC(16, 2) NOT NULL DEFAULT 0,
    transaction_target INTEGER        NOT NULL DEFAULT 0,
    note               TEXT           NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_targets_period ON sales_targets(period);

-- ---------------------------------------------------------------------------
-- 5. TRANSAKSI : orders, order_items, payments, invoices
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
    id              VARCHAR(36)    PRIMARY KEY,
    order_number    VARCHAR(40)    NOT NULL UNIQUE,
    type            VARCHAR(20)    NOT NULL,  -- dine_in|take_away|delivery
    -- ALUR TABLE SERVICE:
    --   pending   = bill terbuka, pelanggan masih duduk, belum dibayar
    --   completed = sudah dibayar dan selesai
    --   cancelled = bill dibatalkan, stok dikembalikan
    status          VARCHAR(20)    NOT NULL,  -- draft|pending|confirmed|paid|completed|cancelled|refunded
    table_id        VARCHAR(36)    REFERENCES restaurant_tables(id),
    customer_name   VARCHAR(150)   NOT NULL DEFAULT '',
    guest_count     INTEGER        NOT NULL DEFAULT 1,

    subtotal        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_note   VARCHAR(255)   NOT NULL DEFAULT '',
    tax_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    service_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(14, 2) NOT NULL DEFAULT 0,

    note            TEXT           NOT NULL DEFAULT '',
    cashier_id      VARCHAR(36)    NOT NULL REFERENCES users(id),
    cancel_reason   TEXT,
    refund_reason   TEXT,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_orders_status  ON orders(status);

-- Satu meja hanya boleh punya satu bill terbuka pada satu waktu.
CREATE UNIQUE INDEX uq_open_bill_per_table
    ON orders (table_id)
    WHERE status = 'pending' AND table_id IS NOT NULL;

CREATE TABLE order_items (
    id           VARCHAR(36)    PRIMARY KEY,
    order_id     VARCHAR(36)    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   VARCHAR(36)    NOT NULL REFERENCES products(id),
    product_name VARCHAR(180)   NOT NULL,          -- snapshot nama saat transaksi
    price        NUMERIC(14, 2) NOT NULL,          -- snapshot harga jual
    cost_price   NUMERIC(14, 2) NOT NULL DEFAULT 0,-- snapshot HPP untuk laporan laba
    quantity     INTEGER        NOT NULL DEFAULT 1,
    discount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note         VARCHAR(255)   NOT NULL DEFAULT '',
    subtotal     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE TABLE payments (
    id               VARCHAR(36)    PRIMARY KEY,
    order_id         VARCHAR(36)    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method           VARCHAR(30)    NOT NULL REFERENCES payment_methods(code),
    amount           NUMERIC(14, 2) NOT NULL DEFAULT 0,
    received_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    change_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    reference_number VARCHAR(80),
    status           VARCHAR(20)    NOT NULL DEFAULT 'success', -- pending|success|failed|refunded
    paid_at          TIMESTAMPTZ    NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order  ON payments(order_id);
CREATE INDEX idx_payments_method ON payments(method);

CREATE TABLE invoices (
    id             VARCHAR(36) PRIMARY KEY,
    order_id       VARCHAR(36) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    issued_at      TIMESTAMPTZ NOT NULL,
    printed_count  INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. INVENTORI : inventory, stock_movements, stock_adjustments
-- ---------------------------------------------------------------------------

CREATE TABLE inventory (
    id               VARCHAR(36) PRIMARY KEY,
    product_id       VARCHAR(36) NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    quantity         INTEGER     NOT NULL DEFAULT 0,
    min_quantity     INTEGER     NOT NULL DEFAULT 0,
    max_quantity     INTEGER     NOT NULL DEFAULT 0,
    unit             VARCHAR(20) NOT NULL DEFAULT 'pcs',
    location         VARCHAR(80) NOT NULL DEFAULT 'Gudang Utama',
    last_stock_in_at TIMESTAMPTZ,
    last_counted_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_movements (
    id              VARCHAR(36)  PRIMARY KEY,
    product_id      VARCHAR(36)  NOT NULL REFERENCES products(id),
    type            VARCHAR(30)  NOT NULL, -- stock_in|stock_out|sales_deduction|adjustment|opname|waste|return
    quantity_before INTEGER      NOT NULL DEFAULT 0,
    quantity_change INTEGER      NOT NULL DEFAULT 0,
    quantity_after  INTEGER      NOT NULL DEFAULT 0,
    reason          VARCHAR(255) NOT NULL DEFAULT '',
    reference_id    VARCHAR(36),           -- order_id / adjustment_id bila relevan
    user_id         VARCHAR(36)  NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_movements_type    ON stock_movements(type);

CREATE TABLE stock_adjustments (
    id              VARCHAR(36)  PRIMARY KEY,
    product_id      VARCHAR(36)  NOT NULL REFERENCES products(id),
    system_quantity INTEGER      NOT NULL DEFAULT 0,
    counted_quantity INTEGER     NOT NULL DEFAULT 0,
    difference      INTEGER      NOT NULL DEFAULT 0,
    reason          VARCHAR(255) NOT NULL DEFAULT '',
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending|approved|rejected
    requested_by    VARCHAR(36)  NOT NULL REFERENCES users(id),
    approved_by     VARCHAR(36)  REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adjustments_status ON stock_adjustments(status);

-- ---------------------------------------------------------------------------
-- 7. AUDIT & PENGATURAN
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id           VARCHAR(36)  PRIMARY KEY,
    user_id      VARCHAR(36)  NOT NULL REFERENCES users(id),
    action       VARCHAR(60)  NOT NULL, -- login|logout|transaction_created|refund|price_change|target_updated|…
    description  TEXT         NOT NULL DEFAULT '',
    reference_id VARCHAR(36),
    ip_address   VARCHAR(45)  NOT NULL DEFAULT '',
    user_agent   VARCHAR(255) NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);

CREATE TABLE store_settings (
    id              VARCHAR(36)   PRIMARY KEY,
    business_name   VARCHAR(150)  NOT NULL,
    tagline         VARCHAR(150)  NOT NULL DEFAULT '',
    address         VARCHAR(255)  NOT NULL DEFAULT '',
    phone           VARCHAR(40)   NOT NULL DEFAULT '',
    email           VARCHAR(150)  NOT NULL DEFAULT '',
    tax_id          VARCHAR(40)   NOT NULL DEFAULT '',
    -- Key ikon merek (lib/glyphs BRAND_GLYPHS), mis. 'leaf'.
    logo_emoji      VARCHAR(32)   NOT NULL DEFAULT '',
    logo_url        VARCHAR(255),
    tax_percent     NUMERIC(5, 2) NOT NULL DEFAULT 11,
    tax_enabled     BOOLEAN       NOT NULL DEFAULT TRUE,
    service_percent NUMERIC(5, 2) NOT NULL DEFAULT 5,
    service_enabled BOOLEAN       NOT NULL DEFAULT TRUE,
    currency        VARCHAR(10)   NOT NULL DEFAULT 'IDR',
    receipt_footer  TEXT          NOT NULL DEFAULT '',
    receipt_width   VARCHAR(10)   NOT NULL DEFAULT '80mm',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. PERSIAPAN RECIPE / BOM  (fase berikutnya)
--    Menu → Recipe → Ingredients → pengurangan inventori bahan baku.
--    Tabel disiapkan agar produk dengan has_recipe = TRUE memotong stok bahan
--    baku, bukan stok produk jadi.
-- ---------------------------------------------------------------------------

CREATE TABLE ingredients (
    id           VARCHAR(36)    PRIMARY KEY,
    name         VARCHAR(150)   NOT NULL,
    sku          VARCHAR(50)    NOT NULL UNIQUE,
    unit         VARCHAR(20)    NOT NULL DEFAULT 'gram',
    cost_per_unit NUMERIC(14, 4) NOT NULL DEFAULT 0,
    quantity     NUMERIC(14, 3) NOT NULL DEFAULT 0,
    min_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
    location     VARCHAR(80)    NOT NULL DEFAULT 'Gudang Bahan',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE recipes (
    id         VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    yield_qty  INTEGER     NOT NULL DEFAULT 1,   -- porsi yang dihasilkan
    note       TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_items (
    id            VARCHAR(36)    PRIMARY KEY,
    recipe_id     VARCHAR(36)    NOT NULL REFERENCES recipes(id)     ON DELETE CASCADE,
    ingredient_id VARCHAR(36)    NOT NULL REFERENCES ingredients(id),
    quantity      NUMERIC(14, 3) NOT NULL DEFAULT 0,
    unit          VARCHAR(20)    NOT NULL DEFAULT 'gram',
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (recipe_id, ingredient_id)
);

-- ---------------------------------------------------------------------------
-- 9. PERSIAPAN PERANGKAT KERAS  (fase berikutnya)
-- ---------------------------------------------------------------------------

CREATE TABLE devices (
    id          VARCHAR(36)  PRIMARY KEY,
    kind        VARCHAR(40)  NOT NULL, -- printer|cash_drawer|scanner|customer_display
    driver      VARCHAR(60)  NOT NULL, -- browser|thermal-usb|thermal-network|bluetooth
    name        VARCHAR(120) NOT NULL,
    config      JSONB        NOT NULL DEFAULT '{}'::JSONB,
    is_active   BOOLEAN      NOT NULL DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMIT;

-- ===========================================================================
--  CONTOH QUERY LAPORAN
-- ===========================================================================

-- Penjualan harian
-- SELECT DATE(created_at) AS tanggal,
--        COUNT(*)          AS transaksi,
--        SUM(total)        AS pendapatan
-- FROM orders
-- WHERE status IN ('completed', 'paid')
--   AND created_at BETWEEN $1 AND $2
-- GROUP BY 1 ORDER BY 1;

-- Produk terlaris
-- SELECT p.name,
--        SUM(oi.quantity)  AS qty,
--        SUM(oi.subtotal)  AS pendapatan,
--        SUM(oi.subtotal - oi.cost_price * oi.quantity) AS laba
-- FROM order_items oi
-- JOIN orders   o ON o.id = oi.order_id AND o.status IN ('completed', 'paid')
-- JOIN products p ON p.id = oi.product_id
-- GROUP BY p.id, p.name
-- ORDER BY qty DESC LIMIT 10;

-- Meja yang sedang terisi beserta nilai bill berjalan
-- SELECT t.code, t.name, t.area,
--        o.order_number,
--        o.guest_count,
--        o.total                       AS nilai_bill,
--        NOW() - o.created_at          AS lama_duduk
-- FROM restaurant_tables t
-- LEFT JOIN orders o
--        ON o.table_id = t.id AND o.status = 'pending'
-- ORDER BY t.area, t.code;

-- Rekap penjualan harian beserta rincian metode pembayaran
-- SELECT DATE(o.created_at) AS tanggal,
--        COUNT(*)           AS transaksi,
--        SUM(o.total)       AS total_penjualan,
--        SUM(CASE WHEN p.method = 'cash'     THEN p.amount ELSE 0 END) AS tunai,
--        SUM(CASE WHEN p.method = 'qris'     THEN p.amount ELSE 0 END) AS qris,
--        SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END) AS transfer,
--        SUM(CASE WHEN p.method = 'card'     THEN p.amount ELSE 0 END) AS kartu
-- FROM orders o
-- LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'success'
-- WHERE o.status IN ('completed', 'paid')
-- GROUP BY 1 ORDER BY 1 DESC;

-- Pencapaian target per bulan
-- SELECT t.period,
--        t.revenue_target,
--        COALESCE(SUM(o.total), 0)                              AS realisasi,
--        ROUND(COALESCE(SUM(o.total), 0) / t.revenue_target * 100, 1) AS persen,
--        t.transaction_target,
--        COUNT(o.id)                                            AS transaksi
-- FROM sales_targets t
-- LEFT JOIN orders o
--        ON TO_CHAR(o.created_at, 'YYYY-MM') = t.period
--       AND o.status IN ('completed', 'paid')
-- GROUP BY t.period, t.revenue_target, t.transaction_target
-- ORDER BY t.period DESC;
