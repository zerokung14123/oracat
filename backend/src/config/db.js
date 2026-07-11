import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initSchema();
  }
});

// Helper functions for promise-based operations
export const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

function initSchema() {
  db.serialize(async () => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL
      )
    `);

    // 2. Photos Table
    db.run(`
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

    // 3. Bookings Table
    db.run(`
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

    // 4. Jobs Table
    db.run(`
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

    // 5. Settings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    db.run("ALTER TABLE bookings ADD COLUMN job_type TEXT DEFAULT 'custom'", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN price INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN deposit INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN location TEXT", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN start_time TEXT", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN end_time TEXT", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN note TEXT", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN email TEXT", (err) => {});
    db.run("ALTER TABLE bookings ADD COLUMN slip_image TEXT", (err) => {});

    // Seed default admin if not exists
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

    // Seed default settings
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

    // Seed default photos if empty
    try {
      const existingPhotos = await dbQuery('SELECT * FROM photos LIMIT 1');
      if (existingPhotos.length === 0) {
        const defaultPhotos = [
          { title: 'Romantic Garden Wedding', category: 'wedding', image_url: 'http://localhost:5000/public/mockups/mockup_wedding.png' },
          { title: 'Summer Breeze Portrait', category: 'portrait', image_url: 'http://localhost:5000/public/mockups/mockup_portrait.png' },
          { title: 'Neon Night Live Concert', category: 'event', image_url: 'http://localhost:5000/public/mockups/mockup_event.png' },
          { title: 'Class of 2026 Celebration', category: 'graduation', image_url: 'http://localhost:5000/public/mockups/mockup_graduation.png' }
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

    // Seed test bookings and tracking jobs mockup data if empty
    try {
      const existingBookings = await dbQuery('SELECT * FROM bookings LIMIT 1');
      if (existingBookings.length === 0) {
        const mockBookings = [
          {
            client_name: 'คุณธนาธร & คุณชลลดา',
            contact: '081-9998888',
            event_date: '2026-06-12',
            event_time: '09:00 - 13:00',
            details: 'งานพิธีมงคลสมรสช่วงเช้า เลี้ยงฉลองเที่ยง',
            job_type: 'wedding',
            price: 35000,
            deposit: 10000,
            location: 'โรงแรมแชงกรี-ล่า กรุงเทพ',
            start_time: '09:00',
            end_time: '13:00',
            note: 'เน้นถ่ายรูปแคนดิดและช่วงพิธีการบนเวที',
            status: 'approved'
          },
          {
            client_name: 'คุณจารุวรรณ',
            contact: 'LINE ID: jaru_port',
            event_date: '2026-06-25',
            event_time: '16:00 - 18:00',
            details: 'ถ่ายพอร์ตเทรตส่วนตัวนอกสถานที่',
            job_type: 'portrait',
            price: 3500,
            deposit: 1000,
            location: 'สวนป่าเบญจกิติ',
            start_time: '16:00',
            end_time: '18:00',
            note: 'ขอโทนฟิล์มอุ่นๆ แนวมินิมอลญี่ปุ่น',
            status: 'approved'
          },
          {
            client_name: 'บริษัท เทคสตาร์ จำกัด',
            contact: 'techstar_hr@techstar.com',
            event_date: '2026-07-04',
            event_time: '18:00 - 22:00',
            details: 'ถ่ายภาพงานสัมมนาประจำปีของบริษัทและงานปาร์ตี้กลางคืน',
            job_type: 'event',
            price: 15000,
            deposit: 5000,
            location: 'ศูนย์การประชุมแห่งชาติสิริกิติ์ Hall 3',
            start_time: '18:00',
            end_time: '22:00',
            note: 'ขอรูปส่งด่วนภายใน 2 วัน 50 รูปสำหรับทำข่าวประชาสัมพันธ์',
            status: 'approved'
          },
          {
            client_name: 'น้องแพรว (จุฬาฯ)',
            contact: '089-7776666',
            event_date: '2026-07-15',
            event_time: '08:00 - 12:00',
            details: 'ถ่ายภาพรับปริญญานอกรอบเดี่ยว',
            job_type: 'graduation',
            price: 4500,
            deposit: 1500,
            location: 'คณะอักษรศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
            start_time: '08:00',
            end_time: '12:00',
            note: 'ถ่ายกับครอบครัวและเพื่อนๆ นอกรอบเดี่ยวแสงเช้า',
            status: 'approved'
          },
          {
            client_name: 'คุณเอกพงษ์ & คุณสิรินทร์',
            contact: '082-1112222',
            event_date: '2026-05-20',
            event_time: '09:00 - 13:00',
            details: 'งานแต่งงานพิธีเช้าเลี้ยงเที่ยง (งานล่าช้ากว่ากำหนด)',
            job_type: 'wedding',
            price: 28000,
            deposit: 8000,
            location: 'บ้านเรือนไทย นนทบุรี',
            start_time: '09:00',
            end_time: '13:00',
            note: 'ส่งงานล่าช้าเพื่อทดสอบ Widget แจ้งเตือนคิวงานเลท',
            status: 'approved'
          },
          {
            client_name: 'คุณปกรณ์',
            contact: '085-5554444',
            event_date: '2026-08-20',
            event_time: '06:00 - 12:00',
            details: 'พิธีหลั่งน้ำพระพุทธมนต์เช้า รพ.สงฆ์',
            job_type: 'wedding',
            price: 12000,
            deposit: 3000,
            location: 'โรงพยาบาลสงฆ์ ห้องพิธี 2',
            start_time: '06:00',
            end_time: '12:00',
            note: 'ลูกค้าติดต่อขอจองล่วงหน้า รอยืนยันมัดจำ',
            status: 'pending'
          },
          {
            client_name: 'คุณวิชัย',
            contact: '083-3332222',
            event_date: '2026-05-10',
            event_time: '13:00 - 15:00',
            details: 'ถ่ายครอบครัว 5 ท่านนอกสถานที่',
            job_type: 'family',
            price: 5000,
            deposit: 1500,
            location: 'วัดพระศรีรัตนศาสดาราม (วัดพระแก้ว)',
            start_time: '13:00',
            end_time: '15:00',
            note: 'ปฏิเสธเนื่องจากช่างภาพติดงานแต่งงานต่างจังหวัด',
            status: 'rejected'
          }
        ];

        const trackingInfo = {
          'คุณธนาธร & คุณชลลดา': { tracking_code: 'ORAWED', status: 'completed', download_url: 'https://drive.google.com/drive/folders/mock_wedding_photos' },
          'คุณจารุวรรณ': { tracking_code: 'ORAPOR', status: 'editing', download_url: '' },
          'บริษัท เทคสตาร์ จำกัด': { tracking_code: 'ORAEVE', status: 'shooting', download_url: '' },
          'น้องแพรว (จุฬาฯ)': { tracking_code: 'ORAGRA', status: 'briefed', download_url: '' },
          'คุณเอกพงษ์ & คุณสิรินทร์': { tracking_code: 'ORADLY', status: 'editing', download_url: '' }
        };

        for (const mb of mockBookings) {
          const res = await dbRun(
            `INSERT INTO bookings (
              client_name, contact, event_date, event_time, details,
              job_type, price, deposit, location, start_time, end_time, note, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              mb.client_name, mb.contact, mb.event_date, mb.event_time, mb.details,
              mb.job_type, mb.price, mb.deposit, mb.location, mb.start_time, mb.end_time, mb.note, mb.status
            ]
          );

          // Get the inserted booking ID
          const row = await dbGet('SELECT last_insert_rowid() as id');
          const bookingId = row.id;

          // If approved and has tracking info, seed jobs table
          if (mb.status === 'approved' && trackingInfo[mb.client_name]) {
            const track = trackingInfo[mb.client_name];
            await dbRun(
              'INSERT INTO jobs (booking_id, tracking_code, status, download_url) VALUES (?, ?, ?, ?)',
              [bookingId, track.tracking_code, track.status, track.download_url]
            );
          }
        }
        console.log('Seeded mock bookings and tracking jobs successfully.');
      }
    } catch (e) {
      console.error('Failed to seed mockup bookings and jobs:', e.message);
    }
  });
}

export default db;
