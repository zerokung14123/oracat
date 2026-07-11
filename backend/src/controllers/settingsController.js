import { dbQuery, dbRun } from '../config/db.js';

// Helper to convert settings list to a key-value object
async function getSettingsMap() {
  const settings = await dbQuery('SELECT * FROM settings');
  const map = {};
  settings.forEach(({ key, value }) => {
    map[key] = value;
  });
  return map;
}

// GET /api/public/portfolio - Get portfolio data (photos + settings)
export const getPublicPortfolio = async (req, res) => {
  try {
    const settings = await getSettingsMap();
    const photos = await dbQuery('SELECT * FROM photos WHERE is_visible = 1 ORDER BY created_at DESC');
    return res.json({ settings, photos });
  } catch (err) {
    console.error('Error fetching public portfolio:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/settings - Get settings (Manager)
export const getSettings = async (req, res) => {
  try {
    const settings = await getSettingsMap();
    return res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PUT /api/settings - Update settings (Manager)
export const updateSettings = async (req, res) => {
  const { settings } = req.body; // Expects settings as { key1: value1, key2: value2 }

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      // Use REPLACE INTO in SQLite for upsert
      await dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }

    const updatedSettings = await getSettingsMap();
    return res.json(updatedSettings);
  } catch (err) {
    console.error('Error updating settings:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
