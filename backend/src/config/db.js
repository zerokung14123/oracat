import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dns from 'dns';

// Force Node.js to prioritize IPv4 resolution to prevent ENETUNREACH issues on Render
dns.setDefaultResultOrder('ipv4first');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const isPostgres = !!process.env.DATABASE_URL;

let pool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('Connecting to PostgreSQL/Supabase database using URL...');
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });
} else {
  console.log('Connecting to SQLite database...');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
      initSchema();
    }
  });
}

// Keep track of the last inserted ID globally for SQLite query compatibility
let lastInsertId = 0;

// Query translation: SQLite syntax to PostgreSQL
function translateSql(sql) {
  if (!isPostgres) return sql;

  let translated = sql;

  // Replace auto-increment in CREATE TABLE
  translated = translated.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  
  // Replace datetime with timestamp
  translated = translated.replace(/DATETIME\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  // Replace SQLite specific INSERT OR REPLACE on settings table with PostgreSQL ON CONFLICT
  if (translated.toLowerCase().includes('insert or replace into settings')) {
    translated = translated.replace(/insert or replace into settings/gi, 'INSERT INTO settings');
    translated += ' ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
  }

  // Replace ? placeholders with $1, $2, etc.
  let paramIndex = 1;
  translated = translated.replace(/\?/g, () => `$${paramIndex++}`);

  return translated;
}

export const dbQuery = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    try {
      const res = await pool.query(pgSql, params);
      return res.rows;
    } catch (err) {
      console.error('[PostgreSQL Error] Query failed:', pgSql, err.message);
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const dbGet = async (sql, params = []) => {
  if (isPostgres) {
    // Intercept SELECT last_insert_rowid()
    if (sql.toLowerCase().includes('last_insert_rowid()')) {
      return { id: lastInsertId };
    }
    const pgSql = translateSql(sql);
    try {
      const res = await pool.query(pgSql, params);
      return res.rows[0] || null;
    } catch (err) {
      console.error('[PostgreSQL Error] Get failed:', pgSql, err.message);
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

export const dbRun = async (sql, params = []) => {
  if (isPostgres) {
    let pgSql = translateSql(sql);
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    const isSettings = pgSql.toLowerCase().includes('into settings');
    
    // In PostgreSQL, to get the last inserted ID, we append "RETURNING id"
    if (isInsert && !isSettings && !pgSql.toLowerCase().includes('returning')) {
      pgSql += ' RETURNING id';
    }

    try {
      const res = await pool.query(pgSql, params);
      let insertedId = 0;
      if (isInsert && res.rows[0]) {
        insertedId = res.rows[0].id;
        lastInsertId = insertedId;
      }
      return { id: insertedId, changes: res.rowCount };
    } catch (err) {
      console.error('[PostgreSQL Error] Run failed:', pgSql, err.message);
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

// Seed default configs
const defaultPackages = [
  {
    id: 'wedding',
    name: 'งานแต่งงาน (Wedding)',
    price: '35,000',
    badge: 'ยอดฮิต',
    features: [
      'ช่างภาพหลัก 2 ท่าน + ผู้ช่วย 1 ท่าน',
      'ไฟแฟลชและระบบแสงสว่างแบบครบเซ็ต',
      'ถ่ายไม่จำกัดจำนวนภาพ (ส่งไฟล์ทั้งหมด)',
      'ปรับโทนสีและแสงทุกรูป',
      'ส่งงานแบบ Luxury Digital Gallery ภายใน 30 วัน'
    ]
  },
  {
    id: 'portrait',
    name: 'พอร์ตเทรต (Portrait)',
    price: '3,500',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ระยะเวลา 2 ชั่วโมง',
      'ให้คำแนะนำเรื่องท่าทางและมุมกล้อง',
      'รีทัชรูปพิเศษ 30 รูป',
      'ปรับแต่งแสงสีไฟล์ภาพให้ครบถ้วน',
      'ส่งงานแบบดิจิทัลลิงก์ภายใน 15 วัน'
    ]
  },
  {
    id: 'event',
    name: 'Event / Party',
    price: '15,000',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ระยะเวลา 4 ชั่วโมง',
      'เก็บภาพบรรยากาศทั่วไป and Candid',
      'ส่งงานด่วน 50 รูปสำหรับทำข่าวภายใน 2 วัน',
      'ปรับโทนสีและส่งไฟล์ทั้งหมด',
      'ดาวน์โหลดผ่านแกลเลอรีภายใน 10 วัน'
    ]
  },
  {
    id: 'graduation',
    name: 'รับปริญญา (Graduation)',
    price: '4,500',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ครึ่งวัน (4 ชั่วโมง)',
      'นอกรอบเดี่ยว/กลุ่มย่อย ในและนอกสถานที่',
      'แต่งรูปโทนสวยละมุนทุกภาพ',
      'รีทัชภาพพิเศษ 15 รูป',
      'ลิงก์ดาวน์โหลดงานความคมชัดสูงภายใน 20 วัน'
    ]
  }
];

const defaultJobTypes = [
  { id: 'wedding', label: 'งานแต่งงาน', days: 30, deposit: 5000 },
  { id: 'portrait', label: 'พอร์ตเทรต', days: 15, deposit: 1000 },
  { id: 'event', label: 'Event', days: 10, deposit: 3000 },
  { id: 'product', label: 'ถ่ายสินค้า', days: 7, deposit: 1500 },
  { id: 'family', label: 'ครอบครัว', days: 14, deposit: 2000 },
  { id: 'graduation', label: 'รับปริญญา', days: 20, deposit: 1500 },
  { id: 'custom', label: 'อื่นๆ', days: 30, deposit: 1000 }
];

async function initSchema() {
  if (isPostgres) {
    console.log('Initializing PostgreSQL schemas...');
    try {
      // 1. Users Table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL
        )
      `);

      // 2. Photos Table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS photos (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          image_url TEXT NOT NULL,
          storage_key TEXT,
          is_visible INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Bookings Table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          client_name TEXT NOT NULL,
          contact TEXT NOT NULL,
          event_date TEXT NOT NULL,
          event_time TEXT NOT NULL,
          details TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Jobs Table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS jobs (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER UNIQUE,
          tracking_code TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'briefed',
          download_url TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        )
      `);

      // 5. Settings Table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      // Add columns if missing (ignore error if column already exists)
      const addColumn = async (table, col, type) => {
        try {
          await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        } catch (_) {}
      };

      await addColumn('bookings', 'job_type', "TEXT DEFAULT 'custom'");
      await addColumn('bookings', 'price', "INTEGER DEFAULT 0");
      await addColumn('bookings', 'deposit', "INTEGER DEFAULT 0");
      await addColumn('bookings', 'location', "TEXT");
      await addColumn('bookings', 'start_time', "TEXT");
      await addColumn('bookings', 'end_time', "TEXT");
      await addColumn('bookings', 'note', "TEXT");
      await addColumn('bookings', 'email', "TEXT");
      await addColumn('bookings', 'slip_image', "TEXT");
      await addColumn('bookings', 'google_event_id', "TEXT");

      // Seed admin if missing
      const admin = await dbGet('SELECT * FROM users WHERE username = $1', ['admin']);
      if (!admin) {
        const hash = bcrypt.hashSync('admin123', 10);
        await dbRun('INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3)', [
          'admin',
          hash,
          'Photographer Manager',
        ]);
        console.log('Seeded default admin account in PostgreSQL.');
      }

      // Seed settings if missing
      const defaultSettings = [
        { key: 'welcome_title', value: 'Welcome to ตีนแมวfoto' },
        { key: 'welcome_subtitle', value: 'Professional photography services for weddings, portraits, and corporate events.' },
        { key: 'contact_email', value: 'contact@teenmaofoto.com' },
        { key: 'contact_phone', value: '+66 81 234 5678' },
        { key: 'social_instagram', value: 'https://instagram.com/teenmaofoto' },
        { key: 'social_facebook', value: 'https://facebook.com/teenmaofoto' },
        { key: 'layout_theme', value: 'dark' },
        { key: 'studio_name', value: 'ตีนแมวfoto' },
        { key: 'packages', value: JSON.stringify(defaultPackages) },
        { key: 'job_types', value: JSON.stringify(defaultJobTypes) },
        { key: 'promptpay_id', value: '0938106998' },
        { key: 'thunder_token', value: '' }
      ];

      for (const { key, value } of defaultSettings) {
        try {
          const setting = await dbGet('SELECT * FROM settings WHERE key = $1', [key]);
          if (!setting) {
            await dbRun('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, value]);
          }
        } catch (e) {
          console.error(`Failed to seed setting ${key}:`, e.message);
        }
      }

      // Seed default photos
      const existingPhotos = await dbQuery('SELECT * FROM photos LIMIT 1');
      if (existingPhotos.length === 0) {
        const defaultPhotos = [
          { title: 'Romantic Garden Wedding', category: 'wedding', image_url: `${backendUrl}/public/mockups/mockup_wedding.png` },
          { title: 'Summer Breeze Portrait', category: 'portrait', image_url: `${backendUrl}/public/mockups/mockup_portrait.png` },
          { title: 'Neon Night Live Concert', category: 'event', image_url: `${backendUrl}/public/mockups/mockup_event.png` },
          { title: 'Class of 2026 Celebration', category: 'graduation', image_url: `${backendUrl}/public/mockups/mockup_graduation.png` }
        ];
        for (const photo of defaultPhotos) {
          await dbRun(
            'INSERT INTO photos (title, category, image_url, is_visible) VALUES ($1, $2, $3, 1)',
            [photo.title, photo.category, photo.image_url]
          );
        }
        console.log('Seeded default portfolio photos in PostgreSQL.');
      }

      console.log('PostgreSQL schema initialization and seeding complete.');
    } catch (err) {
      console.error('Error during PostgreSQL schema initialization:', err.message);
    }
  } else {
    // SQLite Flow
    sqliteDb.serialize(async () => {
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          image_url TEXT NOT NULL,
          storage_key TEXT,
          is_visible INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_name TEXT NOT NULL,
          contact TEXT NOT NULL,
          event_date TEXT NOT NULL,
          event_time TEXT NOT NULL,
          details TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id INTEGER UNIQUE,
          tracking_code TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'briefed',
          download_url TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      sqliteDb.run("ALTER TABLE bookings ADD COLUMN job_type TEXT DEFAULT 'custom'", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN price INTEGER DEFAULT 0", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN deposit INTEGER DEFAULT 0", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN location TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN start_time TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN end_time TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN note TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN email TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN slip_image TEXT", (err) => {});
      sqliteDb.run("ALTER TABLE bookings ADD COLUMN google_event_id TEXT", (err) => {});

      // Seed admin if missing
      try {
        const admin = await dbGet('SELECT * FROM users WHERE username = ?', ['admin']);
        if (!admin) {
          const hash = bcrypt.hashSync('admin123', 10);
          await dbRun('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)', [
            'admin',
            hash,
            'Photographer Manager',
          ]);
          console.log('Seeded default admin account (username: admin, password: admin123)');
        }
      } catch (e) {
        console.error('Failed to seed admin:', e.message);
      }

      // Seed settings if missing
      const defaultSettings = [
        { key: 'welcome_title', value: 'Welcome to ตีนแมวfoto' },
        { key: 'welcome_subtitle', value: 'Professional photography services for weddings, portraits, and corporate events.' },
        { key: 'contact_email', value: 'contact@teenmaofoto.com' },
        { key: 'contact_phone', value: '+66 81 234 5678' },
        { key: 'social_instagram', value: 'https://instagram.com/teenmaofoto' },
        { key: 'social_facebook', value: 'https://facebook.com/teenmaofoto' },
        { key: 'layout_theme', value: 'dark' },
        { key: 'studio_name', value: 'ตีนแมวfoto' },
        { key: 'packages', value: JSON.stringify(defaultPackages) },
        { key: 'job_types', value: JSON.stringify(defaultJobTypes) },
        { key: 'promptpay_id', value: '0938106998' },
        { key: 'thunder_token', value: '' }
      ];

      for (const { key, value } of defaultSettings) {
        try {
          const setting = await dbGet('SELECT * FROM settings WHERE key = ?', [key]);
          if (!setting) {
            await dbRun('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
          }
        } catch (e) {
          console.error(`Failed to seed setting ${key}:`, e.message);
        }
      }

      // Seed photos if missing
      try {
        const existingPhotos = await dbQuery('SELECT * FROM photos LIMIT 1');
        if (existingPhotos.length === 0) {
          const defaultPhotos = [
            { title: 'Romantic Garden Wedding', category: 'wedding', image_url: `${backendUrl}/public/mockups/mockup_wedding.png` },
            { title: 'Summer Breeze Portrait', category: 'portrait', image_url: `${backendUrl}/public/mockups/mockup_portrait.png` },
            { title: 'Neon Night Live Concert', category: 'event', image_url: `${backendUrl}/public/mockups/mockup_event.png` },
            { title: 'Class of 2026 Celebration', category: 'graduation', image_url: `${backendUrl}/public/mockups/mockup_graduation.png` }
          ];
          for (const photo of defaultPhotos) {
            await dbRun(
              'INSERT INTO photos (title, category, image_url, is_visible) VALUES (?, ?, ?, 1)',
              [photo.title, photo.category, photo.image_url]
            );
          }
          console.log('Seeded default portfolio photos.');
        }
      } catch (e) {
        console.error('Failed to seed default photos:', e.message);
      }
    });
  }
}

// Auto-trigger schema initialization on Postgres connection
if (isPostgres) {
  initSchema();
}

const db = isPostgres ? pool : sqliteDb;
export default db;
