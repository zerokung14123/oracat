import { dbQuery, dbRun, dbGet } from '../config/db.js';

// GET /api/public/portfolio - Get only visible photos
export const getPublicPhotos = async (req, res) => {
  try {
    const photos = await dbQuery('SELECT * FROM photos WHERE is_visible = 1 ORDER BY created_at DESC');
    return res.json(photos);
  } catch (err) {
    console.error('Error fetching public photos:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/photos - Get all photos (Manager)
export const getAllPhotos = async (req, res) => {
  try {
    const photos = await dbQuery('SELECT * FROM photos ORDER BY created_at DESC');
    return res.json(photos);
  } catch (err) {
    console.error('Error fetching manager photos:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /api/photos - Add a photo
export const addPhoto = async (req, res) => {
  const { title, category, image_url, is_visible } = req.body;

  if (!title || !category || !image_url) {
    return res.status(400).json({ error: 'Title, category, and image_url are required.' });
  }

  const visible = is_visible === undefined ? 1 : (is_visible ? 1 : 0);

  try {
    const result = await dbRun(
      'INSERT INTO photos (title, category, image_url, is_visible) VALUES (?, ?, ?, ?)',
      [title, category, image_url, visible]
    );
    const newPhoto = await dbGet('SELECT * FROM photos WHERE id = ?', [result.id]);
    return res.status(201).json(newPhoto);
  } catch (err) {
    console.error('Error adding photo:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PATCH /api/photos/:id - Update photo settings (toggle visibility)
export const updatePhoto = async (req, res) => {
  const { id } = req.params;
  const { title, category, is_visible, image_url } = req.body;

  try {
    const photo = await dbGet('SELECT * FROM photos WHERE id = ?', [id]);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    const updatedTitle = title !== undefined ? title : photo.title;
    const updatedCategory = category !== undefined ? category : photo.category;
    const updatedVisible = is_visible !== undefined ? (is_visible ? 1 : 0) : photo.is_visible;
    const updatedUrl = image_url !== undefined ? image_url : photo.image_url;

    await dbRun(
      'UPDATE photos SET title = ?, category = ?, is_visible = ?, image_url = ? WHERE id = ?',
      [updatedTitle, updatedCategory, updatedVisible, updatedUrl, id]
    );

    const updatedPhoto = await dbGet('SELECT * FROM photos WHERE id = ?', [id]);
    return res.json(updatedPhoto);
  } catch (err) {
    console.error('Error updating photo:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// DELETE /api/photos/:id - Delete a photo
export const deletePhoto = async (req, res) => {
  const { id } = req.params;

  try {
    const photo = await dbGet('SELECT * FROM photos WHERE id = ?', [id]);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    await dbRun('DELETE FROM photos WHERE id = ?', [id]);
    return res.json({ message: 'Photo deleted successfully.' });
  } catch (err) {
    console.error('Error deleting photo:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
