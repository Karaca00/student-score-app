const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const BASE_URL = 'http://www.kci.xn--12c1bpbba3dcfr1jra8c9bzgl.com';

// ---- API: Login + ดึงคะแนน ----
app.post('/api/scores', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก Username และ Password'
    });
  }

  try {
    // Step 1: POST Login
    const formData = new URLSearchParams();
    formData.append('user_stu', username);
    formData.append('pass_stu', password);
    formData.append('button2', 'เข้าสู่ระบบ');

    const loginRes = await fetch(`${BASE_URL}/stu/index.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${BASE_URL}/stu/index.php`,
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    // ดึง Cookie จาก Response
    const rawSetCookies = loginRes.headers.raw()['set-cookie'];
    if (!rawSetCookies || rawSetCookies.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Username / Password'
      });
    }

    const cookieHeader = rawSetCookies
      .map(c => c.split(';')[0])
      .join('; ');

    // Step 2: เข้าหน้า main-stu.php พร้อม Session Cookie
    const mainRes = await fetch(`${BASE_URL}/stu/main-stu.php`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${BASE_URL}/stu/index.php`,
      },
    });

    if (!mainRes.ok) {
      return res.status(500).json({
        success: false,
        message: `ไม่สามารถดึงข้อมูลได้ (HTTP ${mainRes.status})`
      });
    }

    const html = await mainRes.text();

    // ตรวจว่า redirect กลับไปหน้า login หรือเปล่า (Login ไม่สำเร็จ)
    if (html.includes('action="/stu/index.php"') || html.includes('เข้าสู่ระบบ') && html.includes('pass_stu')) {
      return res.status(401).json({
        success: false,
        message: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Username / Password'
      });
    }

    // Step 3: Parse HTML ด้วย Cheerio
    const $ = cheerio.load(html);

    const goodScore  = $('span.text1').first().text().trim();
    const badScore   = $('td.text2').first().text().trim() ||
                       $('.text2').first().text().trim();
    const totalScore = $('td.text3').first().text().trim() ||
                       $('.text3').first().text().trim();

    // ดึงชื่อนักเรียน (ถ้ามี)
    let studentName = '';
    // หลายระบบเก็บไว้ใน <td> หรือ text node ก่อน menu
    $('td').each((i, el) => {
      const txt = $(el).text().trim();
      if (txt.includes('นาย') || txt.includes('นางสาว') || txt.includes('เด็กชาย') || txt.includes('เด็กหญิง')) {
        if (txt.length < 100) {
          studentName = txt.replace(/\s+/g, ' ').trim();
          return false; // break
        }
      }
    });

    return res.json({
      success: true,
      student: studentName || null,
      scores: {
        good:  goodScore  || '+0',
        bad:   badScore   || '0',
        total: totalScore || '0',
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message
    });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  Server running → http://localhost:${PORT}`);
});
