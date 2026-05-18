const express = require('express');
const fetch   = require('node-fetch');
const cheerio = require('cheerio');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const BASE_URL = 'http://www.kci.xn--12c1bpbba3dcfr1jra8c9bzgl.com';
const UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── helper: parse table.three → array of data rows ──────────────────
function parseThreeTable($, tblEl) {
  const rows = [];
  $(tblEl).find('tr').each((i, tr) => {
    const firstCell = $(tr).find('td').first().text().trim();
    if (firstCell === 'ที่') return; // ข้าม header row
    const cells = [];
    $(tr).find('td').each((_, td) => {
      cells.push($(td).text().replace(/\s+/g, ' ').trim());
    });
    if (cells.some(c => c !== '')) rows.push(cells);
  });
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
//  POST /api/login
//  1. Login → ได้ Cookie
//  2. GET main-stu.php  → ได้คะแนนสรุป + ตั้ง Session ID ให้ PHP
//  3. GET pub_stu.php   → ได้รายงานละเอียด (ต้องเข้า main ก่อน!)
//  Return ทุกอย่างใน response เดียว
// ═══════════════════════════════════════════════════════════════════
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  try {
    // ── STEP 1: Login ────────────────────────────────────────────────
    const formData = new URLSearchParams();
    formData.append('user_stu', username);
    formData.append('pass_stu', password);
    formData.append('button2',  'เข้าสู่ระบบ');

    const loginRes = await fetch(`${BASE_URL}/stu/index.php`, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body:     formData.toString(),
      redirect: 'manual',
    });

    const rawCookies = loginRes.headers.raw()['set-cookie'];
    if (!rawCookies || rawCookies.length === 0) {
      return res.status(401).json({ success: false, message: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Username / Password' });
    }
    const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');
    console.log('[login] cookie:', cookie);

    // ── STEP 2: GET main-stu.php (ดึงคะแนน + ตั้ง Session ให้ PHP) ──
    const mainRes  = await fetch(`${BASE_URL}/stu/main-stu.php`, {
      headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE_URL}/stu/index.php` },
    });
    const mainHtml = await mainRes.text();
    console.log('[main] status:', mainRes.status, '| length:', mainHtml.length);

    // ตรวจ login ไม่ผ่าน
    if (mainHtml.includes('pass_stu') || mainHtml.includes('action="/stu/index.php"')) {
      return res.status(401).json({ success: false, message: 'เข้าสู่ระบบไม่สำเร็จ' });
    }

    // parse คะแนนสรุป
    const $m         = cheerio.load(mainHtml);
    const goodScore  = $m('span.text1').first().text().trim();
    const badScore   = $m('.text2').first().text().trim();
    const totalScore = $m('.text3').first().text().trim();

    // parse ชื่อนักเรียน
    let studentName = '';
    $m('td, span').each((_, el) => {
      const txt = $m(el).text().replace(/\s+/g, ' ').trim();
      if ((txt.includes('นาย') || txt.includes('นางสาว') || txt.includes('เด็กชาย') || txt.includes('เด็กหญิง'))
          && txt.length < 80) {
        studentName = txt;
        return false;
      }
    });

    // ── STEP 3: GET pub_stu.php (ต้องเข้า main ก่อนเสมอ!) ──────────
    const pubRes  = await fetch(`${BASE_URL}/stu/pub_stu.php`, {
      headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE_URL}/stu/main-stu.php` },
    });
    const pubHtml = await pubRes.text();
    console.log('[pub]  status:', pubRes.status, '| length:', pubHtml.length);
    console.log('[pub]  preview:', pubHtml.substring(0, 300).replace(/\s+/g, ' '));

    const $p = cheerio.load(pubHtml);

    // ดึง total จาก <h4>
    let goodTotal = '', badTotal = '';
    $p('h4').each((_, el) => {
      const txt = $p(el).text().replace(/\s+/g, ' ').trim();
      const m   = txt.match(/([+\-]?\d+)/);
      if (!m) return;
      if      (txt.includes('ความดี'))                          goodTotal = (m[1].startsWith('+') ? '' : '+') + m[1];
      else if (txt.includes('ตัดคะแนน') || txt.includes('พฤติกรรม')) badTotal = m[1];
    });

    // ดึงรายงานจาก table.three
    const tables  = $p('table.three');
    const goodRows = parseThreeTable($p, tables.eq(0));
    const badRows  = parseThreeTable($p, tables.eq(1));
    console.log('[pub]  tables.three:', tables.length, '| goodRows:', goodRows.length, '| badRows:', badRows.length);

    return res.json({
      success: true,
      student: studentName || null,
      scores:  { good: goodScore || '0', bad: badScore || '0', total: totalScore || '0' },
      report:  {
        good: { rows: goodRows, total: goodTotal },
        bad:  { rows: badRows,  total: badTotal  },
      },
    });

  } catch (err) {
    console.error('[error]', err.message);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅  Server running → http://localhost:${PORT}`));
