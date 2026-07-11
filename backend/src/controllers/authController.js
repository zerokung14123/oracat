import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, displayName: user.display_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
