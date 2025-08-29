// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

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
-----END CERTIFICATE-----`,
    },
});

// Test database connection + lightweight migration for attendance column
pool.query('SELECT NOW()', async (err) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('Database connected successfully');
});

// ---------- Auth ----------
app.post('/register', async (req, res) => {
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
            },
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ---------- Tickets ----------
app.post('/tickets', upload.single('attachment'), async (req, res) => {
    const { student_id, teacher_id, subject, message } = req.body;
    const attachment = req.file ? req.file.filename : null;
    if (!student_id || !teacher_id || !subject || !message) {
        return res.status(400).send('Missing fields');
    }
    try {
        await pool.query(
            `INSERT INTO tickets (student_id, teacher_id, subject, message, attachment) VALUES ($1, $2, $3, $4, $5)`,
            [student_id, teacher_id, subject, message, attachment]
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

app.get('/tickets/teacher/:teacherId', async (req, res) => {
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
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/tickets/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await pool.query(
            `SELECT tickets.*, teacher_users.full_name AS teacher_name
       FROM tickets
       JOIN users AS teacher_users ON tickets.teacher_id = teacher_users.id
       WHERE tickets.student_id = $1
       ORDER BY tickets.created_at DESC`,
            [studentId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).send('Server error');
    }
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
});

// ---------- Lessons ----------
app.post('/lessons', async (req, res) => {
    const { title, date, time, description, teacher_id } = req.body;
    if (!title || !date || !time || !teacher_id) {
        return res.status(400).send('Missing fields');
    }
    try {
        await pool.query(
            `INSERT INTO lessons (title, date, time, description, teacher_id) VALUES ($1, $2, $3, $4, $5)`,
            [title, date, time, description, teacher_id]
        );
        res.status(201).send('Lesson created');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/lessons', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT lessons.*, users.full_name AS teacher_name
       FROM lessons
       JOIN users ON lessons.teacher_id = users.id
       ORDER BY date ASC, time ASC`
        );
        const lessons = result.rows.map((l) => ({
            ...l,
            date:
                l.date instanceof Date
                    ? l.date.toISOString().slice(0, 10)
                    : typeof l.date === 'string' && l.date.length >= 10
                        ? l.date.slice(0, 10)
                        : l.date,
        }));
        res.status(200).json(lessons);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/lessons/:lessonId/signup', async (req, res) => {
    const { lessonId } = req.params;
    const { student_id } = req.body;
    if (!student_id) return res.status(400).send('Missing student_id');
    try {
        const exists = await pool.query(
            `SELECT 1 FROM lesson_signups WHERE lesson_id = $1 AND student_id = $2`,
            [lessonId, student_id]
        );
        if (exists.rows.length > 0) {
            return res.status(400).send('Already signed up');
        }
        //if the lesson date is in the past, reject
        if(new Date((await pool.query(`SELECT date FROM lessons WHERE id=$1`, [lessonId])).rows[0].date) < new Date()){
            return res.status(400).send('Cannot sign up for past lessons');
        }
        await pool.query(
            `INSERT INTO lesson_signups (lesson_id, student_id) VALUES ($1, $2)`,
            [lessonId, student_id]
        );
        res.status(201).send('Signed up for lesson');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Unsign
app.delete('/lessons/:lessonId/unsign', async (req, res) => {
    const { lessonId } = req.params;
    const { student_id } = req.body;
    if (!student_id) return res.status(400).send('Missing student_id');
    try {
        const result = await pool.query(
            `DELETE FROM lesson_signups WHERE lesson_id = $1 AND student_id = $2`,
            [lessonId, student_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).send('Not signed up for this lesson');
        }
        res.status(200).send('Unregistered from lesson');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/lessons/:lessonId/students', async (req, res) => {
    const { lessonId } = req.params;
    try {
        const result = await pool.query(
            `SELECT users.id, users.full_name, users.email
       FROM lesson_signups
       JOIN users ON lesson_signups.student_id = users.id
       WHERE lesson_signups.lesson_id = $1`,
            [lessonId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/students/:studentId/lessons', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await pool.query(
            `SELECT lessons.*, users.full_name AS teacher_name
       FROM lesson_signups
       JOIN lessons ON lesson_signups.lesson_id = lessons.id
       JOIN users ON lessons.teacher_id = users.id
       WHERE lesson_signups.student_id = $1 and lessons.date >= CURRENT_DATE
       ORDER BY lessons.date ASC, lessons.time ASC`,
            [studentId]
        );
        const lessons = result.rows.map((l) => ({
            ...l,
            date:
                l.date instanceof Date
                    ? l.date.toISOString().slice(0, 10)
                    : typeof l.date === 'string' && l.date.length >= 10
                        ? l.date.slice(0, 10)
                        : l.date,
        }));
        res.status(200).json(lessons);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ---------- Admin ----------
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
        await pool.query('DELETE FROM lesson_signups WHERE student_id = $1', [userId]);
        await pool.query('DELETE FROM lessons WHERE teacher_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.status(200).send('User deleted successfully');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ---------- Attendance (NEW, 1-column version) ----------

// List students (for Attendance search)
app.get('/students', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, email
       FROM users
       WHERE role = 'student'
       ORDER BY full_name ASC`
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Get attendance for a given student (lessons + present)
app.get('/attendance', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).send('Missing student_id');

    try {
        const result = await pool.query(
            `SELECT
         ls.lesson_id,
         l.title,
         l.date,
         l.time,
         ls.present
       FROM lesson_signups ls
       JOIN lessons l ON l.id = ls.lesson_id
       WHERE ls.student_id = $1
       ORDER BY l.date ASC, l.time ASC`,
            [student_id]
        );

        const rows = result.rows.map((r) => ({
            ...r,
            date:
                r.date instanceof Date
                    ? r.date.toISOString().slice(0, 10)
                    : typeof r.date === 'string' && r.date.length >= 10
                        ? r.date.slice(0, 10)
                        : r.date,
            // present can be true/false or null if never marked
        }));

        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Mark attendance (teacher owning the lesson can set present true/false)
app.post('/attendance/mark', async (req, res) => {
    const { lesson_id, student_id, present, teacher_id } = req.body;

    if (!lesson_id || !student_id || typeof present !== 'boolean' || !teacher_id) {
        return res
            .status(400)
            .send('Missing fields (lesson_id, student_id, present:boolean, teacher_id)');
    }

    try {
        // Check lesson owner
        const lesson = await pool.query('SELECT teacher_id FROM lessons WHERE id = $1', [lesson_id]);
        if (lesson.rows.length === 0) {
            return res.status(404).send('Lesson not found');
        }
        if (lesson.rows[0].teacher_id !== Number(teacher_id)) {
            return res.status(403).send('Forbidden: this teacher does not own the lesson');
        }

        // Check signup exists
        const signup = await pool.query(
            'SELECT 1 FROM lesson_signups WHERE lesson_id = $1 AND student_id = $2',
            [lesson_id, student_id]
        );
        if (signup.rows.length === 0) {
            return res.status(404).send('Student is not signed up for this lesson');
        }

        // Update present flag
        await pool.query(
            `UPDATE lesson_signups
       SET present = $1
       WHERE lesson_id = $2 AND student_id = $3`,
            [present, lesson_id, student_id]
        );

        res.status(200).send('Attendance updated');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// === GRADES / NOTES ===

// Every student of a teacher (to select whom to grade)
app.get('/teachers/:teacherId/students', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const q = `
      SELECT DISTINCT u.id, u.full_name, u.email
      FROM lessons L
      JOIN lesson_signups S ON S.lesson_id = L.id
      JOIN users u ON u.id = S.student_id
      WHERE L.teacher_id = $1
      ORDER BY u.full_name ASC
    `;
        const r = await pool.query(q, [teacherId]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).send('Server error');
    }
});

// Lessons of a teacher (needed to select which lesson to grade)
app.get('/teachers/:teacherId/lessons', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const q = `
      SELECT id, title, date, time
      FROM lessons
      WHERE teacher_id = $1
      ORDER BY date ASC, time ASC
    `;
        const r = await pool.query(q, [teacherId]);
        // normalise date
        const lessons = r.rows.map(l => ({
            ...l,
            date: l.date instanceof Date ? l.date.toISOString().slice(0,10) : (l.date || '')
        }));
        res.json(lessons);
    } catch (e) {
        res.status(500).send('Server error');
    }
});

// Upsert grade for a student in a lesson (by the teacher owning the lesson)
app.post('/grades', async (req, res) => {
    const { lesson_id, student_id, teacher_id, grade, comment } = req.body;
    if (!lesson_id || !student_id || !teacher_id || grade == null) {
        return res.status(400).send('Missing fields');
    }
    try {
        // Vérifie que le cours appartient au prof
        const owns = await pool.query(`SELECT 1 FROM lessons WHERE id=$1 AND teacher_id=$2`, [lesson_id, teacher_id]);
        if (owns.rowCount === 0) return res.status(403).send('Not your lesson');

        // (Optionnel) Vérifie que l’élève est inscrit
        const enrolled = await pool.query(
            `SELECT 1 FROM lesson_signups WHERE lesson_id=$1 AND student_id=$2`,
            [lesson_id, student_id]
        );
        if (enrolled.rowCount === 0) return res.status(400).send('Student not signed up to this lesson');

        const q = `
      INSERT INTO grades (lesson_id, student_id, teacher_id, grade, comment)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (lesson_id, student_id)
      DO UPDATE SET grade=EXCLUDED.grade, comment=EXCLUDED.comment, updated_at=NOW()
      RETURNING *;
    `;
        const r = await pool.query(q, [lesson_id, student_id, teacher_id, grade, comment || null]);
        res.status(200).json(r.rows[0]);
    } catch (e) {
        res.status(500).send('Server error');
    }
});

// Grade of student
app.get('/students/:studentId/grades', async (req, res) => {
    const { studentId } = req.params;
    try {
        const q = `
      SELECT g.*, L.title AS lesson_title, L.date, L.time, T.full_name AS teacher_name
      FROM grades g
      JOIN lessons L ON L.id = g.lesson_id
      JOIN users T ON T.id = g.teacher_id
      WHERE g.student_id = $1
      ORDER BY L.date DESC, L.time DESC
    `;
        const r = await pool.query(q, [studentId]);
        const rows = r.rows.map(l => ({
            ...l,
            date: l.date instanceof Date ? l.date.toISOString().slice(0,10) : (l.date || '')
        }));
        res.json(rows);
    } catch (e) {
        res.status(500).send('Server error');
    }
});


app.get('/lessons/:lessonId/grades', async (req, res) => {
    const { lessonId } = req.params;
    const { teacher_id } = req.query; // <-- ex: /lessons/123/grades?teacher_id=45

    if (!teacher_id) return res.status(400).send('Missing teacher_id');

    try {
        // check ownership
        const own = await pool.query('SELECT teacher_id FROM lessons WHERE id=$1', [lessonId]);
        if (own.rowCount === 0) return res.status(404).send('Lesson not found');
        if (Number(own.rows[0].teacher_id) !== Number(teacher_id)) {
            return res.status(403).send('Forbidden');
        }

        const q = `
      SELECT g.student_id, u.full_name, g.grade
      FROM grades g
      JOIN users u ON u.id = g.student_id
      WHERE g.lesson_id = $1
      ORDER BY u.full_name ASC
    `;
        const r = await pool.query(q, [lessonId]);
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server error');
    }
});

// Stats for a lesson (for a given student_id): my_grade, class_avg, class_count, my_rank
app.get('/lessons/:lessonId/grade-stats', async (req, res) => {
    const { lessonId } = req.params;
    const { student_id } = req.query;
    if (!student_id) return res.status(400).send('Missing student_id');

    try {
        // grade
        const me = await pool.query(
            'SELECT grade FROM grades WHERE lesson_id=$1 AND student_id=$2',
            [lessonId, student_id]
        );
        const my_grade = me.rowCount ? Number(me.rows[0].grade) : null;

        // avg + count
        const agg = await pool.query(
            'SELECT AVG(grade) AS avg, COUNT(*) AS count FROM grades WHERE lesson_id=$1',
            [lessonId]
        );
        const class_avg = agg.rows[0].avg ? Number(agg.rows[0].avg) : 0;
        const class_count = Number(agg.rows[0].count || 0);

        // rang (1 + nb de notes strictement supérieures)
        let my_rank = null;
        if (my_grade != null) {
            const rk = await pool.query(
                `
          SELECT 1 + COUNT(*) AS rank
          FROM grades
          WHERE lesson_id=$1 AND grade > (
            SELECT grade FROM grades WHERE lesson_id=$1 AND student_id=$2
          )
        `,
                [lessonId, student_id]
            );
            my_rank = rk.rows[0]?.rank ? Number(rk.rows[0].rank) : 1;
        }

        res.json({
            my_grade,
            class_avg,
            class_count,
            my_rank,
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server error');
    }
});

// stats only for student
app.get('/lessons/:lessonId/grade-stats', async (req, res) => {
    const { lessonId } = req.params;
    const { student_id } = req.query;
    if (!student_id) return res.status(400).send('Missing student_id');

    try {
        // ta note
        const me = await pool.query(
            'SELECT grade FROM grades WHERE lesson_id=$1 AND student_id=$2',
            [lessonId, student_id]
        );
        const my_grade = me.rowCount ? Number(me.rows[0].grade) : null;

        // avg + count
        const agg = await pool.query(
            'SELECT AVG(grade) AS avg, COUNT(*) AS count FROM grades WHERE lesson_id=$1',
            [lessonId]
        );
        const class_avg = agg.rows[0].avg ? Number(agg.rows[0].avg) : 0;
        const class_count = Number(agg.rows[0].count || 0);

        // rank
        let my_rank = null;
        if (my_grade != null) {
            const rk = await pool.query(
                `
          SELECT 1 + COUNT(*) AS rank
          FROM grades
          WHERE lesson_id=$1 AND grade > (
            SELECT grade FROM grades WHERE lesson_id=$1 AND student_id=$2
          )
        `,
                [lessonId, student_id]
            );
            my_rank = rk.rows[0]?.rank ? Number(rk.rows[0].rank) : 1;
        }

        res.json({
            my_grade,
            class_avg,
            class_count,
            my_rank,
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server error');
    }
});

// All grades given by a teacher (for review)
app.get('/teachers/:teacherId/grades', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const q = `
      SELECT
        g.id,
        g.grade,
        g.comment,
        g.created_at,
        l.title AS lesson_title,
        l.date,
        u.full_name AS student_name
      FROM grades g
      JOIN lessons l ON l.id = g.lesson_id
      JOIN users u ON u.id = g.student_id
      WHERE g.teacher_id = $1
      ORDER BY l.date DESC, l.time DESC NULLS LAST, g.created_at DESC
    `;
        const r = await pool.query(q, [teacherId]);
        const rows = r.rows.map(x => ({
            ...x,
            date: x.date instanceof Date ? x.date.toISOString().slice(0,10) : (x.date || '')
        }));
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server error');
    }
});

// stats for teacher (count, avg, min, max)
app.get('/teachers/:teacherId/grades/stats', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const q = `
      SELECT
        COUNT(*)::int AS count,
        ROUND(AVG(grade)::numeric, 2) AS avg,
        MIN(grade) AS min,
        MAX(grade) AS max
      FROM grades
      WHERE teacher_id = $1
    `;
        const r = await pool.query(q, [teacherId]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server error');
    }
});


// ---------- Server start ----------
app.listen(3001, '0.0.0.0', () => {
    console.log('Backend running on http://0.0.0.0:3001');
});

