const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const pool = new Pool({
  user: 'avnadmin',
  host: 'pg-1c3eb2a-tal-dcf2.j.aivencloud.com',
  database: 'defaultdb',
  password: 'AVNS_r3YiZuAdz-whlUj4ona',
  port: 14296,
  ssl: {
    rejectUnauthorized: true,
    ca: `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUWx24XFk9rewA3YOEas/PZG+Dz/wwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1ZTZjMmQ1YmQtYTNiMS00YWQ5LTljOWUtY2Q4MjBhZGYx
YTUxIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwNjEwMTkwNzUyWhcNMzUwNjA4MTkw
NzUyWjBAMT4wPAYDVQQDDDVlNmMyZDViZC1hM2IxLTRhZDktOWM5ZS1jZDgyMGFk
ZjFhNTEgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAK5wtGhnUAuyIK33rbDHSPcqAWEnbPo2fjtIt+xg6QYvK5HYmYnYOGkz
NsL0BxQ4jyGpoAG3ctLcv8U1FQ587zVCdBocyEVaOv05DNnpTonpU+3UfPgvvxaB
Cflgzhsn5rdLhDCOORQstJ/EOBcN1T4HX+tK6uZV97nhV3F+vD7JI5DGz1iuWolY
dMPm4RnqeK/pfpfTuVgUWYAf+gDPf4SimMK7W0dYvMh5co9Onmi24fV2OlqtfBxx
zbJGdDJSDA4XrnHfDIp+k65BSlBmwAwwG0fSeeQworiLnX2mk5+4zv4sBkTet42d
spZN4mTSva3Sx/SQ2HcWoMAMQCjD3JnkrPbidFRHDCzf3ba1PQkwgJ4TXiSqP6au
Rvfi5vIED4kRzgqXfohrxJ3upn+n55aMeCw+dRhLq9rWM3YOP87ZYt1TTXBHXoT2
eGgBuwmVpfD4m8RP+QweXOpriPcjg3uKAQLOCW2jwy48rvVp+8LFmm4DJO6wI/EJ
wDeiUvoJNwIDAQABo0IwQDAdBgNVHQ4EFgQUltcGwjxMWWym3VlTl7QhaxW/KV0w
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAHpHpaLXfpgBB+bHf8FVvT8q+k9CRac44usN0MvCNq7YYpfz6R0IJvJ5ZC6G
ZrOiMqO5ik+sEjc0k2sP3e+ZwIJR/OfReSwfs9f5M1oYq6pM+nAP10iIpGuvYz7z
aMcfjHN+7kAAG+9NtxEWWMokApCG23ORz8noKsNSNBUVXvCjgl32E0nviTCOKqEb
1axDY7QcdUdaHQbOjAtmnvZ6JjZlzAZOGIpvsYVOrtCsb1xC/bdIvntqnB/AYmGT
vlpuzWa0TfOTx8giT19e1Ka3kWNo++ZpwI0tbYzz/i+n/YERmOz5j5FiqeEkqNWy
IL0Zln1dMKuC0/zGyYbB3AuFqrXHnRyeBd5dDUetBjQkjwK2yi1VRYHslg85aqBJ
EU+TF511LR/+Rn+KrcMOfDNHUnyiJcScWNh0HoDCi8iB5ut7Epbu1vxjXlwi2uno
H5rYf4q11WnDskGogiBUS1URsc7ng3hMQa2K9/a1ezyai0oCMnEDQUvwZHTUft8i
urSF3Q==
-----END CERTIFICATE-----`
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// The rest of your code remains unchanged


// Register endpoint
app.post('/register', async (req, res) => {
  // Accept either JSON or URL-encoded form data
  const { email, password, full_name, role } = req.body;

  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).send('Invalid role');
  }

  if (!email || !password || !full_name) {
    return res.status(400).send('Missing fields');
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)`,
      [email, hash, full_name, role]
    );
    res.status(201).send('User registered');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).send('User not found');

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('Wrong password');

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
      }
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});


// Ticketing system
app.post('/tickets', async (req, res) => {
  const { student_id, teacher_id, subject, message } = req.body;
  if (!student_id || !teacher_id || !subject || !message) {
    return res.status(400).send('Missing fields');
  }

  try {
    await pool.query(
      `INSERT INTO tickets (student_id, teacher_id, subject, message) VALUES ($1, $2, $3, $4)`,
      [student_id, teacher_id, subject, message]
    );
    res.status(201).send('Ticket created');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/teachers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name FROM users WHERE role = 'teacher'`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/tickets/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  try {
    const result = await pool.query(
      `SELECT tickets.*, users.full_name AS student_name
       FROM tickets
       JOIN users ON tickets.student_id = users.id
       WHERE tickets.teacher_id = $1
       ORDER BY tickets.created_at DESC`,
      [teacherId]
    );
    console.log('Tickets sent to front:', result.rows);
    res.status(200).json(result.rows);

  } catch (err) {
    res.status(500).send('Server error');
  }
   console.log('Tickets sent to front:', result.rows);
});

// Get all tickets for a specific student with teacher name and response
app.get('/tickets/:studentId', async (req, res) => {
  const { studentId } = req.params;
    try {
      const result = await pool.query(
        `SELECT tickets.*, users.full_name AS student_name
         FROM tickets
         JOIN users ON tickets.student_id = users.id
         WHERE tickets.student_id = $1
         ORDER BY tickets.created_at DESC`,
        [studentId]
      );
      console.log('Tickets sent to front:', result.rows);
      res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
    console.log('Tickets sent to front:', result.rows);
    res.status(200).json(result.rows);
});


app.put('/tickets/:ticketId/reply', async (req, res) => {
  const { ticketId } = req.params;
  const { response } = req.body;

  if (!response) return res.status(400).send('Missing response');

  try {
    await pool.query(
      `UPDATE tickets SET response = $1, responded_at = NOW() WHERE id = $2`,
      [response, ticketId]
    );
    res.status(200).send('Reply saved');
  } catch (err) {
    res.status(500).send('Server error');
  }
  console.log(`Reply saved for ticket ${ticketId}:`, response);
});

// Admin endpoints
app.get('/admin/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/admin/tickets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tickets.*,
        students.full_name AS student_name,
        teachers.full_name AS teacher_name
      FROM tickets
      JOIN users AS students ON tickets.student_id = students.id
      JOIN users AS teachers ON tickets.teacher_id = teachers.id
      ORDER BY tickets.created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.delete('/admin/users/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('DELETE FROM tickets WHERE student_id = $1 OR teacher_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.status(200).send('User deleted successfully');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Backend running on http://0.0.0.0:3001');
});