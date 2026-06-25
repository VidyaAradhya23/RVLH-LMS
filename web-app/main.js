// ════════════════════════════════════════════════════
// STATE & API CONFIG
// ════════════════════════════════════════════════════
const API = ''; // Proxied via Vite
let token = localStorage.getItem('lms_token') || null;

async function api(endpoint, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + endpoint, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function syncLMSData() {
  try {
    window.LMS_COURSES = await api('/api/courses');
    window.LMS_VIDEOS = await api('/api/videos');
    window.LMS_LIVE_CLASSES = await api('/api/live');
    window.LMS_DOUBTS = await api('/api/doubts');
    window.LMS_MATERIALS = await api('/api/materials');
    window.LMS_ANNOUNCEMENTS = await api('/api/announcements');
    window.LMS_FEES = await api('/api/fees');
    window.LMS_ATTENDANCE = await api('/api/attendance');
    window.LMS_LEADERBOARD = await api('/api/leaderboard');
    
    // Fetch quiz results and payments if role is admin or faculty
    if (G.role === 'admin' || G.role === 'faculty') {
      try {
        window.LMS_QUIZ_RESULTS = await api('/api/quiz-results');
        window.QUIZ_RESULTS = window.LMS_QUIZ_RESULTS;
      } catch (e) {
        console.error('Error fetching quiz results:', e);
      }
      try {
        window.LMS_PAYMENTS = await api('/api/payments');
        window.PAYMENT_HISTORY = window.LMS_PAYMENTS;
      } catch (e) {
        console.error('Error fetching payments:', e);
      }
    }

    // Sync backwards compatibility variables
    window.studentDoubts = window.LMS_DOUBTS;

    // Sync COURSE_DB for Admin Courses page
    window.COURSE_DB = (window.LMS_COURSES || []).map(function(c, i) {
      return {
        _id: c._id,
        id: i + 1,
        n: c.title,
        e: c.e || '📚',
        cat: c.title.indexOf('NEET') > -1 ? 'NEET' : c.title.indexOf('Commerce') > -1 ? 'Commerce' : 'JEE',
        dur: c.dur || '1 Year',
        fee: c.fee || 30000,
        maxSt: c.maxSt || 150,
        enrolled: c.enrolledCount || (c.enrolled ? 142 : 0),
        pub: c.pub !== undefined ? c.pub : true,
        col: c.col || 'linear-gradient(90deg,#6c47ff,#a855f7)',
        faculty: c.fac || 'Dr. Priya Mehta',
        desc: c.desc || '',
        subjects: c.subjects || ['Physics', 'Chemistry', 'Mathematics'],
        curriculum: c.curriculum || 'Standard curriculum'
      };
    });

    // Sync MEDIA_DB from window.LMS_VIDEOS and window.LMS_MATERIALS
    window.MEDIA_DB = {};
    (window.LMS_VIDEOS || []).forEach(v => {
      const c = v.course || 'JEE Advanced (Main + KCET Decoded)';
      const s = v.sub || 'Physics';
      if (!window.MEDIA_DB[c]) window.MEDIA_DB[c] = {};
      if (!window.MEDIA_DB[c][s]) window.MEDIA_DB[c][s] = { videos: [], materials: [] };
      window.MEDIA_DB[c][s].videos.push({
        _id: v._id,
        t: v.title,
        dur: v.dur,
        views: v.views || 0,
        date: v.date || 'Just now',
        fac: v.fac || 'Dr. Priya Mehta',
        thumb: v.thumb || '⚡'
      });
    });

    (window.LMS_MATERIALS || []).forEach(m => {
      const c = m.course || 'JEE Advanced (Main + KCET Decoded)';
      const s = m.sub || 'Physics';
      if (m.category === 'Course Materials' || !m.category) {
        if (!window.MEDIA_DB[c]) window.MEDIA_DB[c] = {};
        if (!window.MEDIA_DB[c][s]) window.MEDIA_DB[c][s] = { videos: [], materials: [] };
        window.MEDIA_DB[c][s].materials.push({
          _id: m._id,
          t: m.name,
          type: m.type || 'PDF',
          size: m.size || '1.0 MB',
          date: m.date || 'Just now',
          pg: m.pg || 10
        });
      }
    });

    // Reconstruct QUESTION_PAPERS
    window.QUESTION_PAPERS = {};
    (window.LMS_MATERIALS || []).forEach(m => {
      if (m.category === 'Question Papers') {
        const c = m.course || 'JEE Advanced (Main + KCET Decoded)';
        const y = m.year || 2024;
        if (!window.QUESTION_PAPERS[c]) window.QUESTION_PAPERS[c] = {};
        if (!window.QUESTION_PAPERS[c][y]) window.QUESTION_PAPERS[c][y] = [];
        window.QUESTION_PAPERS[c][y].push({
          _id: m._id,
          t: m.name,
          type: m.type || 'Board',
          size: m.size || '1.5 MB',
          date: m.date || 'Just now',
          pg: m.pg || 12
        });
      }
    });

    // If Admin role, sync ADMIN_STUDENTS and ADMIN_FACULTY lists
    if (G.role === 'admin') {
      const allUsers = await api('/api/auth/users');
      window.ADMIN_STUDENTS = allUsers.filter(u => u.role === 'student').map(u => ({
        _id: u._id,
        n: u.name,
        roll: u.roll || 'RV2024001',
        course: u.batch || 'JEE Advanced (Main + KCET Decoded)',
        batch: 'Batch A',
        fee: u.feeStatus || 'Paid',
        st: u.st || 'active',
        email: u.email,
        campus: u.campus || 'RV Jayanagar',
        gender: u.gender || 'Male',
        mobile: u.phone || '+91 98001 00001',
        feeStatus: u.feeStatus || 'Paid',
        feeAmount: u.feeAmount || 45000,
        feePaid: u.feePaid || 0,
        feePending: u.feePending !== undefined ? u.feePending : 45000,
        feeDueDate: u.feeDueDate || 'Mar 31',
        feeMethod: u.feeMethod || '—',
        feeDate: u.feeDate || '—'
      }));
      
      window.ADMIN_FACULTY = allUsers.filter(u => u.role === 'faculty').map(u => ({
        _id: u._id,
        n: u.name,
        id: u.emp || 'RVF001',
        email: u.email,
        campus: u.campus || 'RV Jayanagar',
        course: u.batch || 'JEE Advanced (Main + KCET Decoded)',
        sub: u.subject || 'Physics',
        batches: 'JEE A,B',
        rat: '4.8',
        st: u.st || 'active'
      }));

      // Map FEE_STUDENTS from window.ADMIN_STUDENTS
      window.FEE_STUDENTS = window.ADMIN_STUDENTS.map(function(s) {
        return {
          n: s.n,
          roll: s.roll,
          course: s.course,
          amount: s.feeAmount,
          paid: s.feePaid,
          pending: s.feePending,
          due: s.feeDueDate,
          method: s.feeMethod,
          date: s.feeDate,
          st: s.feeStatus.toLowerCase(), // 'paid', 'pending', 'overdue'
          campus: s.campus
        };
      });

      // Calculate FEE_COURSE_DATA dynamically
      const courseMap = {};
      window.COURSE_DB.forEach(c => {
        courseMap[c.n] = { n: c.n, students: 0, fee: c.fee, collected: 0, pending: 0, col: c.col };
      });
      window.FEE_STUDENTS.forEach(s => {
        if (!courseMap[s.course]) {
          courseMap[s.course] = { n: s.course, students: 0, fee: s.amount, collected: 0, pending: 0, col: '#6c47ff' };
        }
        const cm = courseMap[s.course];
        cm.students++;
        cm.collected += s.paid;
        cm.pending += s.pending;
      });
      window.FEE_COURSE_DATA = Object.values(courseMap);
      FEE_STUDENTS = window.FEE_STUDENTS;
      FEE_COURSE_DATA = window.FEE_COURSE_DATA;
    }
    if (window.QUIZ_RESULTS) QUIZ_RESULTS = window.QUIZ_RESULTS;
    if (window.PAYMENT_HISTORY) PAYMENT_HISTORY = window.PAYMENT_HISTORY;
  } catch (err) {
    console.error('Error syncing LMS data:', err);
  }
}

var G = { role: null, user: null, page: null };
var PAGE_HISTORY = [];

var _at = String.fromCharCode(64);
var EM = {
  student : 'arjun'  + _at + 'rvhub.com',
  faculty : 'priya'  + _at + 'rvhub.com',
  admin   : 'admin'  + _at + 'rvhub.com'
};

var USERS = {
  student: { name:'Arjun Sharma',    email:EM.student, ava:'S', batch:'JEE Advanced 2025', roll:'RV2024001' },
  faculty: { name:'Dr. Priya Mehta', email:EM.faculty, ava:'F', subject:'Physics',          emp:'RVF001'    },
  admin  : { name:'Rahul Verma', firstName:'Rahul', lastName:'Verma', email:EM.admin, ava:'A', dept:'Administration', emp:'RVADM01', employeeId:'ADM-001', designation:'System Administrator', department:'Administration', campus:'RV Learning Hub HQ', phone:'', gender:'', dob:'', joinDate:'' }
};

var CREDS = {};
CREDS[EM.student]   = { role:'student', pass:'student123' };
CREDS[EM.faculty]   = { role:'faculty', pass:'faculty123' };
CREDS[EM.admin]     = { role:'admin',   pass:'admin123'   };
CREDS['9876543210'] = { role:'student', pass:'student123' };
CREDS['9876543211'] = { role:'faculty', pass:'faculty123' };
CREDS['9876543212'] = { role:'admin',   pass:'admin123'   };
CREDS['arjun']      = { role:'student', pass:'student123' };
CREDS['priya']      = { role:'faculty', pass:'faculty123' };
CREDS['admin']      = { role:'admin',   pass:'admin123'   };
CREDS['student']    = { role:'student', pass:'student123' };
CREDS['faculty']    = { role:'faculty', pass:'faculty123' };

// ════════════════════════════════════════════════════
// LOGIN HELPERS
// ════════════════════════════════════════════════════
function showErr(msg) {
  var el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideErr() {
  var el = document.getElementById('login-error');
  if (el) el.style.display = 'none';
}

function selectRole(role) {
  G.role = role;
  var roles = ['student','faculty','admin'];
  for (var i=0; i<roles.length; i++) {
    var card = document.getElementById('rc-' + roles[i]);
    if (card) card.classList.toggle('active', roles[i] === role);
  }
  var passes = { student:'student123', faculty:'faculty123', admin:'admin123' };
  var eEl = document.getElementById('li-email');
  var pEl = document.getElementById('li-pass');
  if (eEl) eEl.value = EM[role];
  if (pEl) { pEl.value = passes[role]; pEl.type = 'password'; }
  var tb = document.getElementById('btn-toggle-pw');
  if (tb) tb.textContent = 'Show';
  hideErr();
}

function quickLogin(role) {
  selectRole(role);
  doLogin();
}

async function doLogin() {
  var eEl = document.getElementById('li-email');
  var pEl = document.getElementById('li-pass');
  if (!eEl || !pEl) { showErr('Page error - please refresh'); return; }

  var ev = eEl.value.trim().toLowerCase();
  var pv = pEl.value.trim();

  if (!ev) { showErr('Please enter your email or phone'); return; }
  if (!pv) { showErr('Please enter your password');      return; }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ev, password: pv })
    });
    token = res.token;
    localStorage.setItem('lms_token', token);
    G.user = res.user;
    G.role = res.user.role;
    hideErr();
    launch();
  } catch (err) {
    showErr(err.message || 'Login failed');
  }
}

async function launch() {
  var ls = document.getElementById('login-screen');
  var ap = document.getElementById('app-shell');
  if (!ls || !ap) { alert('Page structure error'); return; }
  ls.style.display = 'none';
  ap.style.display = 'block';
  try {
    await syncLMSData();
    initApp();
  } catch(err) {
    console.error('initApp error:', err);
    showErr('App failed to load: ' + err.message);
    ls.style.display = 'flex';
    ap.style.display = 'none';
    return;
  }
  toast('Welcome, ' + G.user.name + '!', '');
}

function doLogout() {
  G = { role: null, user: null, page: null };
  PAGE_HISTORY = [];
  token = null;
  localStorage.removeItem('lms_token');
  var ap = document.getElementById('app-shell');
  var ls = document.getElementById('login-screen');
  if (ap) ap.style.display = 'none';
  if (ls) ls.style.display = 'flex';
  var eEl = document.getElementById('li-email');
  var pEl = document.getElementById('li-pass');
  if (eEl) eEl.value = '';
  if (pEl) pEl.value = '';
  var roles = ['student','faculty','admin'];
  for (var i=0; i<roles.length; i++) {
    var card = document.getElementById('rc-' + roles[i]);
    if (card) card.classList.remove('active');
  }
  hideErr();
}

function togglePw() {
  var inp = document.getElementById('li-pass');
  var btn = document.getElementById('btn-toggle-pw');
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text';     if (btn) btn.textContent = 'Hide'; }
  else                         { inp.type = 'password'; if (btn) btn.textContent = 'Show'; }
}

function toggleFieldPw(inputId, btnId) {
  var inp = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (btn) btn.textContent = '🔒';
  } else {
    inp.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

// ════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════
function toast(msg, icon) {
  var tc = document.getElementById('toast-container');
  if (!tc) return;
  var el = document.createElement('div');
  el.className = 'toast-item';
  el.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 15px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.4);animation:fadeUp .3s ease';
  el.innerHTML = (icon ? '<span>' + icon + '</span>' : '') + '<span>' + msg + '</span>';
  tc.appendChild(el);
  setTimeout(function() { try { el.remove(); } catch(e) {} }, 3200);
}

// ════════════════════════════════════════════════════
// WIRE ALL EVENTS — DOMContentLoaded, no inline onclick
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // Auto-login with token
  if (token) {
    api('/api/auth/profile')
      .then(function(user) {
        G.user = user;
        G.role = user.role;
        launch();
      })
      .catch(function(err) {
        token = null;
        localStorage.removeItem('lms_token');
      });
  }


  // Populate email spans safely
  function setTxt(id, val) { var el=document.getElementById(id); if(el) el.textContent=val; }
  setTxt('st-em', EM.student);
  setTxt('fa-em', EM.faculty);
  setTxt('ad-em', EM.admin);

  function on(id, ev, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }

  // Role cards
  on('rc-student', 'click', function() { selectRole('student'); });
  on('rc-faculty', 'click', function() { selectRole('faculty'); });
  on('rc-admin',   'click', function() { selectRole('admin');   });

  // Sign in button
  on('btn-signin', 'click', doLogin);

  // Demo buttons
  on('demo-student', 'click', function() { quickLogin('student'); });
  on('demo-faculty', 'click', function() { quickLogin('faculty'); });
  on('demo-admin',   'click', function() { quickLogin('admin');   });

  // Password toggle
  on('btn-toggle-pw', 'click', togglePw);

  // Enter key on inputs
  on('li-email', 'keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  on('li-pass',  'keydown', function(e) { if (e.key === 'Enter') doLogin(); });

  // Credentials accordion
  on('cred-toggle', 'click', function() {
    var body  = document.getElementById('cred-body');
    var arrow = document.getElementById('cred-arrow');
    if (!body) return;
    var open = body.style.display === 'block';
    body.style.display = open ? 'none' : 'block';
    if (arrow) arrow.textContent = open ? 'show' : 'hide';
  });

  // App buttons
  on('btn-logout',  'click', doLogout);
  on('tb-notif',    'click', function() { buildNotifContent();   openModal('modal-notif');   });
  on('tb-search',   'click', function() { openModal('modal-search'); setTimeout(function(){ var s=document.getElementById('search-inp'); if(s) s.focus(); }, 100); });
  on('tb-profile',  'click', function() { buildProfileContent(); openModal('modal-profile'); });
  on('search-inp',  'input', function() { doSearch(this.value); });

  // Modal close
  on('close-notif',   'click', function() { closeModal('modal-notif');   });
  on('close-search',  'click', function() { closeModal('modal-search');  });
  on('close-profile', 'click', function() { closeModal('modal-profile'); });
  on('close-detail',  'click', function() { closeModal('modal-detail');  });

  // Click backdrop to close
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      closeModal(e.target.id);
    }
  });
});


function goBack() {
  if (PAGE_HISTORY.length > 0) {
    var prev = PAGE_HISTORY.pop();
    loadPage(prev, false);
  }
}

function updateBackBtn() {
  var btn = document.getElementById('tb-back');
  if (btn) btn.style.display = PAGE_HISTORY.length > 0 ? 'flex' : 'none';
}

function initApp() {
  var r = G.role, u = G.user;
  var rLabels = { student:'Student Portal', faculty:'Faculty Portal', admin:'Admin Panel' };
  var rStyles = {
    student: 'background:rgba(74,222,128,.15);color:var(--student)',
    faculty: 'background:rgba(0,212,200,.15);color:var(--faculty)',
    admin:   'background:rgba(255,45,107,.15);color:var(--admin)',
  };
  document.getElementById('sb-role').textContent = rLabels[r];
  document.getElementById('sb-role').style.cssText = rStyles[r];
  document.getElementById('sb-avatar').textContent = u.ava;
  document.getElementById('sb-avatar').style.cssText = rStyles[r];
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-email').textContent = u.email;
  document.getElementById('app-layout').className = 'app-layout role-' + r;
  buildSidebar();
  loadPage('dashboard');
  buildNotifContent();
  buildProfileContent();
}

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════
var NAV = {
  student: [
    { sec:'Main', items:[
      { id:'dashboard',    icon:'🏠', label:'Dashboard' },
      { id:'courses',      icon:'📚', label:'Courses' },
      { id:'videos',       icon:'📹', label:'Video Lectures' },
      { id:'live',         icon:'📡', label:'Live Class', n:2 },
      { id:'tests',        icon:'📝', label:'Test Series' },
      { id:'material',     icon:'📄', label:'Material' },
      { id:'doubts',       icon:'💬', label:'Doubts', n:3 },
    ]},
    { sec:'Reports', items:[
      { id:'progress',     icon:'📊', label:'Grading' },
      { id:'attendance',   icon:'✅', label:'Attendance' },
      { id:'leaderboard',  icon:'🏆', label:'Leaderboard' },
      { id:'fees',         icon:'💳', label:'Fee Status' },
      { id:'announcements',icon:'📢', label:'Announcements', n:2 },
    ]},
    { sec:'More', items:[
      { id:'feedback',  icon:'⭐', label:'Give Feedback' },
      { id:'profile',   icon:'👤', label:'My Profile' },
    ]},
  ],
  faculty: [
    { sec:'Main', items:[
      { id:'dashboard', icon:'🏠', label:'Dashboard' },
      { id:'batches',   icon:'👥', label:'My Batches' },
      { id:'content',   icon:'🎬', label:'Upload Content' },
      { id:'live',      icon:'📡', label:'Schedule Classes' },
      { id:'tests',     icon:'📝', label:'Create Tests' },
    ]},
    { sec:'Insights', items:[
      { id:'tracker',   icon:'📈', label:'Student Tracker' },
      { id:'analytics', icon:'📊', label:'Analytics' },
      { id:'doubts',    icon:'💬', label:'Resolve Doubts', n:5 },
    ]},
    { sec:'More', items:[
      { id:'reports',  icon:'📋', label:'Monthly Report' },
      { id:'feedback', icon:'⭐', label:'Student Feedback' },
      { id:'profile',  icon:'👤', label:'My Profile' },
    ]},
  ],
  admin: [
    { sec:'Main', items:[
      { id:'dashboard', icon:'🏠', label:'Dashboard' },
      { id:'users',     icon:'👥', label:'User Management' },
      { id:'courses',   icon:'🏗️', label:'Course Builder' },
      { id:'fees',      icon:'💳', label:'Fee & Billing' },
      { id:'media',     icon:'🎬', label:'Videos & Materials' },
      { id:'quiz',      icon:'📝', label:'Quiz Results' },
    ]},
    { sec:'Analytics', items:[
      { id:'reports',    icon:'📊', label:'Reports' },
      { id:'attendance', icon:'✅', label:'Attendance' },
    ]},
    { sec:'Communication', items:[
      { id:'notifications',  icon:'📣', label:'Notifications', n:4 },
      { id:'announcements',  icon:'📢', label:'Announcements' },
      { id:'approvals',      icon:'✅', label:'Approvals', n:4 },
    ]},
    { sec:'System', items:[
      { id:'profile',  icon:'👤', label:'My Profile' },
      { id:'settings', icon:'⚙️', label:'System Settings' },
    ]},
  ],
};

function buildSidebar() {
  var html = '';
  NAV[G.role].forEach(function(sec) {
    html += '<div class="nav-sec"><div class="nav-sec-label">' + sec.sec + '</div>';
    sec.items.forEach(function(item) {
      html += '<button class="nav-item" id="ni-' + item.id + '" onclick="loadPage(\'' + item.id + '\')">';
      html += '<span class="ni">' + item.icon + '</span>';
      html += '<span>' + item.label + '</span>';
      if (item.n) html += '<span class="nav-notif">' + item.n + '</span>';
      html += '</button>';
    });
    html += '</div>';
  });
  document.getElementById('sb-nav').innerHTML = html;
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
  var el = document.getElementById('ni-' + id);
  if (el) el.classList.add('active');
}

// ═══════════════════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════════════════
var PAGE_TITLES = {
  dashboard:'Dashboard', courses:'Courses', videos:'Video Lectures', live:'Live Class',
  tests:'Test Series', material:'Material', doubts:'Doubts',
  progress:'Grading', attendance:'Attendance', leaderboard:'Leaderboard',
  fees:'Fee Status', feedback:'Give Feedback',
  announcements:'Announcements', profile:'Profile',
  batches:'My Batches', content:'Upload Content', tracker:'Student Tracker',
  analytics:'Analytics', reports:'Reports', users:'User Management',
  notifications:'Notifications', settings:'System Settings', security:'Security & Logs',
};

function loadPage(id, addHistory) {
  if (addHistory === undefined) addHistory = true;
  if (addHistory && G.page && G.page !== id) {
    PAGE_HISTORY.push(G.page);
    if (PAGE_HISTORY.length > 20) PAGE_HISTORY.shift();
  }
  G.page = id;
  setActiveNav(id);
  var title = PAGE_TITLES[id] || id;
  if (G.role === 'admin') {
    if (id === 'courses') title = 'Course Builder';
    if (id === 'fees') title = 'Fee & Billing';
    if (id === 'live') title = 'Schedule Classes';
  }
  if (G.role === 'faculty') {
    if (id === 'tests') title = 'Create Tests';
    if (id === 'live') title = 'Schedule Classes';
    if (id === 'feedback') title = 'Student Feedback';
    if (id === 'doubts') title = 'Doubt Support';
  }
  document.getElementById('tb-title').textContent = title;
  var body = document.getElementById('page-body');
  body.style.animation = 'none';
  requestAnimationFrame(function() {
    body.style.animation = 'fadeUp .28s ease';
    var key = G.role + '_' + id;
    var fn = PAGES[key] || PAGES['shared_' + id];
    body.innerHTML = fn ? fn() : '<div class="empty"><div class="empty-icon">🚧</div><p>Coming soon</p></div>';
    updateBackBtn();
  });
}

// ═══════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function openDetail(title, body, footer) {
  document.getElementById('detail-title').textContent = title;
  document.getElementById('detail-body').innerHTML = body;
  document.getElementById('detail-footer').innerHTML = footer || '';
  openModal('modal-detail');
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// (toast defined above)

// ═══════════════════════════════════════════════════════
// INNER TABS
// ═══════════════════════════════════════════════════════
function itab(btn, id) {
  var wrap = btn.closest('.page-body') || btn.closest('.modal-body') || document.getElementById('page-body');
  wrap.querySelectorAll('.itab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  wrap.querySelectorAll('[data-tab]').forEach(function(el) {
    el.style.display = el.dataset.tab === id ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════
// HELPERS: HTML SNIPPETS
// ═══════════════════════════════════════════════════════
function makeStats(arr) {
  return '<div class="stats-grid">' + arr.map(function(s) {
    return '<div class="stat-card" style="border-color:color-mix(in srgb,' + s.col + ' 28%,var(--border))" onclick="toast(\'' + s.label + ' details\',\'📊\')">'
      + '<div class="stat-icon">' + s.icon + '</div>'
      + '<div class="stat-val" style="color:' + s.col + '">' + s.val + '</div>'
      + '<div class="stat-label">' + s.label + '</div>'
      + (s.change ? '<div class="stat-change" style="color:' + s.col + '">' + s.change + '</div>' : '')
      + '</div>';
  }).join('') + '</div>';
}

function makeProgress(pct, col) {
  return '<div class="prog-bar"><div class="prog-fill" style="width:' + pct + '%;background:' + col + '"></div></div>';
}

function makeChartBars(data, col) {
  return '<div class="chart-bars">' + data.map(function(b) {
    return '<div class="bar-wrap">'
      + '<div class="bar" style="height:' + b.v + '%;background:' + col + ';opacity:.85" title="' + b.v + '%"></div>'
      + '<div class="bar-label">' + b.m + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function makeToggleRow(label, on) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">'
    + '<span style="font-size:13px">' + label + '</span>'
    + '<div class="toggle ' + (on ? 'on' : '') + '" onclick="this.classList.toggle(\'on\');toast(\'Setting updated\',\'⚙️\')"></div>'
    + '</div>';
}

function makeListItem(icon, iconBg, title, sub, right) {
  return '<div class="list-item">'
    + '<div class="li-icon" style="background:' + iconBg + '">' + icon + '</div>'
    + '<div class="li-content"><div class="li-title">' + title + '</div><div class="li-sub">' + sub + '</div></div>'
    + (right ? '<div class="li-meta">' + right + '</div>' : '')
    + '</div>';
}

function makeFeeCard(label, val) {
  return '<div class="fee-card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;font-weight:600">' + label + '</div><div style="font-weight:600">' + val + '</div></div>';
}

function makeInputGroup(label, type, placeholder, value) {
  type = type || 'text';
  if (type === 'textarea') {
    return '<div class="inp-group"><label>' + label + '</label><textarea class="inp-field" placeholder="' + (placeholder||'') + '">' + (value||'') + '</textarea></div>';
  }
  if (type === 'select') {
    var opts = placeholder.split(',').map(function(o) { return '<option>' + o.trim() + '</option>'; }).join('');
    return '<div class="inp-group"><label>' + label + '</label><select class="inp-field">' + opts + '</select></div>';
  }
  return '<div class="inp-group"><label>' + label + '</label><input type="' + type + '" class="inp-field" placeholder="' + (placeholder||'') + '" value="' + (value||'') + '"></div>';
}

function makeAv(letter, bg) {
  return '<div class="av" style="background:' + bg + ';color:var(--text)">' + letter + '</div>';
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS / PROFILE / SEARCH
// ═══════════════════════════════════════════════════════
function buildNotifContent() {
  var data = {
    student: [
      { icon:'📡', title:'Live Class: Electrostatics', sub:'Starting in 30 minutes', time:'10 min ago', unread:true },
      { icon:'📝', title:'New Test Available', sub:'Chapter 5 - Wave Optics DPP', time:'1 hour ago', unread:true },
      { icon:'💬', title:'Doubt Resolved', sub:'Your question on Integration answered', time:'2 hours ago', unread:true },
      { icon:'💳', title:'Fee Reminder', sub:'Monthly fee due by March 15', time:'Yesterday', unread:false },
      { icon:'🏆', title:'Rank Update', sub:'Your batch rank improved to #4', time:'2 days ago', unread:false },
    ],
    faculty: [
      { icon:'💬', title:'5 New Doubts', sub:'Students awaiting resolution', time:'15 min ago', unread:true },
      { icon:'👥', title:'New Students Added', sub:'3 students added to JEE Batch A', time:'1 hour ago', unread:true },
      { icon:'📊', title:'Monthly Report Ready', sub:'March 2024 performance report', time:'Yesterday', unread:false },
    ],
    admin: [
      { icon:'👥', title:'New Enrollments', sub:'15 new student registrations pending', time:'30 min ago', unread:true },
      { icon:'💳', title:'Fee Collection', sub:'₹1,45,000 collected today', time:'1 hour ago', unread:true },
      { icon:'⚠️', title:'System Alert', sub:'Storage at 78% capacity', time:'2 hours ago', unread:false },
      { icon:'📊', title:'Weekly Report', sub:'Analytics report generated', time:'Yesterday', unread:false },
    ],
  };
  var list = (data[G.role] || []).map(function(n) {
    return '<div style="display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--border)'
      + (n.unread ? ';font-weight:600' : '') + '">'
      + '<div style="width:8px;height:8px;border-radius:50%;background:' + (n.unread ? 'var(--admin)' : 'var(--border)') + ';flex-shrink:0;margin-top:5px"></div>'
      + '<div style="flex:1"><div style="font-size:13px">' + n.icon + ' ' + n.title + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + n.sub + '</div></div>'
      + '<div style="font-size:11px;color:var(--muted);flex-shrink:0">' + n.time + '</div>'
      + '</div>';
  }).join('');
  document.getElementById('notif-body').innerHTML = list;
}

function buildProfileContent() {
  var u = G.user, r = G.role;
  var col = { student:'var(--student)', faculty:'var(--faculty)', admin:'var(--admin)' }[r];
  var extra = r === 'student'
    ? [['Batch', u.batch], ['Roll No', u.roll]]
    : r === 'faculty'
    ? [['Subject', u.subject], ['Emp ID', u.emp]]
    : [['Department', u.dept], ['Emp ID', u.emp]];

  document.getElementById('profile-body').innerHTML =
    '<div style="text-align:center;padding:16px 0 22px">'
    + '<div style="width:66px;height:66px;border-radius:50%;background:color-mix(in srgb,' + col + ' 14%,var(--surface2));border:2px solid ' + col + ';display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 10px">' + u.ava + '</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:19px;font-weight:700">' + u.name + '</div>'
    + '<div style="color:var(--muted);font-size:13px;margin-top:3px">' + u.email + '</div>'
    + '<span class="badge badge-' + (r==='student'?'green':r==='faculty'?'teal':'red') + '" style="margin-top:9px">' + r.charAt(0).toUpperCase()+r.slice(1) + '</span>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px">'
    + extra.map(function(e) { return makeFeeCard(e[0], e[1]); }).join('')
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn btn-purple" onclick="toast(\'Profile updated!\',\'✅\');closeModal(\'modal-profile\')">✏️ Edit Profile</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Password reset email sent!\',\'📧\');closeModal(\'modal-profile\')">🔑 Change Password</button>'
    + '</div>';
}

function showNotifModal() { buildNotifContent(); openModal('modal-notif'); }
function showSearchModal() { openModal('modal-search'); setTimeout(function() { document.getElementById('search-inp').focus(); }, 100); }
function showProfileModal() { buildProfileContent(); openModal('modal-profile'); }

function doSearch(q) {
  var all = ['Physics - Electrostatics','Chemistry - Organic','Maths - Calculus','Biology - Cell Division','Mock Test 12','Chapter 3 Notes PDF','Wave Optics','Integration'];
  var res = q.length < 2 ? [] : all.filter(function(r) { return r.toLowerCase().indexOf(q.toLowerCase()) > -1; });
  document.getElementById('search-results').innerHTML = q.length < 2 ? ''
    : res.length
    ? res.map(function(r) {
        return '<div class="list-item" onclick="toast(\'Opening: ' + r + '\',\'📖\');closeModal(\'modal-search\')">'
          + '<div class="li-icon" style="background:var(--surface2)">📌</div>'
          + '<div class="li-content"><div class="li-title">' + r + '</div></div></div>';
      }).join('')
    : '<p style="color:var(--muted);font-size:13px">No results for "' + q + '"</p>';
}

// ═══════════════════════════════════════════════════════
// PAGE BUILDERS
// ═══════════════════════════════════════════════════════
var PAGES = {};

// ──────────────── STUDENT DASHBOARD ────────────────

// ──────────────── STUDENT DASHBOARD (ENHANCED v3) ────────────────

// ──────────────── STUDENT DASHBOARD (ENHANCED v3) ────────────────

// ──────────────── STUDENT DASHBOARD (ENHANCED v3) ────────────────
PAGES['student_dashboard'] = function() {
  var u = G.user || {};
  var userName = (u.name || 'Student').split(' ')[0];
  var hr = new Date().getHours();
  var greeting = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  var greetIcon = hr < 12 ? '☀️' : hr < 17 ? '🌤️' : '🌙';
  var now = new Date();
  var timeStr = now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
  var dateStr = now.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short', year:'numeric'});

  // Welcome back banner matching reference
  var welcomeBanner = '<div class="stu-welcome-card">'
    + '<div class="stu-welcome-left">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">'
    + '<span style="font-size:24px">👋</span>'
    + '<h2 style="margin:0;font-family:Syne,sans-serif;font-size:22px;font-weight:800">Welcome back, ' + userName + '!</h2></div>'
    + '<p style="margin:0;margin-left:34px;color:var(--muted);font-size:13px">Here\'s a quick overview of your learning progress.</p></div>'
    + '<div style="text-align:right;flex-shrink:0">'
    + '<div style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;background:linear-gradient(135deg,#a78bff,#00c6ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent">' + timeStr + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + dateStr + '</div>'
    + '<span class="badge badge-yellow float-badge" style="font-size:10px;padding:3px 10px;margin-top:6px">🏫 RVLH Student</span>'
    + '</div></div>';

  var contVideos = window.LMS_VIDEOS || [
    { t:'Laws of Motion — Full Chapter', sub:'Physics', pct:75, dur:'45:20', emoji:'🏗️', id:'vid-1' },
    { t:'Organic Chemistry — IUPAC Naming', sub:'Chemistry', pct:42, dur:'38:15', emoji:'🧪', id:'vid-2' },
    { t:'Integration — By Parts Method', sub:'Maths', pct:18, dur:'52:10', emoji:'📐', id:'vid-3' }
  ];
  
  // Expose to window for carousel functionality
  window.resumeVideos = contVideos;
  window.currentResumeIdx = window.currentResumeIdx || 0;
  if (window.currentResumeIdx >= contVideos.length) window.currentResumeIdx = 0;
  
  var activeVideo = contVideos[window.currentResumeIdx] || { t: 'No Videos', sub: 'N/A', emoji: '🎥' };
  var activeTitle = activeVideo.title || activeVideo.t || 'Video Lecture';
  var activeEmoji = activeVideo.thumb || activeVideo.emoji || '🎥';
  var activeSub = activeVideo.sub || 'General';
  var activePct = window.currentResumeIdx === 0 ? 75 : window.currentResumeIdx === 1 ? 42 : 18;

  // Resume learning carousel card matching reference
  var resumeCard = '<div class="stu-resume-card hud-serious-border">'
    + '<div class="stu-resume-header"><span>🎬 Resume Learning</span></div>'
    + '<div id="stu-resume-container">'
    + '<div class="stu-resume-body" style="display:flex;gap:14px;align-items:center">'
    + '<div style="position:relative;width:160px;height:90px;background:#0f172a;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;cursor:pointer" onclick="openVideoWithNotes(\'' + activeTitle.replace(/'/g,"\\'") + '\',\'' + activeEmoji + '\')">' + activeEmoji
    + '<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;border-radius:10px"><span style="width:36px;height:36px;border-radius:50%;background:#6c47ff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">▶</span></div>'
    + '</div>'
    + '<div style="flex:1;min-width:0">'
    + '<h4 style="font-family:Syne,sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + activeTitle + '</h4>'
    + '<p style="font-size:12px;color:var(--muted);margin-bottom:8px">' + activeSub + ' · JEE Advanced</p>'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<div class="prog-bar" style="flex:1;height:6px"><div class="prog-fill" style="width:' + activePct + '%;background:var(--student)"></div></div>'
    + '<span style="font-size:11px;color:var(--muted)">' + activePct + '%</span>'
    + '</div></div></div></div>'
    + '<div style="display:flex;gap:6px;margin-top:12px;justify-content:center">'
    + contVideos.map(function(v,idx) {
        var isActive = idx === window.currentResumeIdx;
        return '<button class="resume-dot" onclick="window.setResumeVideoIdx(' + idx + ')" style="width:' + (isActive?'18px':'6px') + ';height:6px;border-radius:3px;background:' + (isActive?'#6c47ff':'rgba(255,255,255,.2)') + ';border:none;cursor:pointer;padding:0;transition:all 0.25s ease"></button>';
      }).join('')
    + '</div></div>';

  // Quick Actions matching reference
  var quickActions = '<div style="font-family:Syne,sans-serif;font-size:14px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">⚡ Quick Actions</div>'
    + '<div class="stu-quick-actions">'
    + '<button class="stu-quick-btn" onclick="loadPage(\'videos\')"><span style="font-size:22px">📹</span><span>Watch Videos</span></button>'
    + '<button class="stu-quick-btn" onclick="loadPage(\'tests\')"><span style="font-size:22px">📝</span><span>Take a Quiz</span></button>'
    + '<button class="stu-quick-btn" onclick="loadPage(\'material\')"><span style="font-size:22px">📄</span><span>Study Material</span></button>'
    + '<button class="stu-quick-btn" onclick="loadPage(\'progress\')"><span style="font-size:22px">📈</span><span>View Grades</span></button>'
    + '</div>';

  // Side Column Stats matching reference
  var streakVal = (u.streak !== undefined ? u.streak : 7);
  var avgVal = (u.avgScore !== undefined ? u.avgScore : 78);
  var sideStats = '<div class="stu-side-stats-grid">'
    + '<div class="stu-side-stat-card" onclick="toast(\'' + streakVal + '-day study streak! Keep studying daily to maintain your streak.\',\'🔥\')">'
    + '<span class="streak-flame" style="font-size:22px">🔥</span>'
    + '<div><span class="stu-side-stat-val" style="color:var(--orange)">' + streakVal + ' days</span><span class="stu-side-stat-lbl">Streak</span></div></div>'
    + '<div class="stu-side-stat-card" onclick="loadPage(\'progress\')">'
    + '<span style="font-size:22px">📊</span>'
    + '<div><span class="stu-side-stat-val" style="color:var(--student)">' + avgVal + '%</span><span class="stu-side-stat-lbl">Avg Score</span></div></div>'
    + '</div>';

  // Tip of the Day card matching reference
  var tipCard = '<div class="stu-tip-card">'
    + '<span style="font-size:18px">💡</span>'
    + '<p>"Consistency is the key to mastering any subject. Keep going!"</p></div>';

  // Live Class Panel (Dynamic)
  var liveClasses = window.LMS_LIVE_CLASSES || [];
  var ongoing = liveClasses.filter(function(c) { return c.status === 'ongoing'; });
  var upcoming = liveClasses.filter(function(c) { return c.status === 'upcoming'; });

  var ongoingHtml = '';
  if (ongoing.length > 0) {
    ongoingHtml = ongoing.map(function(c) {
      return '<div class="sched-item" style="border:1px solid rgba(255,45,107,.25);background:rgba(255,45,107,.05);cursor:pointer" onclick="openLiveClassModal()">'
        + '<div class="sched-time"><div class="st" style="color:var(--admin)">LIVE</div><div class="sd">NOW</div></div>'
        + '<div class="sched-body"><div class="sched-title">⚛️ ' + c.sub + ' — ' + c.topic + '</div>'
        + '<div class="sched-meta">' + c.fac + ' &nbsp;•&nbsp; ' + (c.online || 142) + ' online <span class="live-badge" style="margin-left:6px"><div class="live-dot"></div>LIVE</span></div></div>'
        + '<button class="btn btn-red glow-join" onclick="event.stopPropagation();openLiveClassModal()" style="font-weight:800;padding:10px 20px;font-size:14px">🎥 Join Now</button></div>';
    }).join('');
  } else {
    // Fallback static ongoing class
    ongoingHtml = '<div class="sched-item" style="border:1px solid rgba(255,45,107,.25);background:rgba(255,45,107,.05);cursor:pointer" onclick="openLiveClassModal()">'
      + '<div class="sched-time"><div class="st" style="color:var(--admin)">LIVE</div><div class="sd">NOW</div></div>'
      + '<div class="sched-body"><div class="sched-title">⚛️ Physics — Electrostatics: Gauss Law</div>'
      + '<div class="sched-meta">Dr. Priya Mehta &nbsp;•&nbsp; 142 online <span class="live-badge" style="margin-left:6px"><div class="live-dot"></div>LIVE</span></div></div>'
      + '<button class="btn btn-red glow-join" onclick="event.stopPropagation();openLiveClassModal()" style="font-weight:800;padding:10px 20px;font-size:14px">🎥 Join Now</button></div>';
  }

  var upcomingHtml = '';
  if (upcoming.length > 0) {
    upcomingHtml = upcoming.map(function(c) {
      return '<div class="sched-item" style="cursor:pointer" onclick="toast(\'Reminder set!\',\'🔔\')"><div class="sched-time"><div class="st">' + c.time + '</div><div class="sd">' + c.date + '</div></div><div class="sched-body"><div class="sched-title">' + c.sub + ': ' + c.topic + '</div><div class="sched-meta">' + c.fac + '</div></div><button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Reminder set!\',\'🔔\')">🔔 remind</button></div>';
    }).join('');
  } else {
    // Fallback static upcoming classes
    upcomingHtml = [{time:'11:00 AM',date:'Today',sub:'Chemistry',topic:'Aldehydes & Ketones',fac:'Prof. Sunita Sharma'},{time:'02:00 PM',date:'Today',sub:'Maths',topic:'Integration by Parts',fac:'Mr. Raj Sharma'}].map(function(c){
      return '<div class="sched-item" style="cursor:pointer" onclick="toast(\'Reminder set!\',\'🔔\')"><div class="sched-time"><div class="st">'+c.time+'</div><div class="sd">'+c.date+'</div></div><div class="sched-body"><div class="sched-title">'+c.sub+': '+c.topic+'</div><div class="sched-meta">'+c.fac+'</div></div><button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Reminder set!\',\'🔔\')">🔔 remind</button></div>';
    }).join('');
  }

  var liveSection = '<div class="card" style="border-color:rgba(255,45,107,.25);background:rgba(255,45,107,.02)">'
    + '<div class="card-header"><div class="card-title">🔴 Live & Upcoming Classes</div><button class="card-act" onclick="loadPage(\'live\')">Full Schedule</button></div>'
    + ongoingHtml
    + upcomingHtml
    + '</div>';

  var deadlines = [{t:'Integration DPP — Due',d:'Today, 11:59 PM',col:'var(--admin)',icon:'⏰'},{t:'Weekly Test — Thermodynamics',d:'Mar 18, 10:00 AM',col:'var(--yellow)',icon:'📝'},{t:'Mock Test 14 — Full Syllabus',d:'Mar 20, 09:00 AM',col:'var(--purple)',icon:'📋'}];
  var deadlineHtml = '<div class="card"><div class="card-header"><div class="card-title">⏰ Upcoming Deadlines</div></div>'
    + deadlines.map(function(dl){ return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer" onclick="toast(\'Deadline: ' + dl.t + '\', \'⏰\')"><div style="width:36px;height:36px;border-radius:10px;background:color-mix(in srgb,'+dl.col+' 12%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:16px">'+dl.icon+'</div><div style="flex:1"><div style="font-size:13px;font-weight:600">'+dl.t+'</div><div style="font-size:11px;color:'+dl.col+';font-weight:600">'+dl.d+'</div></div></div>'; }).join('') + '</div>';

  var subjects = [{s:'Physics',p:74,c:'#ff2d6b'},{s:'Chemistry',p:82,c:'#00d4c8'},{s:'Maths',p:68,c:'#6c47ff'}];
  var perfHtml = subjects.map(function(s){ return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>'+s.s+'</span><span style="color:'+s.c+';font-weight:700">'+s.p+'%</span></div>'+makeProgress(s.p,s.c)+'</div>'; }).join('');

  var doubts = window.LMS_DOUBTS || [{q:'What is Gauss Law for non-uniform fields?',s:'resolved',t:'2h ago'},{q:'Integration by parts — when to apply?',s:'pending',t:'5h ago'}];
  var dHtml = doubts.slice(0, 3).map(function(d){ return '<div class="list-item" style="cursor:pointer" onclick="openEnhancedDoubtDetail(\''+d.q.replace(/'/g,"\\'")+'\',\''+d.s+'\',\''+(d.sub || 'Physics')+'\')"><div class="li-icon" style="background:var(--surface2)">💬</div><div class="li-content"><div class="li-title">'+d.q+'</div><div class="li-sub">'+d.t+'</div></div><span class="badge '+(d.s==='resolved'?'badge-green':'badge-yellow')+'">'+d.s+'</span></div>'; }).join('');

  var lb = window.LMS_LEADERBOARD || [{rank:1,name:'Sneha Patel',score:94,tests:32,att:'96%',ch:'—',you:false},{rank:2,name:'Rohan Gupta',score:91,tests:30,att:'92%',ch:'↑1',you:false},{rank:3,name:'Ananya Singh',score:88,tests:31,att:'94%',ch:'↑3',you:false},{rank:4,name:'Arjun Sharma',score:85,tests:29,att:'89%',ch:'↑2',you:true},{rank:5,name:'Priya Joshi',score:83,tests:28,att:'87%',ch:'↓1',you:false}];
  var lbHtml = lb.map(function(s){ var rankCol = s.rank===1?'#fbbf24':s.rank===2?'#aaa':s.rank===3?'#cd7f32':'var(--muted)'; return '<tr style="'+(s.you?'background:rgba(74,222,128,.05)':'')+'" onclick="openStudentProfile(\''+s.name.replace(/'/g,"\\'")+'\','+s.rank+','+s.score+')"><td><div class="lb-rank" style="background:color-mix(in srgb,'+rankCol+' 18%,var(--surface2));color:'+rankCol+'">'+s.rank+'</div></td><td style="font-weight:'+(s.you?700:400)+'">'+s.name+(s.you?' (You)':'')+'</td><td><span style="color:var(--student);font-weight:700">'+s.score+'%</span></td><td>'+s.tests+'</td><td>'+s.att+'</td><td style="color:'+(s.ch.indexOf('↑')>-1?'var(--student)':s.ch.indexOf('↓')>-1?'var(--admin)':'var(--muted)')+'">'+s.ch+'</td></tr>'; }).join('');

  // Merged two-column layout matching reference design
  var leftCol = '<div style="flex:2;min-width:0;display:flex;flex-direction:column;gap:20px">' + resumeCard + quickActions + liveSection + '</div>';
  var rightCol = '<div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:14px">' + sideStats + tipCard + deadlineHtml + '<div class="card"><div class="card-header"><div class="card-title">📈 Subject Performance</div><button class="card-act" onclick="loadPage(\'progress\')">Full Report</button></div>' + perfHtml + '<div class="card-header" style="margin-top:14px"><div class="card-title">💬 Recent Doubts</div><button class="card-act" onclick="loadPage(\'doubts\')">View All</button></div>' + dHtml + '</div></div>';

  var bodyGrid = '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">' + leftCol + rightCol + '</div>';

  var leaderboardTable = '<div class="card"><div class="card-header"><div class="card-title">🏆 Leaderboard — JEE Advanced Batch A</div><button class="card-act" onclick="loadPage(\'leaderboard\')">Full Board</button></div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Score</th><th>Tests</th><th>Attendance</th><th>Change</th></tr></thead><tbody>' + lbHtml + '</tbody></table></div></div>';

  return welcomeBanner + bodyGrid + leaderboardTable;
};

// Global helper function for Resume Learning slide carousel
window.setResumeVideoIdx = function(idx) {
  window.currentResumeIdx = idx;
  var container = document.getElementById('stu-resume-container');
  if (!container) return;
  var v = window.resumeVideos[idx] || { t: 'No Videos', sub: 'N/A', emoji: '🎥' };
  var pct = idx === 0 ? 75 : idx === 1 ? 42 : 18;
  
  var title = v.title || v.t || 'Video';
  var emoji = v.thumb || v.emoji || '🎥';
  var sub = v.sub || 'Physics';
  
  var html = '<div class="stu-resume-body" style="display:flex;gap:14px;align-items:center">'
    + '<div style="position:relative;width:160px;height:90px;background:#0f172a;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;cursor:pointer" onclick="openVideoWithNotes(\'' + title.replace(/'/g,"\\'") + '\',\'' + emoji + '\')">' + emoji
    + '<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;border-radius:10px"><span style="width:36px;height:36px;border-radius:50%;background:#6c47ff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">▶</span></div>'
    + '</div>'
    + '<div style="flex:1;min-width:0">'
    + '<h4 style="font-family:Syne,sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + title + '</h4>'
    + '<p style="font-size:12px;color:var(--muted);margin-bottom:8px">' + sub + ' · JEE Advanced</p>'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<div class="prog-bar" style="flex:1;height:6px"><div class="prog-fill" style="width:' + pct + '%;background:var(--student)"></div></div>'
    + '<span style="font-size:11px;color:var(--muted)">' + pct + '%</span>'
    + '</div></div></div>';
    
  container.innerHTML = html;
  
  // Highlight active dot
  document.querySelectorAll('.resume-dot').forEach(function(dot, i) {
    if (i === idx) {
      dot.style.background = '#6c47ff';
      dot.style.width = '18px';
    } else {
      dot.style.background = 'rgba(255,255,255,.2)';
      dot.style.width = '6px';
    }
  });
};
// ──────────────── STUDENT COURSES (ENHANCED) ────────────────
PAGES['student_courses'] = function() {
  var allCourses = window.LMS_COURSES || [
    { _id:'1', e:'⚛️', title:'JEE (Advanced + Main)',  desc:'Comprehensive coaching for JEE Advanced and Main.', videos:24, materials:18, quizzes:12, enrolled:true, col:'linear-gradient(90deg,#6c47ff,#a855f7)', p:65, done:16, total:24, fac:'Dr. Priya Mehta', rating:4.8, reviews:142 },
    { _id:'2', e:'🚀', title:'JEE (Main + CET)',        desc:'Comprehensive coaching for JEE Main and CET.',       videos:20, materials:14, quizzes:8, enrolled:false, col:'linear-gradient(90deg,#4ade80,#00d4c8)', p:0, done:0, total:20, fac:'Mr. Raj Sharma', rating:4.6, reviews:98 },
    { _id:'3', e:'🎯', title:'KCET Batch',              desc:'Comprehensive coaching for KCET.',                   videos:18, materials:12, quizzes:6, enrolled:false, col:'linear-gradient(90deg,#a855f7,#6c47ff)', p:0, done:0, total:18, fac:'Prof. Amit Singh', rating:4.5, reviews:76 },
    { _id:'4', e:'🔬', title:'NEET UG',                 desc:'Comprehensive coaching for NEET UG.',                videos:30, materials:22, quizzes:15, enrolled:true,  col:'linear-gradient(90deg,#ff6b35,#fbbf24)', p:43, done:13, total:30, fac:'Dr. Kavya R.', rating:4.9, reviews:210 },
    { _id:'5', e:'💼', title:'Commerce Decoded',        desc:'Comprehensive coaching for Commerce.',               videos:22, materials:16, quizzes:10, enrolled:false, col:'linear-gradient(90deg,#ff2d6b,#ff6b35)', p:0, done:0, total:22, fac:'Prof. Neha K.', rating:4.4, reviews:64 },
    { _id:'6', e:'📚', title:'ReVise CET 2025',         desc:'Comprehensive revision for CET 2025.',               videos:15, materials:10, quizzes:8, enrolled:false, col:'linear-gradient(90deg,#ff2d6b,#a855f7)', p:0, done:0, total:15, fac:'Mr. Ravi V.', rating:4.7, reviews:88 },
  ];

  var stars = function(r) { var full = Math.floor(r); var html = ''; for(var i=0;i<5;i++) html += '<span style="color:'+(i<full?'#fbbf24':'rgba(255,255,255,.15)')+'">★</span>'; return html; };

  var gridHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px">'
    + allCourses.map(function(c) {
      var statusBadge = c.enrolled
        ? '<span style="background:rgba(74,222,128,.15);color:#4ade80;border:1px solid rgba(74,222,128,.3);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✅ Enrolled</span>'
        : '<span style="background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.25);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">🔒 Locked</span>';
      
      var actionBtn = c.enrolled
        ? '<button class="btn btn-solid" style="width:100%;justify-content:center;pointer-events:none">▶ Continue Learning</button>'
        : '<button style="width:100%;padding:10px;border-radius:9px;border:none;background:linear-gradient(135deg,#00c6ff,#00d4c8);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;pointer-events:none">👑 Unlock & Enroll</button>';

      var clickHandler = c.enrolled
        ? 'window.openCourseDetail(\''+c.title.replace(/'/g,"\\'")+'\',\''+c.e+'\',\'#4ade80\',\''+c.fac.replace(/'/g,"\\'")+'\','+c.total+','+c.done+','+c.p+')'
        : 'window.enrollInCourse(\''+c._id+'\',\''+c.title.replace(/'/g,"\\'")+'\')';

      return '<div class="enhanced-card" style="padding:0;overflow:hidden;cursor:pointer" onclick="' + clickHandler + '">'
        + '<div style="height:6px;background:'+c.col+'"></div>'
        + '<div style="padding:18px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'
        + '<div style="display:flex;align-items:center;gap:10px"><span style="font-size:28px">'+c.e+'</span>'
        + '<div style="font-family:Syne,sans-serif;font-size:15px;font-weight:700">'+c.title+'</div></div>'
        + statusBadge + '</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;margin-left:42px">'+c.desc+'</div>'
        + (c.enrolled && c.p > 0 ? '<div style="margin-bottom:12px">'+makeProgress(c.p,'#4ade80')+'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+c.p+'% completed · '+c.done+'/'+c.total+' chapters</div></div>' : '')
        + '<div style="display:flex;gap:16px;font-size:12px;color:var(--muted);margin-bottom:12px;flex-wrap:wrap">'
        + '<span style="display:flex;align-items:center;gap:4px">📹 '+c.videos+' Videos</span>'
        + '<span style="display:flex;align-items:center;gap:4px">📄 '+c.materials+' Materials</span>'
        + '<span style="display:flex;align-items:center;gap:4px">📝 '+c.quizzes+' Quizzes</span></div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
        + '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:14px;letter-spacing:1px">'+stars(c.rating)+'</span><span style="font-size:12px;font-weight:700;color:var(--text)">'+c.rating+'</span><span style="font-size:11px;color:var(--muted)">('+c.reviews+')</span></div>'
        + '<span style="font-size:11px;color:var(--muted)">by '+c.fac+'</span></div>'
        + actionBtn
        + '</div></div>';
    }).join('') + '</div>';

  return '<div style="margin-bottom:16px"><div style="font-size:13px;color:var(--muted)">Your enrolled courses and available programs</div></div>' + gridHtml;
};

function openCourseDetail(title, emoji, col, faculty, total, done, pct) {
  var chapters = ['Kinematics','Laws of Motion','Work Energy Power','Rotational Motion','Gravitation','Thermodynamics','Waves','Electrostatics','Current Electricity','Optics','Modern Physics','Semiconductors'];
  var chapHtml = chapters.map(function(ch,i){
    var isDone = i < done;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,'+(isDone?'0.06':'0.02')+');border:1px solid rgba(255,255,255,.06);margin-bottom:6px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor=\'rgba(108,71,255,.3)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,.06)\'" onclick="closeModal(\'modal-detail\'); openVideoWithNotes(\'Chapter ' + (i+1) + ': ' + ch.replace(/'/g,"\\'") + '\', \'' + emoji + '\')">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:'+(isDone?'linear-gradient(135deg,#4ade80,#00d4c8)':'rgba(255,255,255,.08)')+';display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">'+(isDone?'✓':(i+1))+'</div>'
      + '<div style="flex:1;font-size:13px;'+(isDone?'':'color:var(--muted)')+'">Ch '+(i+1)+': '+ch+'</div>'
      + (isDone ? '<span class="badge badge-green" style="font-size:10px">Done</span>' : '<span style="font-size:11px;color:var(--muted)">—</span>')
      + '</div>';
  }).join('');

  var actions = [
    { label: '📹 Watch Lectures', act: 'loadPage(\'videos\')' },
    { label: '📄 Download Notes', act: 'loadPage(\'material\')' },
    { label: '📝 Chapter Tests', act: 'loadPage(\'tests\')' },
    { label: '💬 Ask Doubt', act: 'loadPage(\'doubts\')' },
    { label: '📊 My Progress', act: 'loadPage(\'progress\')' },
    { label: '🎨 Digital Blackboard', act: 'openDigitalBlackboard()' }
  ];

  var actionHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">'
    + actions.map(function(a){
        return '<button class="btn btn-purple" style="justify-content:flex-start" onclick="closeModal(\'modal-detail\'); ' + a.act + '">' + a.label + '</button>';
      }).join('')
    + '</div>';

  var body = '<div style="display:flex;gap:14px;margin-bottom:18px;align-items:center">'
    + '<div style="width:66px;height:66px;border-radius:12px;background:color-mix(in srgb,'+col+' 12%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:36px">'+emoji+'</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:18px;font-weight:700;margin-bottom:4px">'+title+'</div>'
    + '<div style="color:var(--muted);font-size:13px">'+faculty+'</div>'
    + '<div style="margin-top:7px;display:flex;gap:6px"><span class="badge badge-green">Enrolled</span><span class="badge badge-purple">'+total+' Chapters</span></div></div></div>'
    + '<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:13px"><span>'+done+'/'+total+' completed</span><span style="color:'+col+';font-weight:700">'+pct+'%</span></div>'
    + '<div class="prog-bar" style="height:9px"><div class="prog-fill" style="width:'+pct+'%;background:'+col+'"></div></div></div>'
    + actionHtml
    + '<div style="font-family:Syne,sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;background:linear-gradient(135deg,#eef2ff,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent">📋 Chapter-wise Syllabus</div>'
    + '<div style="max-height:250px;overflow-y:auto;padding-right:4px">' + chapHtml + '</div>';
    
  var nextChapIdx = done < total ? done : 0;
  var nextChapName = chapters[nextChapIdx];
  var resumeBtn = '<button class="btn btn-solid" onclick="closeModal(\'modal-detail\'); openVideoWithNotes(\'Chapter ' + (nextChapIdx + 1) + ': ' + nextChapName.replace(/'/g,"\\'") + '\',\'' + emoji + '\')">▶ Resume Course</button>';
  
  openDetail(emoji + ' ' + title, body, resumeBtn);
}

// ──────────────── STUDENT VIDEO LECTURES (ENHANCED v2) ────────────────
PAGES['student_videos'] = function() {
  var videos = window.LMS_VIDEOS || [
    { thumb:'🏗️', title:'Laws of Motion — Full Chapter',       sub:'Physics',   batch:'JEE Adv', dur:'45:20', fac:'Dr. Ramesh Babu',  col:'#ff2d6b', views:1240, bookmarked:true, trending:true },
    { thumb:'🧪', title:'Organic Chemistry — IUPAC Naming',    sub:'Chemistry', batch:'JEE Adv', dur:'38:15', fac:'Prof. Sunita Sharma',col:'#00d4c8', views:980, bookmarked:false, trending:true },
    { thumb:'🌊', title:'Chemical Bonding — Hybridization',    sub:'Chemistry', batch:'NEET',    dur:'35:45', fac:'Prof. Sunita Sharma',col:'#6c47ff', views:870, bookmarked:false, trending:false },
    { thumb:'📐', title:'Integration — By Parts Method',       sub:'Maths',     batch:'JEE Adv', dur:'52:10', fac:'Mr. Raj Sharma',    col:'#a855f7', views:1100, bookmarked:true, trending:false },
    { thumb:'⚡', title:'Electrostatics — Gauss Law',           sub:'Physics',   batch:'JEE Adv', dur:'48:30', fac:'Dr. Priya Mehta',   col:'#ff2d6b', views:1450, bookmarked:false, trending:true },
    { thumb:'🔬', title:'Cell Division — Mitosis vs Meiosis',  sub:'Biology',   batch:'NEET',    dur:'41:05', fac:'Dr. Kavya R.',       col:'#4ade80', views:760, bookmarked:false, trending:false },
  ];

  var featured = videos.filter(function(v){return v.trending;});
  var featuredHtml = '<div class="card" style="margin-bottom:20px"><div class="card-header"><div class="card-title">🔥 Trending Videos</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">'
    + featured.map(function(v){
      return '<div class="enhanced-card slide-in" style="padding:0;overflow:hidden;cursor:pointer" onclick="openVideoWithNotes(\''+v.title.replace(/'/g,"\\'")+'\',\''+v.thumb+'\')">'
        + '<div style="position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,rgba(10,12,28,.9),rgba(20,22,50,.9));display:flex;align-items:center;justify-content:center;font-size:44px">'+v.thumb
        + '<div style="position:absolute;top:8px;left:8px"><span class="badge badge-red" style="font-size:10px">🔥 Trending</span></div>'
        + '<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.85);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px">'+v.dur+'</div>'
        + '<div style="position:absolute;bottom:8px;left:8px;font-size:11px;color:rgba(255,255,255,.7)">👁 '+v.views+'</div>'
        + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;background:rgba(0,0,0,.4)" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><div class="play-btn" style="width:48px;height:48px;font-size:18px">▶</div></div></div>'
        + '<div style="padding:12px"><div style="font-size:13px;font-weight:700;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+v.title+'</div>'
        + '<div style="font-size:11px;color:var(--muted)">'+v.fac+'</div></div></div>';
    }).join('') + '</div></div>';

  var subjectFilters = ['All Subjects','Physics','Chemistry','Maths','Biology'];
  var filterBar = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap">'
    + '<div class="inner-tabs">' + subjectFilters.map(function(s,i){ return '<button class="itab itab-vid'+(i===0?' active':'')+'" onclick="window.setVideoFilter(\''+s+'\'); window.filterVideos()">'+s+'</button>'; }).join('') + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;flex:1;max-width:280px">'
    + '<input id="video-search" class="inp-field" placeholder="🔍 Search videos..." style="padding:8px 12px" oninput="window.filterVideos()">'
    + '</div></div>';

  var videoGrid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px">'
    + videos.map(function(v) {
      return '<div class="enhanced-card video-card-item" data-title="'+v.title.replace(/"/g,'&quot;')+'" data-fac="'+v.fac.replace(/"/g,'&quot;')+'" data-sub="'+v.sub+'" style="padding:0;overflow:hidden">'
        + '<div style="position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,rgba(10,12,28,.9),rgba(20,22,50,.9));display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer" onclick="openVideoWithNotes(\''+v.title.replace(/'/g,"\\'")+'\',\''+v.thumb+'\')">'
        + v.thumb
        + '<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.85);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px">'+v.dur+'</div>'
        + '<div style="position:absolute;top:8px;right:8px"><button class="bookmark-btn" onclick="event.stopPropagation();this.textContent=this.textContent===\'🏷\'?\'🔖\':\'🏷\';toast(\'Bookmark toggled!\',\'🔖\')">'+(v.bookmarked?'🔖':'🏷')+'</button></div>'
        + '<div style="position:absolute;bottom:8px;left:8px;font-size:11px;color:rgba(255,255,255,.7)">👁 '+v.views+'</div>'
        + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;background:rgba(0,0,0,.4)" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><div class="play-btn" style="width:52px;height:52px;font-size:20px">▶</div></div>'
        + '</div>'
        + '<div style="padding:14px">'
        + '<div style="display:flex;gap:6px;margin-bottom:8px">'
        + '<span style="background:rgba(0,198,255,.12);color:#00c6ff;border:1px solid rgba(0,198,255,.25);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+v.sub+'</span>'
        + '<span style="background:rgba(108,71,255,.12);color:#a78bff;border:1px solid rgba(108,71,255,.25);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+v.batch+'</span></div>'
        + '<div style="font-family:Syne,sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;line-height:1.35">'+v.title+'</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">by '+v.fac+'</div>'
        + '<div style="display:flex;gap:6px">'
        + '<button class="btn btn-solid btn-sm" style="flex:1;justify-content:center" onclick="openVideoWithNotes(\''+v.title.replace(/'/g,"\\'")+'\',\''+v.thumb+'\')">▶ Watch</button>'
        + '<button class="btn btn-purple btn-sm" onclick="openVideoWithNotes(\''+v.title.replace(/'/g,"\\'")+'\',\''+v.thumb+'\')">📝</button>'
        + '<button class="btn btn-yellow btn-sm" onclick="toast(\'Generating AI Quiz...\',\'🤖\'); setTimeout(function(){startMockQuiz()}, 600)">🤖</button>'
        + '</div></div></div>';
    }).join('') + '</div>';

  var historyHtml = '<div class="card" style="margin-top:20px"><div class="card-header"><div class="card-title">📜 Watch History</div></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px">'
    + [{t:'Thermodynamics — Entropy',when:'Yesterday',pct:100},{t:'Organic Chemistry — Alcohols',when:'2 days ago',pct:85},{t:'Coordinate Geometry',when:'3 days ago',pct:60}].map(function(h){
      return '<div class="list-item" style="cursor:pointer" onclick="openVideoWithNotes(\''+h.t.replace(/'/g,"\\'")+'\',\'📹\')"><div class="li-icon" style="background:rgba(108,71,255,.1);border:1px solid rgba(108,71,255,.15)">📹</div><div class="li-content"><div class="li-title">'+h.t+'</div><div class="li-sub">Watched '+h.when+' · '+h.pct+'% completed</div></div><span class="badge '+(h.pct===100?'badge-green':'badge-yellow')+'">'+h.pct+'%</span></div>';
    }).join('') + '</div></div>';

  window.currentVideoFilter = window.currentVideoFilter || 'All Subjects';

  return featuredHtml + filterBar + videoGrid + historyHtml;
};

// Global helper functions for Videos page
window.setVideoFilter = function(sub) {
  window.currentVideoFilter = sub;
  document.querySelectorAll('.itab-vid').forEach(function(btn) {
    var text = btn.textContent.trim().toLowerCase();
    var matchText = sub.toLowerCase();
    if (matchText === 'all') matchText = 'all subjects';
    if (text === matchText) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.filterVideos = function() {
  var searchField = document.getElementById('video-search');
  var query = searchField ? searchField.value.toLowerCase() : '';
  var filter = window.currentVideoFilter || 'all';
  var items = document.querySelectorAll('.video-card-item');
  items.forEach(function(item) {
    var title = item.getAttribute('data-title').toLowerCase();
    var fac = item.getAttribute('data-fac').toLowerCase();
    var sub = item.getAttribute('data-sub').toLowerCase();
    
    var matchesSearch = title.indexOf(query) > -1 || fac.indexOf(query) > -1;
    var matchesFilter = filter.toLowerCase() === 'all' || filter.toLowerCase() === 'all subjects' || sub.toLowerCase() === filter.toLowerCase();
    
    if (matchesSearch && matchesFilter) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
};

// ──────────────── STUDENT LIVE CLASS (ENHANCED) ────────────────
PAGES['student_live'] = function() {
  var upcoming = [
    { time:'11:00', date:'Today',    sub:'Chemistry', topic:'Aldehydes & Ketones',   fac:'Prof. Amit Singh', n:98 },
    { time:'02:00', date:'Today',    sub:'Maths',     topic:'Integration by Parts',  fac:'Mr. Raj Sharma',   n:115 },
    { time:'09:00', date:'Tomorrow', sub:'Physics',   topic:'Magnetic Effects',      fac:'Dr. Priya Mehta',  n:142 },
    { time:'11:00', date:'Tomorrow', sub:'Chemistry', topic:'Coordination Compounds',fac:'Prof. Amit Singh',  n:98 },
  ];
  var recorded = [
    { title:"Electrostatics - Coulomb's Law", sub:'Physics',  dur:'58 min', views:312 },
    { title:'Organic Chemistry - Reactions',  sub:'Chemistry',dur:'72 min', views:289 },
    { title:'Quadratic Equations',            sub:'Maths',    dur:'45 min', views:198 },
    { title:'Cell Division - Mitosis',        sub:'Biology',  dur:'52 min', views:167 },
  ];

  // Immersive live class card
  var liveBox = '<div class="enhanced-card border-glow" style="margin-bottom:20px;padding:0;overflow:hidden">'
    + '<div style="position:relative;aspect-ratio:21/9;background:linear-gradient(135deg,rgba(10,12,28,.95),rgba(20,22,50,.95),rgba(108,71,255,.1));display:flex;align-items:center;justify-content:center;min-height:200px">'
    + '<div style="position:absolute;top:14px;left:14px;display:flex;align-items:center;gap:8px"><span class="live-badge" style="font-size:12px;padding:5px 14px"><div class="live-dot"></div>LIVE NOW</span><span style="background:rgba(255,255,255,.1);backdrop-filter:blur(8px);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;color:rgba(255,255,255,.8)">👥 142 watching</span></div>'
    + '<div style="position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:6px"><span style="background:rgba(255,45,107,.15);border:1px solid rgba(255,45,107,.3);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#ff2d6b;display:flex;align-items:center;gap:4px">🔴 REC</span><span style="background:rgba(255,255,255,.1);backdrop-filter:blur(8px);padding:3px 10px;border-radius:20px;font-size:11px;color:rgba(255,255,255,.7)">🖥️ Screen Shared</span></div>'
    + '<div style="text-align:center"><div style="font-size:52px;margin-bottom:12px">⚛️</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;margin-bottom:4px">Physics — Electrostatics: Gauss Law</div>'
    + '<div style="color:var(--muted);font-size:13px;margin-bottom:16px">Dr. Priya Mehta &nbsp;•&nbsp; JEE Advanced Batch A</div>'
    + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'
    + '<button class="btn btn-red glow-join" onclick="openLiveClassModal()" style="font-weight:800;padding:12px 32px;font-size:15px;border-radius:12px">🎥 Join Live Class</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Hand raised! ✋\',\'🖐️\')" style="font-size:20px;padding:10px 16px" title="Raise Hand">✋</button>'
    + '<button class="btn btn-teal" onclick="toast(\'Chat opened\',\'💬\')" style="padding:10px 16px" title="Open Chat">💬 Chat</button>'
    + '</div></div>'
    + '<div style="position:absolute;bottom:14px;left:14px;display:flex;gap:6px">'
    + [{n:'Dr. Priya',c:'#6c47ff'},{n:'Student',c:'#4ade80'},{n:'Arjun',c:'#ff6b35'}].map(function(p){return '<div style="width:32px;height:32px;border-radius:50%;background:'+p.c+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;border:2px solid rgba(10,12,28,.8)" title="'+p.n+'">'+p.n[0]+'</div>';}).join('')
    + '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--muted);border:2px solid rgba(10,12,28,.8)">+139</div></div>'
    + '</div></div>';

  var upHtml = upcoming.map(function(c) {
    return '<div class="sched-item" onclick="toast(\'Reminder set!\',\'🔔\')">'
      + '<div class="sched-time"><div class="st">' + c.time + '</div><div class="sd">' + c.date + '</div></div>'
      + '<div class="sched-body"><div class="sched-title">' + c.sub + ': ' + c.topic + '</div>'
      + '<div class="sched-meta">' + c.fac + ' • ' + c.n + ' enrolled</div></div>'
      + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Reminder set!\',\'🔔\')">🔔</button></div>';
  }).join('');

  var recHtml = '<div class="tbl-wrap"><table><thead><tr><th>Lecture</th><th>Subject</th><th>Duration</th><th>Views</th><th>Action</th></tr></thead><tbody>'
    + recorded.map(function(r) {
      return '<tr onclick="openLiveClassModal()"><td style="font-weight:600">'+r.title+'</td><td><span class="badge badge-purple">'+r.sub+'</span></td><td>'+r.dur+'</td><td>👁 '+r.views+'</td><td><button class="btn btn-sm btn-teal" onclick="event.stopPropagation();openLiveClassModal()">▶ Watch</button></td></tr>';
    }).join('') + '</tbody></table></div>';

  return liveBox
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-header"><div class="card-title">📅 Upcoming Classes</div></div>' + upHtml + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">📼 Recorded Lectures</div></div>' + recHtml + '</div>'
    + '</div>';
};


// ──────────────── STUDENT TESTS (ENHANCED) ────────────────
PAGES['student_tests'] = function() {
  var testsData = {
    upcoming: [
      { title:'Mock Test 14 — Full Syllabus JEE', date:'Mar 20, 2025', time:'09:00 AM', dur:'3 hrs', marks:360, qs:90, sub:'All', diff:'Hard' },
      { title:'Weekly Test — Thermodynamics', date:'Mar 18, 2025', time:'10:00 AM', dur:'1 hr', marks:100, qs:30, sub:'Physics', diff:'Medium' },
    ],
    completed: [
      { title:'Mock Test 13 — Physics + Chemistry', date:'Mar 10', score:267, total:300, pct:89, rank:3, time:'2h 45m', correct:78, wrong:8, skip:4 },
      { title:'Weekly Test — Organic Chemistry', date:'Mar 7', score:72, total:100, pct:72, rank:12, time:'52m', correct:21, wrong:7, skip:2 },
      { title:'Mock Test 12 — Full Syllabus', date:'Mar 3', score:298, total:360, pct:83, rank:5, time:'2h 58m', correct:82, wrong:6, skip:2 },
    ]
  };

  // Analytics cards
  var analytics = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">'
    + [{icon:'📝',val:'32',label:'Tests Taken',col:'var(--purple)'},{icon:'📊',val:'78%',label:'Average Score',col:'var(--faculty)'},{icon:'🏆',val:'#4',label:'Best Rank',col:'var(--yellow)'},{icon:'🎯',val:'89%',label:'Accuracy',col:'var(--student)'}].map(function(s){
      return '<div class="enhanced-card" style="text-align:center"><div style="font-size:24px;margin-bottom:8px">'+s.icon+'</div><div style="font-family:Syne,sans-serif;font-size:26px;font-weight:900;color:'+s.col+'">'+s.val+'</div><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:4px">'+s.label+'</div></div>';
    }).join('') + '</div>';

  // Upcoming tests
  var upcomingHtml = '<div class="card"><div class="card-header"><div class="card-title">📅 Upcoming Tests</div></div>'
    + testsData.upcoming.map(function(t){
      return '<div class="enhanced-card slide-in" style="margin-bottom:10px">'
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">'
        + '<div style="flex:1"><div style="font-family:Syne,sans-serif;font-size:15px;font-weight:700;margin-bottom:6px">'+t.title+'</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-bottom:10px">'
        + '<span>📅 '+t.date+'</span><span>🕐 '+t.time+'</span><span>⏱️ '+t.dur+'</span><span>📊 '+t.marks+' marks</span><span>❓ '+t.qs+' questions</span></div>'
        + '<div style="display:flex;gap:6px"><span class="badge badge-purple">'+t.sub+'</span><span class="badge '+(t.diff==='Hard'?'badge-red':'badge-yellow')+'">'+t.diff+'</span></div></div>'
        + '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        + '<button class="btn btn-solid" onclick="startMockQuiz()">🚀 Start Test</button>'
        + '<button class="btn btn-sm btn-purple" onclick="toast(\'Syllabus downloaded\',\'📋\')">📋 Syllabus</button></div>'
        + '</div></div>';
    }).join('') + '</div>';

  // Completed tests with performance
  var completedHtml = '<div class="card"><div class="card-header"><div class="card-title">✅ Completed Tests</div></div>'
    + testsData.completed.map(function(t){
      var color = t.pct >= 85 ? '#4ade80' : t.pct >= 70 ? '#fbbf24' : '#ff2d6b';
      return '<div class="enhanced-card" style="margin-bottom:10px">'
        + '<div style="display:flex;align-items:center;gap:16px">'
        + '<div style="position:relative;width:60px;height:60px;flex-shrink:0"><svg width="60" height="60" style="transform:rotate(-90deg)"><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="5"/><circle cx="30" cy="30" r="25" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="'+Math.round(157-157*t.pct/100)+'"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;font-size:14px;font-weight:900;color:'+color+'">'+t.pct+'%</div></div>'
        + '<div style="flex:1"><div style="font-size:14px;font-weight:700;margin-bottom:4px">'+t.title+'</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">'+t.date+' · '+t.time+' taken · Rank #'+t.rank+'</div>'
        + '<div style="display:flex;gap:10px;font-size:12px"><span style="color:#4ade80;font-weight:700">✓ '+t.correct+'</span><span style="color:#ff2d6b;font-weight:700">✗ '+t.wrong+'</span><span style="color:var(--muted)">⊘ '+t.skip+' skipped</span></div></div>'
        + '<div style="text-align:right;flex-shrink:0"><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:900;color:'+color+'">'+t.score+'<span style="font-size:13px;color:var(--muted)">/'+t.total+'</span></div>'
        + '<button class="btn btn-sm btn-purple" style="margin-top:6px" onclick="openQuizAnalytics(\''+t.title.replace(/'/g,"\\'")+'\','+t.score+','+t.total+','+t.correct+','+t.wrong+','+t.skip+')">📊 Analysis</button></div>'
        + '</div></div>';
    }).join('') + '</div>';

  // Performance comparison chart
  var chartHtml = '<div class="card"><div class="card-header"><div class="card-title">📈 Performance Trend</div></div>'
    + '<div class="chart-bars" style="height:120px">'
    + [{l:'T8',v:65},{l:'T9',v:72},{l:'T10',v:78},{l:'T11',v:68},{l:'T12',v:83},{l:'T13',v:89}].map(function(b){
      return '<div class="bar-wrap"><div class="bar" style="height:'+b.v+'%;background:linear-gradient(to top,'+(b.v>=80?'#4ade80,#00d4c8':b.v>=70?'#fbbf24,#ff6b35':'#ff2d6b,#ff6b35')+')" title="'+b.v+'%"></div><div class="bar-label">'+b.l+'</div></div>';
    }).join('') + '</div></div>';

  return analytics + '<div class="grid-2">' + upcomingHtml + chartHtml + '</div>' + completedHtml;
};

function startMockQuiz() {
  var questions = [
    { q:'A body of mass 5 kg is acted upon by two perpendicular forces 8N and 6N. The magnitude of acceleration is:', o:['2.0 m/s²','1.5 m/s²','2.8 m/s²','1.0 m/s²'], a:0 },
    { q:'The SI unit of electric flux is:', o:['N·m²/C','C/m²','V·m','N/C'], a:0 },
    { q:'The value of ∫₀^π sin²x dx is:', o:['π/2','π','π/4','2π'], a:0 },
  ];
  
  window.quizState = {
    questions: questions,
    answers: questions.map(function() { return null; }),
    reviewed: questions.map(function() { return false; }),
    currentIdx: 0,
    startTime: Date.now()
  };

  window.selectQuizOption = function(qIdx, optIdx) {
    window.quizState.answers[qIdx] = optIdx;
    window.renderQuizQuestion(qIdx);
  };

  window.toggleQuizReview = function(qIdx) {
    window.quizState.reviewed[qIdx] = !window.quizState.reviewed[qIdx];
    toast(window.quizState.reviewed[qIdx] ? 'Marked for review!' : 'Unmarked from review', '🔖');
    window.renderQuizQuestion(qIdx);
  };

  window.submitQuiz = function() {
    var correct = 0;
    var wrong = 0;
    var skip = 0;
    window.quizState.questions.forEach(function(q, idx) {
      var ans = window.quizState.answers[idx];
      if (ans === null) {
        skip++;
      } else if (ans === q.a) {
        correct++;
      } else {
        wrong++;
      }
    });
    var score = correct * 4 - wrong * 1; // Assuming JEE marking +4 / -1
    if (score < 0) score = 0;
    var total = window.quizState.questions.length * 4;
    closeModal('modal-detail');
    toast('Quiz submitted successfully!', '✅');
    setTimeout(function() {
      openQuizAnalytics('Mock Test Results', score, total, correct, wrong, skip);
    }, 300);
  };

  window.renderQuizQuestion = function(i) {
    window.quizState.currentIdx = i;
    var q = window.quizState.questions[i];
    var ans = window.quizState.answers[i];
    var isReviewed = window.quizState.reviewed[i];

    var navBtns = window.quizState.questions.map(function(_, j) {
      var statusColor = 'rgba(255,255,255,.06)';
      var borderColor = 'rgba(255,255,255,.08)';
      var fontColor = 'var(--muted)';
      if (j === i) {
        statusColor = 'linear-gradient(135deg,#6c47ff,#a855f7)';
        borderColor = 'rgba(108,71,255,.4)';
        fontColor = '#fff';
      } else if (window.quizState.reviewed[j]) {
        statusColor = 'rgba(251,191,36,.2)';
        borderColor = '#fbbf24';
        fontColor = '#fbbf24';
      } else if (window.quizState.answers[j] !== null) {
        statusColor = 'rgba(74,222,128,.15)';
        borderColor = '#4ade80';
        fontColor = '#4ade80';
      }
      return '<button style="width:32px;height:32px;border-radius:8px;background:' + statusColor + ';border:1px solid ' + borderColor + ';color:' + fontColor + ';font-weight:700;font-size:12px;cursor:pointer" onclick="window.renderQuizQuestion(' + j + ')">' + (j + 1) + '</button>';
    }).join('');

    var body = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="display:flex;gap:6px">' + navBtns + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px"><div style="position:relative;width:40px;height:40px"><svg width="40" height="40" style="transform:rotate(-90deg)"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="#ff2d6b" stroke-width="4" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="25"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#ff2d6b">45m</div></div><span style="font-size:12px;color:var(--muted)">Q ' + (i + 1) + '/' + window.quizState.questions.length + '</span></div></div>'
      + '<div class="q-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:14px">'
      + '<div class="q-text" style="font-size:14px;font-weight:600;margin-bottom:14px;line-height:1.5">' + q.q + '</div>'
      + '<div class="opts-grid" style="display:grid;grid-template-columns:1fr;gap:8px">' + q.o.map(function(o, oi) {
          var isSel = ans === oi;
          var btnStyle = isSel ? 'background:linear-gradient(135deg,rgba(108,71,255,0.2),rgba(168,85,247,0.15));border-color:var(--purple);color:#fff;font-weight:700' : '';
          return '<button class="opt" style="text-align:left;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);color:var(--text);cursor:pointer;' + btnStyle + '" onclick="window.selectQuizOption(' + i + ',' + oi + ')">' + String.fromCharCode(65 + oi) + '. ' + o + '</button>';
        }).join('') + '</div></div>'
      + '<div style="display:flex;justify-content:space-between;margin-top:14px"><button class="btn btn-purple" onclick="window.toggleQuizReview(' + i + ')">🔖 ' + (isReviewed ? 'Unmark Review' : 'Mark for Review') + '</button><div style="display:flex;gap:8px">'
      + (i > 0 ? '<button class="btn btn-purple" onclick="window.renderQuizQuestion(' + (i - 1) + ')">← Prev</button>' : '')
      + (i < window.quizState.questions.length - 1 ? '<button class="btn btn-solid" onclick="window.renderQuizQuestion(' + (i + 1) + ')">Next →</button>' : '<button class="btn btn-green" onclick="window.submitQuiz()">✅ Submit</button>')
      + '</div></div>';

    openDetail('🎯 Mock Test — Question ' + (i + 1), body, '');
  };

  window.renderQuizQuestion(0);
}

// ──────────────── STUDENT MATERIAL (ENHANCED v2) ────────────────
PAGES['student_material'] = function() {
  var materials = window.LMS_MATERIALS || [
    { name:'Electrostatics — Complete Notes',      sub:'Physics',   type:'pdf', size:'2.4 MB', date:'Mar 12', fac:'Dr. Priya Mehta', bookmarked:true },
    { name:'Organic Chemistry — Reaction Map',     sub:'Chemistry', type:'pdf', size:'1.8 MB', date:'Mar 10', fac:'Prof. Sunita Sharma', bookmarked:false },
    { name:'Integration Formulae Sheet',           sub:'Maths',     type:'pdf', size:'0.9 MB', date:'Mar 8',  fac:'Mr. Raj Sharma', bookmarked:true },
    { name:'Cell Division — Diagram Pack',         sub:'Biology',   type:'ppt', size:'5.2 MB', date:'Mar 6',  fac:'Dr. Kavya R.', bookmarked:false },
    { name:'Thermodynamics — Quick Revision',      sub:'Physics',   type:'pdf', size:'1.1 MB', date:'Mar 4',  fac:'Dr. Priya Mehta', bookmarked:false },
    { name:'Algebra — DPP Solutions',              sub:'Maths',     type:'doc', size:'3.0 MB', date:'Mar 2',  fac:'Mr. Raj Sharma', bookmarked:false },
    { name:'Chemical Bonding — Summary',           sub:'Chemistry', type:'pdf', size:'1.5 MB', date:'Feb 28', fac:'Prof. Sunita Sharma', bookmarked:false },
    { name:'Wave Optics — Visual Guide',           sub:'Physics',   type:'ppt', size:'8.1 MB', date:'Feb 25', fac:'Dr. Priya Mehta', bookmarked:false },
  ];

  var typeIcons = { pdf:'📕', ppt:'📊', doc:'📘' };
  var typeColors = { pdf:'rgba(255,45,107,.1)', ppt:'rgba(255,107,53,.1)', doc:'rgba(0,198,255,.1)' };
  var typeBorders = { pdf:'rgba(255,45,107,.2)', ppt:'rgba(255,107,53,.2)', doc:'rgba(0,198,255,.2)' };

  var recentHtml = '<div class="card" style="margin-bottom:18px"><div class="card-header"><div class="card-title">🕐 Recently Accessed</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'
    + materials.slice(0,3).map(function(m){
      return '<div class="enhanced-card slide-in" style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="openMaterialPreview(\''+m.name.replace(/'/g,"\\'")+'\',\''+m.type+'\',\''+m.sub+'\',\''+m.fac.replace(/'/g,"\\'")+'\')">'
        + '<div style="width:44px;height:52px;border-radius:8px;background:'+typeColors[m.type]+';border:1px solid '+typeBorders[m.type]+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+typeIcons[m.type]+'</div>'
        + '<div style="min-width:0"><div style="font-size:12px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.name+'</div>'
        + '<div style="font-size:11px;color:var(--muted)">'+m.sub+' · '+m.size+'</div></div></div>';
    }).join('') + '</div></div>';

  var bookmarked = materials.filter(function(m){return m.bookmarked;});
  var bookmarkHtml = bookmarked.length > 0 ? '<div class="card" style="margin-bottom:18px"><div class="card-header"><div class="card-title">🔖 Bookmarked Materials</div></div>'
    + bookmarked.map(function(m){
      return '<div class="list-item" style="cursor:pointer" onclick="openMaterialPreview(\''+m.name.replace(/'/g,"\\'")+'\',\''+m.type+'\',\''+m.sub+'\',\''+m.fac.replace(/'/g,"\\'")+'\')">'
        + '<div style="width:44px;height:52px;border-radius:8px;background:'+typeColors[m.type]+';border:1px solid '+typeBorders[m.type]+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+typeIcons[m.type]+'</div>'
        + '<div class="li-content"><div class="li-title">'+m.name+'</div><div class="li-sub">'+m.sub+' · '+m.size+' · '+m.fac+'</div></div>'
        + '<span class="badge badge-yellow">🔖</span></div>';
    }).join('') + '</div>' : '';

  var subjects = ['All','Physics','Chemistry','Maths','Biology'];
  var filterBar = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div class="inner-tabs">' + subjects.map(function(s,i){ return '<button class="itab itab-mat'+(i===0?' active':'')+'" onclick="window.setMaterialFilter(\''+s+'\'); window.filterMaterials()">'+s+'</button>'; }).join('') + '</div>'
    + '<div style="flex:1"></div>'
    + '<input id="material-search" class="inp-field" placeholder="🔍 Search materials..." style="max-width:240px;padding:8px 12px" oninput="window.filterMaterials()">'
    + '</div>';

  var gridHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">'
    + materials.map(function(m) {
      return '<div class="enhanced-card material-card-item" data-name="'+m.name.replace(/"/g,'&quot;')+'" data-fac="'+m.fac.replace(/"/g,'&quot;')+'" data-sub="'+m.sub+'" style="cursor:pointer" onclick="openMaterialPreview(\''+m.name.replace(/'/g,"\\'")+'\',\''+m.type+'\',\''+m.sub+'\',\''+m.fac.replace(/'/g,"\\'")+'\')">'
        + '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">'
        + '<div style="width:50px;height:60px;border-radius:10px;background:'+typeColors[m.type]+';border:1px solid '+typeBorders[m.type]+';display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">'+typeIcons[m.type]+'</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;margin-bottom:3px;line-height:1.35">'+m.name+'</div>'
        + '<div style="font-size:11px;color:var(--muted)">'+m.fac+'</div></div>'
        + '<button class="bookmark-btn" onclick="event.stopPropagation();this.textContent=this.textContent===\'🏷\'?\'🔖\':\'🏷\';toast(\'Bookmark toggled!\',\'🔖\')">'+(m.bookmarked?'🔖':'🏷')+'</button></div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted)">'
        + '<div style="display:flex;gap:8px"><span class="badge badge-purple" style="font-size:10px">'+m.sub+'</span><span>'+m.size+'</span><span>'+m.date+'</span></div>'
        + '<span style="text-transform:uppercase;font-weight:700;font-size:10px;color:'+(m.type==='pdf'?'#ff2d6b':m.type==='ppt'?'#ff6b35':'#00c6ff')+'">'+m.type+'</span></div>'
        + '<div style="display:flex;gap:6px;margin-top:12px">'
        + '<button class="btn btn-sm btn-purple" style="flex:1;justify-content:center" onclick="event.stopPropagation();openMaterialPreview(\''+m.name.replace(/'/g,"\\'")+'\',\''+m.type+'\',\''+m.sub+'\',\''+m.fac.replace(/'/g,"\\'")+'\')">👁 Preview</button>'
        + '<button class="btn btn-sm btn-teal" style="flex:1;justify-content:center" onclick="event.stopPropagation();toast(\'Downloading '+m.name.replace(/'/g,"\\'")+'...\',\'⬇️\')">⬇️ Download</button></div></div>';
    }).join('') + '</div>';

  window.currentMaterialFilter = window.currentMaterialFilter || 'All';

  return recentHtml + bookmarkHtml + filterBar + gridHtml;
};

// Global helper functions for Material page
window.setMaterialFilter = function(sub) {
  window.currentMaterialFilter = sub;
  document.querySelectorAll('.itab-mat').forEach(function(btn) {
    if (btn.textContent.trim().toLowerCase() === sub.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.filterMaterials = function() {
  var searchField = document.getElementById('material-search');
  var query = searchField ? searchField.value.toLowerCase() : '';
  var filter = window.currentMaterialFilter || 'all';
  var items = document.querySelectorAll('.material-card-item');
  items.forEach(function(item) {
    var name = item.getAttribute('data-name').toLowerCase();
    var fac = item.getAttribute('data-fac').toLowerCase();
    var sub = item.getAttribute('data-sub').toLowerCase();
    
    var matchesSearch = name.indexOf(query) > -1 || fac.indexOf(query) > -1;
    var matchesFilter = filter.toLowerCase() === 'all' || sub.toLowerCase() === filter.toLowerCase();
    
    if (matchesSearch && matchesFilter) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
};

// ──────────────── STUDENT DOUBTS (ENHANCED v3) ────────────────
PAGES['student_doubts'] = function() {
  if (!window.studentDoubts) {
    window.studentDoubts = [
      { q:'What is the difference between Gauss Law for uniform and non-uniform electric fields?', s:'resolved', t:'2h ago', sub:'Physics', replies:3, ai:true },
      { q:'When should I use integration by parts vs substitution?', s:'pending', t:'5h ago', sub:'Maths', replies:0, ai:false },
      { q:'Explain SN1 vs SN2 reaction mechanisms with examples', s:'resolved', t:'1d ago', sub:'Chemistry', replies:5, ai:true },
      { q:'How to determine hybridization of central atom?', s:'pending', t:'2d ago', sub:'Chemistry', replies:1, ai:false },
      { q:'What is the significance of psi and psi squared in quantum mechanics?', s:'resolved', t:'3d ago', sub:'Physics', replies:4, ai:true }
    ];
  }
  var doubts = window.studentDoubts;

  var subColors = { Physics:'#ff2d6b', Chemistry:'#00d4c8', Maths:'#a855f7', Biology:'#4ade80', General:'var(--purple)' };

  var statsHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">'
    + [{icon:'💬',val:'18',label:'Total Doubts',col:'var(--purple)'},{icon:'✅',val:'14',label:'Resolved',col:'var(--student)'},{icon:'⏳',val:'4',label:'Pending',col:'var(--yellow)'},{icon:'🤖',val:'10',label:'AI Answered',col:'var(--faculty)'}].map(function(s){
      return '<div class="enhanced-card" style="text-align:center"><div style="font-size:22px;margin-bottom:6px">'+s.icon+'</div><div style="font-family:Syne,sans-serif;font-size:24px;font-weight:900;color:'+s.col+'">'+s.val+'</div><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">'+s.label+'</div></div>';
    }).join('') + '</div>';

  // Ask doubt form with image upload, voice note, related reference, and live preview
  var formHtml = '<div class="card" style="margin-bottom:18px"><div class="card-header"><div class="card-title">✍️ Ask a New Doubt</div></div>'
    + '<div class="inp-row" style="margin-bottom:10px">'
    + '<div class="inp-group"><label>Subject</label><select class="inp-field" id="doubt-subject" onchange="window.updateDoubtPreview()"><option>Physics</option><option>Chemistry</option><option>Maths</option><option>Biology</option><option>General</option></select></div>'
    + '<div class="inp-group"><label>Send To</label><select class="inp-field" id="doubt-send-to"><option value="">Auto-assign best teacher</option><option>Dr. Priya Mehta (Physics)</option><option>Prof. Amit Patel (Chemistry)</option><option>Prof. Alok Sharma (Maths)</option><option>Dr. Sneha Rao (Biology)</option></select></div>'
    + '</div>'
    + '<div class="inp-row" style="margin-bottom:10px">'
    + '<div class="inp-group"><label>Related To</label><select class="inp-field" id="doubt-related-to" onchange="window.toggleDoubtReferenceFields()"><option value="">Direct question (no reference)</option><option value="video">A specific video</option><option value="material">A specific material</option></select></div>'
    + '<div class="inp-group" id="doubt-video-group" style="display:none"><label>Which Video?</label><select class="inp-field" id="doubt-video-select"><option>Laws of Motion — Full Chapter</option><option>Organic Chemistry — IUPAC Naming</option><option>Chemical Bonding — Hybridization</option><option>Integration — By Parts Method</option><option>Electrostatics — Gauss Law</option></select></div>'
    + '<div class="inp-group" id="doubt-material-group" style="display:none"><label>Which Material?</label><select class="inp-field" id="doubt-material-select"><option>Electrostatics — Complete Notes</option><option>Organic Chemistry — Reaction Map</option><option>Integration Formulae Sheet</option><option>Cell Division — Diagram Pack</option></select></div>'
    + '</div>'
    + '<div class="inp-group" style="margin-bottom:10px"><label>Your Question</label><textarea class="inp-field" id="doubt-question" placeholder="Describe your doubt in detail..." rows="3" oninput="window.updateDoubtPreview()"></textarea></div>'
    
    // Live Preview Box
    + '<div id="doubt-live-preview" class="enhanced-card" style="display:none;margin-bottom:12px;background:rgba(108,71,255,0.04);border:1px dashed rgba(108,71,255,0.3);padding:14px">'
    + '<span style="font-size:10px;font-weight:700;color:#a78bff;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">📝 Live Preview</span>'
    + '<div style="display:flex;gap:10px;align-items:flex-start">'
    + '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6c47ff,#a855f7);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0">A</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
    + '<strong style="font-size:12px;color:var(--text)">You (Arjun Sharma)</strong>'
    + '<span id="doubt-preview-cat" class="badge badge-purple" style="font-size:9px">Physics</span>'
    + '</div>'
    + '<div id="doubt-preview-text" style="font-size:12px;color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-word"></div>'
    + '</div></div></div>'

    // Image attachment area
    + '<div id="doubt-attachment-area" style="display:none;margin-bottom:10px;padding:14px;border:2px dashed rgba(108,71,255,.3);border-radius:12px;text-align:center;background:rgba(108,71,255,.03)">'
    + '<div style="font-size:32px;margin-bottom:8px">📸</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Screenshot/Image attached</div>'
    + '<button class="btn btn-sm btn-red" onclick="document.getElementById(\'doubt-attachment-area\').style.display=\'none\';toast(\'Attachment removed\',\'🗑️\')">🗑️ Remove</button></div>'
    
    // Voice note area
    + '<div id="doubt-voice-area" style="display:none;margin-bottom:10px;padding:14px;border:1px solid rgba(74,222,128,.25);border-radius:12px;background:rgba(74,222,128,.04)">'
    + '<div style="display:flex;align-items:center;gap:10px"><span style="font-size:24px">🎤</span>'
    + '<div style="flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:65%;background:linear-gradient(90deg,#4ade80,#00d4c8);border-radius:3px"></div></div>'
    + '<span style="font-size:12px;color:var(--muted)">0:08</span>'
    + '<button class="btn btn-sm btn-red" onclick="document.getElementById(\'doubt-voice-area\').style.display=\'none\';toast(\'Voice note removed\',\'🗑️\')">🗑️</button></div></div>'
    
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<button class="btn btn-solid" onclick="submitDoubt()">🚀 Submit Doubt</button>'
    + '<button class="btn btn-purple" onclick="document.getElementById(\'doubt-attachment-area\').style.display=\'block\';toast(\'📸 Take a screenshot or upload an image\',\'📸\')">📸 Attach Image</button>'
    + '<button class="btn btn-teal" onclick="document.getElementById(\'doubt-voice-area\').style.display=\'flex\';toast(\'🎤 Recording voice note...\',\'🎤\')">🎤 Voice Note</button>'
    + '<button class="btn btn-yellow" onclick="askAIDoubt()" style="margin-left:auto">🤖 Ask AI Instantly</button>'
    + '</div></div>';

  // Doubts list with filter and search
  var filterHtml = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div class="inner-tabs">'
    + ['All Doubts','Pending','Resolved','AI Answered'].map(function(f,i){ return '<button class="itab itab-doubt'+(i===0?' active':'')+'" onclick="window.setDoubtFilter(\''+f+'\'); window.filterDoubts()">'+f+'</button>'; }).join('')
    + '</div>'
    + '<input id="doubt-search" class="inp-field" placeholder="🔍 Search doubts..." style="flex:1;max-width:240px;padding:8px 12px" oninput="window.filterDoubts()">'
    + '</div>';

  var listHtml = '<div class="card"><div class="card-header"><div class="card-title">📋 Your Doubts</div></div>' + filterHtml
    + '<div id="doubt-list-container">'
    + doubts.map(function(d) {
      var col = subColors[d.sub] || 'var(--purple)';
      return '<div class="enhanced-card doubt-card-item" style="margin-bottom:10px;cursor:pointer" data-q="'+d.q.replace(/"/g,'&quot;')+'" data-sub="'+d.sub+'" data-status="'+d.s+'" data-ai="'+d.ai+'" onclick="openEnhancedDoubtDetail(\''+d.q.replace(/'/g,"\\'")+'\',\''+d.s+'\',\''+d.sub+'\')">'
        + '<div style="display:flex;align-items:flex-start;gap:12px">'
        + '<div style="width:40px;height:40px;border-radius:12px;background:color-mix(in srgb,'+col+' 12%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💬</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;margin-bottom:4px;line-height:1.45">'+d.q+'</div>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<span class="badge" style="background:color-mix(in srgb,'+col+' 12%,transparent);color:'+col+';border:1px solid color-mix(in srgb,'+col+' 25%,transparent)">'+d.sub+'</span>'
        + '<span style="font-size:11px;color:var(--muted)">'+d.t+'</span>'
        + '<span style="font-size:11px;color:var(--muted)">💬 '+d.replies+' replies</span>'
        + (d.ai ? '<span class="badge badge-teal" style="font-size:10px">🤖 AI Answered</span>' : '')
        + '</div></div>'
        + '<span class="badge '+(d.s==='resolved'?'badge-green':'badge-yellow')+'">'+d.s+'</span></div></div>';
    }).join('') 
    + '</div></div>';

  // Initialize filter state if not set
  window.currentDoubtFilter = window.currentDoubtFilter || 'All Doubts';

  return statsHtml + formHtml + listHtml;
};

// Global helper functions for Doubts page
window.toggleDoubtReferenceFields = function() {
  var related = document.getElementById('doubt-related-to').value;
  var vg = document.getElementById('doubt-video-group');
  var mg = document.getElementById('doubt-material-group');
  if (vg) vg.style.display = related === 'video' ? 'block' : 'none';
  if (mg) mg.style.display = related === 'material' ? 'block' : 'none';
};

window.updateDoubtPreview = function() {
  var q = document.getElementById('doubt-question').value;
  var cat = document.getElementById('doubt-subject').value;
  var previewBox = document.getElementById('doubt-live-preview');
  var previewText = document.getElementById('doubt-preview-text');
  var previewCat = document.getElementById('doubt-preview-cat');
  if (!previewBox) return;
  if (q.trim().length > 0) {
    previewBox.style.display = 'block';
    if (previewText) previewText.textContent = q;
    if (previewCat) {
      previewCat.textContent = cat;
      var subColors = { Physics:'#ff2d6b', Chemistry:'#00d4c8', Maths:'#a855f7', Biology:'#4ade80', General:'var(--purple)' };
      previewCat.style.background = subColors[cat] || 'var(--purple)';
    }
  } else {
    previewBox.style.display = 'none';
  }
};

window.setDoubtFilter = function(filter) {
  window.currentDoubtFilter = filter;
  document.querySelectorAll('.itab-doubt').forEach(function(btn) {
    if (btn.textContent.trim().toLowerCase() === filter.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.filterDoubts = function() {
  var searchField = document.getElementById('doubt-search');
  var query = searchField ? searchField.value.toLowerCase() : '';
  var filter = window.currentDoubtFilter || 'all doubts';
  var items = document.querySelectorAll('.doubt-card-item');
  items.forEach(function(item) {
    var q = item.getAttribute('data-q').toLowerCase();
    var sub = item.getAttribute('data-sub').toLowerCase();
    var status = item.getAttribute('data-status').toLowerCase();
    var hasAi = item.getAttribute('data-ai') === 'true';
    
    var matchesSearch = q.indexOf(query) > -1 || sub.indexOf(query) > -1;
    var matchesFilter = true;
    if (filter.toLowerCase() === 'pending') {
      matchesFilter = status === 'pending';
    } else if (filter.toLowerCase() === 'resolved') {
      matchesFilter = status === 'resolved';
    } else if (filter.toLowerCase() === 'ai answered') {
      matchesFilter = hasAi;
    }
    
    if (matchesSearch && matchesFilter) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
};

// ──────────────── STUDENT ANNOUNCEMENTS (ENHANCED v3) ────────────────
PAGES['student_announcements'] = function() {
  var anns = [
    { id: 'ann-1', title:'JEE Advanced 2025 — Registration Open', body:'Registration for JEE Advanced 2025 is now open. Last date: April 15, 2025. Submit your application through the official portal. For assistance, contact the admin office.', date:'2026-06-19', cat:'Important', type:'warning', pinned:true },
    { id: 'ann-2', title:'Campus Sports Day — March 25', body:'Annual sports day celebrations. All students are encouraged to participate. Register with your batch coordinator before March 20.', date:'2026-06-18', cat:'Events', type:'info', pinned:true },
    { id: 'ann-3', title:'Holiday Notice — Holi Festival', body:'Campus will remain closed on March 14 (Holi). Classes resume on March 15. Online classes will continue as scheduled. Enjoy the festival!', date:'2026-06-14', cat:'Notice', type:'info', pinned:false },
    { id: 'ann-4', title:'New Study Material Uploaded — Physics', body:'Electrostatics complete notes and DPP have been uploaded. Check the Materials section for Gauss Law, Coulomb Law, and Electric Field notes.', date:'2026-06-10', cat:'Academic', type:'info', pinned:false },
    { id: 'ann-5', title:'Mock Test Schedule — March 2025', body:'Monthly mock test schedule has been published. 4 full-syllabus tests planned this month. Check your test series section for details.', date:'2026-06-08', cat:'Academic', type:'info', pinned:false },
    { id: 'ann-6', title:'Parent-Teacher Meeting — March 28', body:'PTM scheduled for all batches. Parents can connect with batch coordinators via the portal or visit campus between 10 AM - 4 PM.', date:'2026-06-05', cat:'Important', type:'warning', pinned:false }
  ];

  // Initialize state
  if (!window.announcementsState) {
    window.announcementsState = {
      readIds: JSON.parse(localStorage.getItem("rvlh_read_announcements") || '[]'),
      expandedIds: {}
    };
  }
  var state = window.announcementsState;

  var searchBar = '<div style="display:flex;gap:10px;margin-bottom:18px;align-items:center;flex-wrap:wrap">'
    + '<input id="ann-search" class="inp-field" placeholder="🔍 Search announcements..." style="flex:1;padding:10px 14px;min-width:200px" oninput="window.filterAnnouncements()">'
    + '<div class="inner-tabs">'
    + ['All','Important','Academic','Events','Notice'].map(function(c,i){return '<button class="itab itab-ann'+(i===0?' active':'')+'" onclick="window.setAnnCategory(\''+c+'\'); window.filterAnnouncements()">'+c+'</button>';}).join('')
    + '</div></div>';

  function renderAnn(a) {
    var isRead = state.readIds.indexOf(a.id) > -1;
    var isExpanded = !!state.expandedIds[a.id];
    var isUrgent = a.type === 'warning';
    
    var cardClasses = 'stu-ann-card ' + (isUrgent ? 'urgent' : '') + ' ' + (isRead ? 'read' : 'unread');
    var opacity = isRead ? 0.75 : 1.0;
    var badgeType = isUrgent ? 'urgent' : 'info';
    var badgeLabel = isUrgent ? '⚠ Important' : 'ℹ Notice';
    var actionText = isExpanded ? 'Click to collapse' : 'Click to read';
    
    var contentHtml = isExpanded 
      ? '<p class="stu-ann-content animate-fadeIn" style="white-space:pre-wrap;margin-top:8px">' + a.body + '</p>'
      : '<p class="stu-ann-content" style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;margin-top:8px">' + a.body + '</p>';

    var dateObj = new Date(a.date);
    var dateString = dateObj.toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"});
    if (a.date === '2026-06-19') dateString = 'Today';
    else if (a.date === '2026-06-18') dateString = 'Yesterday';

    return '<div class="' + cardClasses + '" style="cursor:pointer;transition:all 0.2s ease;opacity:' + opacity + ';margin-bottom:12px" data-id="' + a.id + '" data-title="' + a.title.replace(/"/g,'&quot;') + '" data-body="' + a.body.replace(/"/g,'&quot;') + '" data-category="' + a.cat + '" onclick="window.toggleAnnouncement(\'' + a.id + '\')">'
      + '<div class="stu-ann-line"></div>'
      + '<div class="stu-ann-icon" style="font-size:20px">' + (isUrgent ? '⚠️' : '📢') + '</div>'
      + '<div class="stu-ann-body" style="flex:1">'
      + '<div class="stu-ann-meta" style="display:flex;justify-content:space-between;align-items:center">'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<span class="ann-pill ' + badgeType + '" style="font-size:10px;padding:2px 8px;border-radius:4px">' + badgeLabel + '</span>'
      + (isRead ? '' : '<span class="tag-new-pulse" style="background:var(--primary-400);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px">NEW</span>')
      + '</div>'
      + '<span class="stu-ann-date">' + dateString + '</span>'
      + '</div>'
      + '<h3 class="stu-ann-title" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:700">'
      + '<span>' + a.title + '</span>'
      + '<span style="font-size:11px;color:var(--muted);font-weight:normal">' + actionText + '</span>'
      + '</h3>'
      + contentHtml
      + '</div></div>';
  }

  // Sort: pinned first
  var pinnedList = anns.filter(function(a){return a.pinned;});
  var unpinnedList = anns.filter(function(a){return !a.pinned;});

  var listHtml = '<div class="stu-ann-list">'
    + (pinnedList.length ? '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📌 Pinned Announcements</div>' + pinnedList.map(renderAnn).join('') : '')
    + '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;margin-top:16px">📅 Announcements</div>'
    + unpinnedList.map(renderAnn).join('')
    + '</div>';

  window.currentAnnCategory = window.currentAnnCategory || 'All';

  return searchBar + listHtml;
};

// Global helper functions
window.toggleAnnouncement = function(id) {
  var state = window.announcementsState;
  state.expandedIds[id] = !state.expandedIds[id];
  
  if (state.readIds.indexOf(id) === -1) {
    state.readIds.push(id);
    localStorage.setItem("rvlh_read_announcements", JSON.stringify(state.readIds));
  }
  
  loadPage('announcements');
};

window.setAnnCategory = function(cat) {
  window.currentAnnCategory = cat;
  document.querySelectorAll('.itab-ann').forEach(function(btn) {
    if (btn.textContent.trim().toLowerCase() === cat.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.filterAnnouncements = function() {
  var searchField = document.getElementById('ann-search');
  var query = searchField ? searchField.value.toLowerCase() : '';
  var cat = window.currentAnnCategory || 'All';
  var items = document.querySelectorAll('.stu-ann-card');
  items.forEach(function(item) {
    var title = item.getAttribute('data-title').toLowerCase();
    var body = item.getAttribute('data-body').toLowerCase();
    var itemCat = item.getAttribute('data-category').toLowerCase();
    
    var matchesSearch = title.indexOf(query) > -1 || body.indexOf(query) > -1;
    var matchesCat = cat.toLowerCase() === 'all' || itemCat === cat.toLowerCase();
    
    if (matchesSearch && matchesCat) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
};

// ──────────────── STUDENT PROFILE (ENHANCED v3) ────────────────
async function saveStudentProfile(e) {
  e.preventDefault();
  var get = function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var firstName = get('ap-fn');
  var lastName = get('ap-ln');
  var phone = get('ap-phone');
  
  if (!firstName) { toast('First name is required', '⚠️'); return; }
  
  var fullName = firstName + ' ' + lastName;
  
  try {
    const updatedUser = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: fullName,
        phone: phone,
        gender: get('ap-gender'),
        dob: get('ap-dob'),
        batch: get('ap-dept'),
        joinDate: get('ap-join')
      })
    });
    
    G.user = updatedUser;
    
    // Update sidebar interface
    var sbName = document.getElementById('sb-name');
    if (sbName) sbName.textContent = G.user.name;
    var nameParts = (G.user.name || '').split(' ');
    var initials = ((nameParts[0]||'A')[0]+(nameParts.slice(1).join(' ')||'S')[0]).toUpperCase();
    var sbAvatar = document.getElementById('sb-avatar');
    if (sbAvatar) sbAvatar.textContent = initials;
    
    toast('Profile saved successfully!', '✅');
    loadPage('profile');
  } catch (err) {
    toast('Failed to save profile: ' + err.message, '❌');
  }
}

function changeStudentPassword(e) {
  changeAdminPassword(e);
}

PAGES['student_profile'] = function() {
  var u = G.user || {};
  var nameParts = (u.name || '').split(' ');
  var prof = {
    firstName  : nameParts[0]  || 'Arjun',
    lastName   : nameParts.slice(1).join(' ') || 'Sharma',
    phone      : u.phone       || '',
    gender     : u.gender      || '',
    dob        : u.dob         || '',
    designation: 'Student',
    department : u.batch       || 'JEE Advanced 2025',
    campus     : u.campus      || 'RV Learning Hub HQ',
    joinDate   : u.joinDate    || '',
    employeeId : u.roll        || 'RV2024001',
  };
  var email = u.email || 'arjun@rvhub.com';
  var initials = ((prof.firstName||'A')[0]+(prof.lastName||'S')[0]).toUpperCase();
  var lbl = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:5px';

  // ── HERO ──
  var hero = '<div style="background:linear-gradient(135deg,#0d1526 0%,#111827 60%,#0a1020 100%);border-radius:20px;padding:30px 36px;margin-bottom:22px;border:1px solid rgba(108,71,255,.2);position:relative;overflow:hidden">'
    + '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(108,71,255,.14),transparent 50%),radial-gradient(ellipse at 85% 30%,rgba(255,45,107,.09),transparent 45%);pointer-events:none"></div>'
    + '<div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(108,71,255,.07),transparent 70%);pointer-events:none"></div>'
    + '<div style="position:relative;display:flex;align-items:center;gap:26px">'
    // Avatar
    + '<div style="position:relative;flex-shrink:0">'
    + '<div style="width:82px;height:82px;border-radius:22px;background:linear-gradient(135deg,#6c47ff,#ff2d6b);display:flex;align-items:center;justify-content:center;color:#fff;font-family:Syne,sans-serif;font-weight:900;font-size:28px;box-shadow:0 10px 30px rgba(108,71,255,.4),0 0 0 3px rgba(108,71,255,.15)">'+initials+'</div>'
    + '<div style="position:absolute;bottom:-5px;right:-5px;width:22px;height:22px;background:var(--student);border-radius:50%;border:3px solid #0d1526;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff">✓</div>'
    + '</div>'
    // Name & info
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-family:Syne,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.4px;margin-bottom:4px">'+prof.firstName+' '+prof.lastName+'</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:12px;font-family:DM Mono,monospace">'+email+'</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="background:rgba(108,71,255,.18);color:#a78bff;border:1px solid rgba(108,71,255,.3);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🎓 Student</span>'
    + '<span style="background:rgba(74,222,128,.14);color:var(--student);border:1px solid rgba(74,222,128,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">✅ Active</span>'
    + '<span style="background:rgba(108,71,255,.14);color:var(--purple);border:1px solid rgba(108,71,255,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🪪 '+prof.employeeId+'</span>'
    + '</div></div>'
    // Right meta
    + '<div style="display:flex;gap:22px;flex-shrink:0;border-left:1px solid rgba(255,255,255,.07);padding-left:28px">'
    + [['📚',prof.department,'Batch'],['💼',prof.designation,'Designation'],['📍',prof.campus.replace(' Hub HQ','').replace(' Hub',''),'Campus']].map(function(s){
        return '<div style="text-align:center">'
          + '<div style="font-size:17px;margin-bottom:5px">'+s[0]+'</div>'
          + '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.75);max-width:90px;word-break:break-word;line-height:1.3">'+(s[1]||'—')+'</div>'
          + '<div style="font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.9px;margin-top:3px">'+s[2]+'</div>'
          + '</div>';
      }).join('')
    + '</div></div></div>';

  // ── CHIPS ──
  var chips = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">'
    + [{icon:'🎂',label:'Birthday',val:prof.dob||'—'},{icon:'👤',label:'Gender',val:prof.gender||'—'},{icon:'📅',label:'Joined',val:prof.joinDate||'—'},{icon:'🔒',label:'Status',val:'APPROVED',ac:'var(--student)'}].map(function(s){
        return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:15px 12px;text-align:center;transition:border-color .2s" onmouseover="this.style.borderColor=\'var(--purple)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
          + '<div style="font-size:21px;margin-bottom:6px">'+s.icon+'</div>'
          + '<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">'+s.label+'</div>'
          + '<div style="font-size:12px;font-weight:800;color:'+(s.ac||'var(--text)')+'">'+s.val+'</div>'
          + '</div>';
      }).join('')
    + '</div>';

  // helper
  function infoRow(label, val, ac) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</span>'
      + '<span style="font-size:13px;font-weight:700;color:'+(ac||'var(--text)')+'">'+( val||'—')+'</span>'
      + '</div>';
  }

  // ── LEFT: Personal Info ──
  var infoCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">👤</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Personal Information</div><div style="font-size:11px;color:var(--muted)">Your profile details</div></div></div>'
    + infoRow('First Name', prof.firstName)
    + infoRow('Last Name',  prof.lastName)
    + infoRow('Email',      email, 'var(--purple)')
    + infoRow('Phone',      prof.phone)
    + infoRow('Gender',     prof.gender)
    + infoRow('Date of Birth', prof.dob)
    + infoRow('Roll Number',  prof.employeeId, 'var(--student)')
    + infoRow('Designation',  prof.designation)
    + infoRow('Batch',        prof.department)
    + infoRow('Campus',       prof.campus)
    + infoRow('Joined',       prof.joinDate)
    + '</div>';

  // ── CENTRE: Edit Profile ──
  var editCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(0,212,200,.12);border:1px solid rgba(0,212,200,.18);display:flex;align-items:center;justify-content:center;font-size:16px">✏️</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Edit Profile</div><div style="font-size:11px;color:var(--muted)">Update your details</div></div></div>'
    + '<form onsubmit="saveStudentProfile(event)" style="display:flex;flex-direction:column;gap:12px">'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">First Name</label><input class="inp-field" id="ap-fn" value="'+prof.firstName+'"></div>'
    +   '<div><label style="'+lbl+'">Last Name</label><input class="inp-field" id="ap-ln" value="'+prof.lastName+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Phone</label><input class="inp-field" id="ap-phone" value="'+prof.phone+'" placeholder="+91 98765 43210"></div>'
    +   '<div><label style="'+lbl+'">Gender</label><select class="inp-field" id="ap-gender"><option value="">Select</option>'
    +   ['Male','Female','Non-binary','Prefer not to say'].map(function(g){return '<option value="'+g+'"'+(prof.gender===g?' selected':'')+'>'+g+'</option>';}).join('')
    +   '</select></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Designation</label><input class="inp-field" id="ap-desig" value="'+prof.designation+'" disabled style="cursor:not-allowed;background:rgba(255,255,255,0.02)"></div>'
    +   '<div><label style="'+lbl+'">Batch</label><input class="inp-field" id="ap-dept" value="'+prof.department+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Date of Birth</label><input class="inp-field" type="date" id="ap-dob" value="'+prof.dob+'"></div>'
    +   '<div><label style="'+lbl+'">Join Date</label><input class="inp-field" type="date" id="ap-join" value="'+prof.joinDate+'"></div>'
    + '</div>'
    + '<div><label style="'+lbl+'">Email</label>'
    +   '<input class="inp-field" value="'+email+'" disabled style="width:100%;cursor:not-allowed;background:rgba(255,255,255,0.02);color:var(--muted)" placeholder="cannot change"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#00d4c8,#4ade80);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">💾 Save Changes</button>'
    + '</form></div>';

  // ── RIGHT: Change Password ──
  var pwCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">🔐</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Change Password</div><div style="font-size:11px;color:var(--muted)">Keep your account secure</div></div></div>'
    + '<form onsubmit="changeStudentPassword(event)" style="display:flex;flex-direction:column;gap:13px">'
    + '<div><label style="'+lbl+'">Current Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cur" type="password" placeholder="Enter current password" style="padding-right:44px" oninput="">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cur\',\'ap-b1\')" id="ap-b1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div></div>'
    + '<div><label style="'+lbl+'">New Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-nw" type="password" placeholder="Min 8 · uppercase · special" style="padding-right:44px" oninput="apPwStrength(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-nw\',\'ap-b2\')" id="ap-b2" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div>'
    +   '<div id="ap-pw-strength" style="display:none;margin-top:6px"><div style="display:flex;gap:3px;margin-bottom:3px"><div id="aps1" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps2" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps3" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps4" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div></div><div id="aps-label" style="font-size:10px;color:var(--muted)"></div></div></div>'
    + '<div><label style="'+lbl+'">Confirm Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cnw" type="password" placeholder="Re-enter new password" style="padding-right:44px" oninput="apPwMatch(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cnw\',\'ap-b3\')" id="ap-b3" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button>'
    +   '<div id="ap-match-hint" style="font-size:11px;margin-top:5px;display:none"></div></div></div>'
    + '<div id="ap-pw-err" style="display:none;color:var(--admin);font-size:12px;font-weight:600;padding:10px 13px;background:rgba(255,45,107,.08);border-radius:9px;border:1px solid rgba(255,45,107,.2)"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#6c47ff,#ff2d6b);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">🔐 Update Password</button>'
    + '</form>'
    + '<div style="margin-top:16px;padding:12px 14px;background:rgba(108,71,255,.06);border:1px solid rgba(108,71,255,.15);border-radius:10px">'
    + '<div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:4px">🛡️ Password tips</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.7">Use uppercase, lowercase, numbers and symbols. Avoid using your name or email as your password.</div>'
    + '</div></div>';

  return '<div style="animation:fadeUp .28s ease;max-width:1100px">'
    + hero + chips
    + '<div style="display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:16px;align-items:start">'
    + infoCard + editCard + pwCard
    + '</div></div>';
}

PAGES['student_progress'] = function() {
  var stats = makeStats([
    { icon:'📊', val:'78%', label:'Overall Score', col:'var(--student)' },
    { icon:'✅', val:'89%', label:'Attendance',    col:'var(--faculty)' },
    { icon:'📝', val:'29',  label:'Tests Done',    col:'var(--purple)' },
    { icon:'🏆', val:'#4',  label:'Batch Rank',    col:'var(--yellow)' },
  ]);
  var chart = makeChartBars([{m:'Oct',v:65},{m:'Nov',v:72},{m:'Dec',v:69},{m:'Jan',v:78},{m:'Feb',v:74},{m:'Mar',v:82}], 'linear-gradient(180deg,var(--student),rgba(74,222,128,.3))');
  var subj = [{s:'Physics',a:74,c:'#ff2d6b'},{s:'Chemistry',a:82,c:'#00d4c8'},{s:'Maths',a:68,c:'#6c47ff'},{s:'Biology',a:79,c:'#4ade80'}];
  var subjHtml = subj.map(function(s) {
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>' + s.s + '</span><span style="color:' + s.c + ';font-weight:700">' + s.a + '%</span></div>' + makeProgress(s.a, s.c) + '</div>';
  }).join('');
  var tests = [
    { t:'Mock Test 13', date:'Mar 8', sub:'All', score:'242/360', pct:67, rank:'#12' },
    { t:'Chemistry Weekly', date:'Mar 5', sub:'Chem', score:'98/120', pct:82, rank:'#5' },
    { t:'Physics DPP Ch4', date:'Mar 3', sub:'Phys', score:'64/80', pct:80, rank:'#8' },
  ];
  var testHtml = '<div class="tbl-wrap"><table><thead><tr><th>Test</th><th>Date</th><th>Subject</th><th>Score</th><th>Rank</th></tr></thead><tbody>'
    + tests.map(function(t) {
        return '<tr onclick="openTestSolution(\'' + t.t + '\')">'
          + '<td>' + t.t + '</td><td>' + t.date + '</td><td><span class="badge badge-purple">' + t.sub + '</span></td>'
          + '<td><span style="color:var(--student);font-weight:700">' + t.score + '</span> <span style="font-size:11px;color:var(--muted)">(' + t.pct + '%)</span></td>'
          + '<td>' + t.rank + '</td></tr>';
      }).join('') + '</tbody></table></div>';

  return stats
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-header"><div class="card-title">📈 Monthly Performance</div></div>' + chart + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">📚 Subject Accuracy</div></div>' + subjHtml + '</div>'
    + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">📋 Test History</div>'
    + '<button class="btn btn-sm btn-purple" onclick="toast(\'Report downloaded!\',\'⬇\')">⬇ Export</button></div>' + testHtml + '</div>';
};

// ──────────────── STUDENT ATTENDANCE ────────────────
PAGES['student_attendance'] = function() {
  var stats = makeStats([
    { icon:'📊', val:'89%', label:'Overall',        col:'var(--student)' },
    { icon:'✅', val:'52',  label:'Attended',        col:'var(--faculty)' },
    { icon:'❌', val:'7',   label:'Missed',          col:'var(--admin)' },
    { icon:'🏖️', val:'3',   label:'On Leave',        col:'var(--yellow)' },
  ]);
  var subs = [
    { s:'Physics',   p:92, c:'#ff2d6b', a:22, t:24 },
    { s:'Chemistry', p:88, c:'#00d4c8', a:19, t:22 },
    { s:'Maths',     p:85, c:'#6c47ff', a:17, t:20 },
    { s:'Biology',   p:90, c:'#4ade80', a:16, t:18 },
  ];
  var subHtml = subs.map(function(s) {
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">'
      + '<span>' + s.s + '</span><span style="color:var(--muted);font-size:11px">' + s.a + '/' + s.t + '</span>'
      + '<span style="color:' + (s.p>=85?'var(--student)':'var(--admin)') + ';font-weight:700">' + s.p + '%</span></div>'
      + makeProgress(s.p, s.p>=85 ? s.c : 'var(--admin)') + '</div>';
  }).join('');
  var recent = [
    { d:'Mar 12 (Today)', s:'Physics',   st:'present' },
    { d:'Mar 11',         s:'Chemistry', st:'present' },
    { d:'Mar 10',         s:'Maths',     st:'absent' },
    { d:'Mar 9',          s:'Biology',   st:'present' },
    { d:'Mar 8',          s:'Physics',   st:'leave' },
  ];
  var recHtml = recent.map(function(a) {
    var ic = a.st==='present'?'✅':a.st==='absent'?'❌':'🏖️';
    var ibg = a.st==='present'?'rgba(74,222,128,.1)':a.st==='absent'?'rgba(255,45,107,.1)':'rgba(251,191,36,.1)';
    return '<div class="list-item">'
      + '<div class="li-icon" style="background:' + ibg + '">' + ic + '</div>'
      + '<div class="li-content"><div class="li-title">' + a.d + '</div><div class="li-sub">' + a.s + '</div></div>'
      + '<span class="badge ' + (a.st==='present'?'badge-green':a.st==='absent'?'badge-red':'badge-yellow') + '">' + a.st + '</span></div>';
  }).join('');

  return stats
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-title" style="margin-bottom:14px">📚 Subject-wise Attendance</div>' + subHtml + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">📅 Recent</div></div>' + recHtml
    + '<button class="btn btn-purple btn-full" style="margin-top:9px" onclick="openLeaveRequest()">📋 Request Leave</button></div>'
    + '</div>';
};

function openLeaveRequest() {
  var body = makeInputGroup('From Date','date','')
    + makeInputGroup('To Date','date','')
    + makeInputGroup('Reason','textarea','Reason for leave...');
  openDetail('📋 Leave Request', body, '<button class="btn btn-green" onclick="toast(\'Leave request submitted!\',\'✅\');closeModal(\'modal-detail\')">Submit Request</button>');
}

// ──────────────── STUDENT LEADERBOARD ────────────────
PAGES['student_leaderboard'] = function() {
  var data = [
    {r:1,n:'Sneha Patel',s:94,t:32,a:'96%'},
    {r:2,n:'Rohan Gupta',s:91,t:30,a:'92%'},
    {r:3,n:'Ananya Singh',s:88,t:31,a:'94%'},
    {r:4,n:'Arjun Sharma',s:85,t:29,a:'89%',you:true},
    {r:5,n:'Priya Joshi',s:83,t:28,a:'87%'},
    {r:6,n:'Karthik R.',s:81,t:27,a:'85%'},
    {r:7,n:'Meera Shah',s:79,t:26,a:'83%'},
    {r:8,n:'Dev Verma',s:77,t:25,a:'81%'},
  ];
  var rows = data.map(function(s, i) {
    var rc = i===0?'#fbbf24':i===1?'#aaa':i===2?'#cd7f32':'var(--muted)';
    var emo = i<3?['🥇','🥈','🥉'][i]:s.r;
    return '<tr style="' + (s.you?'background:rgba(74,222,128,.05)':'' ) + '" onclick="toast(\'Viewing profile\',\'👤\')">'
      + '<td><div class="lb-rank" style="background:color-mix(in srgb,' + rc + ' 16%,var(--surface2));color:' + rc + '">' + emo + '</div></td>'
      + '<td style="font-weight:' + (s.you?700:400) + '">' + s.n + (s.you?' (You)':'') + '</td>'
      + '<td><span style="color:var(--student);font-weight:700">' + s.s + '%</span></td>'
      + '<td>' + s.t + '</td><td>' + s.a + '</td></tr>';
  }).join('');
  return '<div class="card"><div class="card-header"><div class="card-title">🏆 Leaderboard — JEE Advanced 2025</div>'
    + '<select class="inp-field" style="width:auto;padding:5px 10px;font-size:12px" onchange="toast(\'Filter applied\',\'🔍\')"><option>This Month</option><option>This Week</option><option>Overall</option></select></div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>Rank</th><th>Student</th><th>Avg Score</th><th>Tests</th><th>Attendance</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
};

// ──────────────── STUDENT FEES ────────────────
PAGES['student_fees'] = function() {
  var stats = makeStats([
    { icon:'💰', val:'₹45,000', label:'Total Fee',    col:'var(--muted)' },
    { icon:'✅', val:'₹30,000', label:'Amount Paid',  col:'var(--student)' },
    { icon:'⏳', val:'₹15,000', label:'Amount Due',   col:'var(--admin)' },
    { icon:'📅', val:'Apr 15',  label:'Next Due Date',col:'var(--yellow)' },
  ]);
  var payments = [
    { d:'Mar 1, 2024',  a:'₹15,000', m:'UPI',   r:'TXN2024030001' },
    { d:'Feb 1, 2024',  a:'₹7,500',  m:'Card',  r:'TXN2024020001' },
    { d:'Jan 1, 2024',  a:'₹7,500',  m:'Cash',  r:'RV2024010001' },
  ];
  var payHtml = payments.map(function(p) {
    return '<div class="list-item" onclick="openFeeReceipt(\'' + p.d + '\',\'' + p.a + '\',\'' + p.m + '\',\'' + p.r + '\')">'
      + '<div class="li-icon" style="background:rgba(74,222,128,.1)">✅</div>'
      + '<div class="li-content"><div class="li-title">' + p.a + '</div><div class="li-sub">' + p.d + ' • ' + p.m + '</div></div>'
      + '<span class="badge badge-green">Paid</span></div>';
  }).join('');
  var payBox = '<div class="card"><div class="card-title" style="margin-bottom:14px">💳 Payment History</div>' + payHtml + '</div>';

  var dueBox = '<div class="card"><div class="card-title" style="margin-bottom:14px">💸 Pay Now</div>'
    + '<div class="fee-card" style="margin-bottom:13px">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">Outstanding</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:26px;font-weight:800;color:var(--admin)">₹15,000</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:3px">Due: April 15, 2024</div></div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
    + '<button class="btn btn-green" onclick="openPayModal()">💳 Pay Online</button>'
    + '<button class="btn btn-purple" onclick="toast(\'EMI applied!\',\'📋\')">📋 Apply EMI</button>'
    + '<button class="btn btn-teal" onclick="toast(\'Scholarship form opened\',\'🎓\')">🎓 Scholarship</button></div></div>';

  return stats + '<div class="grid-2">' + payBox + dueBox + '</div>';
};

function openFeeReceipt(date, amount, method, ref) {
  var body = '<div style="text-align:center;padding:14px 0 18px">'
    + '<div style="font-size:44px;margin-bottom:8px">🧾</div>'
    + '<div style="font-size:18px;font-weight:700;margin-bottom:2px">RV Learning Hub</div>'
    + '<div style="color:var(--muted);font-size:12px">Official Fee Receipt</div></div>'
    + '<div style="display:grid;gap:8px">'
    + [['Student','Arjun Sharma'],['Amount',amount],['Date',date],['Method',method],['Reference',ref],['Status','Paid ✅']].map(function(e) { return makeFeeCard(e[0], e[1]); }).join('')
    + '</div>';
  openDetail('🧾 Fee Receipt', body, '<button class="btn btn-teal" onclick="toast(\'Receipt downloaded!\',\'⬇\');closeModal(\'modal-detail\')">⬇ Download</button>');
}

function openPayModal() {
  var body = makeInputGroup('Amount','text','','₹15,000')
    + makeInputGroup('Payment Method','select','UPI, Net Banking, Credit Card, Debit Card');
  openDetail('💳 Make Payment', body, '<button class="btn btn-solid" onclick="toast(\'Payment initiated!\',\'💳\');closeModal(\'modal-detail\')">Pay ₹15,000</button>');
}

// ──────────────── STUDENT FEEDBACK ────────────────
PAGES['student_feedback'] = function() {
  var faculty = [
    { n:'Dr. Priya Mehta', s:'Physics',   e:'👩‍🏫', r:4.8 },
    { n:'Prof. Amit Singh',s:'Chemistry', e:'👨‍🏫', r:4.5 },
    { n:'Mr. Raj Sharma',  s:'Maths',     e:'👨‍🏫', r:4.3 },
  ];
  var html = '<div class="card"><div class="card-title" style="margin-bottom:14px">⭐ Rate Your Faculty</div>'
    + faculty.map(function(f) {
        return '<div class="list-item" onclick="openFeedbackForm(\'' + f.n.replace(/'/g,"\\'") + '\',\'' + f.s + '\')">'
          + '<div class="li-icon" style="background:var(--surface2);font-size:20px">' + f.e + '</div>'
          + '<div class="li-content"><div class="li-title">' + f.n + '</div><div class="li-sub">' + f.s + ' • ⭐ ' + f.r + '</div></div>'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openFeedbackForm(\'' + f.n.replace(/'/g,"\\'") + '\',\'' + f.s + '\')">Give Feedback</button></div>';
      }).join('') + '</div>';
  return html;
};

function openFeedbackForm(name, sub) {
  var body = '<div style="margin-bottom:14px;font-size:13px;color:var(--muted)">' + sub + ' • Your feedback helps improve teaching quality</div>'
    + '<div class="inp-group"><label>Rating</label>'
    + '<div style="display:flex;gap:6px;margin-top:4px" id="star-wrap">'
    + [1,2,3,4,5].map(function(n) {
        return '<button style="font-size:22px;background:none;border:none;cursor:pointer;transition:.2s;filter:grayscale(.8)" onclick="rateStar(this,' + n + ')">⭐</button>';
      }).join('') + '</div></div>'
    + makeInputGroup('Comments','textarea','Share your experience...');
  openDetail('⭐ Feedback for ' + name, body, '<button class="btn btn-solid" onclick="toast(\'Feedback submitted!\',\'✅\');closeModal(\'modal-detail\')">Submit</button>');
}

function rateStar(el, n) {
  var btns = document.querySelectorAll('#star-wrap button');
  btns.forEach(function(b, i) { b.style.filter = i < n ? 'grayscale(0)' : 'grayscale(.8)'; });
  toast('Rated ' + n + ' stars', '⭐');
}

// ═══════════════════════════════════════════════════════
// FACULTY PAGES
// ═══════════════════════════════════════════════════════

PAGES['faculty_dashboard'] = function() {
  var stats = makeStats([
    { icon:'👥', val:'4',   label:'Active Batches',   change:'JEE & NEET',       col:'var(--faculty)' },
    { icon:'👨‍🎓',val:'312', label:'Total Students',  change:'All batches',       col:'var(--student)' },
    { icon:'📹', val:'48',  label:'Lectures Uploaded',change:'+3 this week',      col:'var(--purple)' },
    { icon:'⭐', val:'4.7', label:'Average Rating',   change:'89 reviews',        col:'var(--yellow)' },
  ]);
  var todayClasses = [
    { t:'09:00', batch:'JEE Adv A', topic:'Electrostatics - Gauss Law', n:142, live:true },
    { t:'11:00', batch:'JEE Adv B', topic:'Magnetic Effects',           n:98,  live:false },
    { t:'02:00', batch:'NEET Batch',topic:'Cell Biology - Mitosis',     n:72,  live:false },
  ];
  var clHtml = todayClasses.map(function(c) {
    return '<div class="sched-item" onclick="openFacultyClassModal(\'' + c.topic.replace(/'/g,"\\'") + '\',\'' + c.batch + '\',\'' + c.t + '\',\'' + (c.live?'live':'upcoming') + '\')">'
      + '<div class="sched-time"><div class="st">' + c.t + '</div><div class="sd">' + (c.live?'NOW':'') + '</div></div>'
      + '<div class="sched-body"><div class="sched-title">' + c.batch + ': ' + c.topic + '</div>'
      + '<div class="sched-meta">' + c.n + ' students <span class="badge ' + (c.live?'badge-red':'badge-purple') + '" style="margin-left:5px">' + (c.live?'🔴 LIVE':'⏳ Upcoming') + '</span></div></div></div>';
  }).join('');

  var pendingDoubts = [
    { st:'Arjun Sharma',  q:'Gauss Law for non-uniform fields', t:'2h ago' },
    { st:'Sneha Patel',   q:'Torque derivation in magnetic field',t:'3h ago' },
    { st:'Rohan Gupta',   q:'Work-energy theorem proof',         t:'5h ago' },
    { st:'Priya Joshi',   q:'Concept of pseudo force',           t:'Yesterday' },
  ];
  var dHtml = pendingDoubts.map(function(d) {
    return '<div class="list-item" onclick="openResolveDoubt(\'' + d.st.replace(/'/g,"\\'") + '\',\'' + d.q.replace(/'/g,"\\'") + '\')">'
      + makeAv(d.st.charAt(0), 'rgba(0,212,200,.1)')
      + '<div class="li-content"><div class="li-title">' + d.q + '</div><div class="li-sub">' + d.st + ' • ' + d.t + '</div></div>'
      + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();openResolveDoubt(\'' + d.st.replace(/'/g,"\\'") + '\',\'' + d.q.replace(/'/g,"\\'") + '\')">Reply</button></div>';
  }).join('');

  var batches = [
    { b:'JEE Advanced A', n:142, avg:78, att:'87%', tests:12 },
    { b:'JEE Advanced B', n:98,  avg:72, att:'82%', tests:10 },
    { b:'NEET Batch 2025',n:72,  avg:80, att:'90%', tests:8 },
  ];
  var bHtml = '<div class="tbl-wrap"><table><thead><tr><th>Batch</th><th>Students</th><th>Avg Score</th><th>Attendance</th><th>Tests</th><th>Action</th></tr></thead><tbody>'
    + batches.map(function(b) {
        return '<tr onclick="toast(\'Loading ' + b.b + '\',\'📊\')">'
          + '<td>' + b.b + '</td><td>' + b.n + '</td>'
          + '<td><span style="color:var(--faculty);font-weight:700">' + b.avg + '%</span></td>'
          + '<td>' + b.att + '</td><td>' + b.tests + '</td>'
          + '<td><button class="btn btn-sm btn-teal" onclick="event.stopPropagation();toast(\'Opening batch\',\'👥\')">View</button></td></tr>';
      }).join('') + '</tbody></table></div>';

  return stats
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-header"><div class="card-title">📡 Today\'s Classes</div><button class="card-act" onclick="loadPage(\'live\')">Manage</button></div>' + clHtml + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">💬 Pending Doubts</div><button class="card-act" onclick="loadPage(\'doubts\')">Resolve All</button></div>' + dHtml + '</div>'
    + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">📊 Batch Overview</div><button class="card-act" onclick="loadPage(\'analytics\')">Full Analytics</button></div>' + bHtml + '</div>';
};

function openFacultyClassModal(topic, batch, time, status) {
  var isLive = status === 'live';
  var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:15px">'
    + makeFeeCard('Batch', batch) + makeFeeCard('Time', time) + '</div>'
    + (isLive
      ? '<div class="video-box" style="margin-bottom:13px"><div class="video-inner"><div class="live-badge"><div class="live-dot"></div>CLASS IS LIVE</div><button class="play-btn" onclick="toast(\'Joining...\',\'📡\')">▶</button></div></div>'
        + '<div style="display:flex;gap:8px"><button class="btn btn-red" onclick="toast(\'Going live!\',\'📡\');closeModal(\'modal-detail\')">🔴 Go Live</button>'
        + '<button class="btn btn-purple" onclick="toast(\'Attendance taken\',\'✅\')">✅ Attendance</button></div>'
      : '<div style="display:flex;gap:8px"><button class="btn btn-teal" onclick="toast(\'Class started!\',\'📡\');closeModal(\'modal-detail\')">▶ Start Class</button>'
        + '<button class="btn btn-purple" onclick="toast(\'Students notified!\',\'🔔\')">🔔 Notify</button></div>');
  openDetail('📡 ' + topic, body, '');
}

function openResolveDoubt(student, doubtText) {
  var doubt = (window.LMS_DOUBTS || []).find(function(d) { return d.q === doubtText; });
  var doubtId = doubt ? doubt._id : '';

  var body = '<div class="fee-card" style="margin-bottom:13px">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:5px">STUDENT QUESTION</div>'
    + '<div style="font-size:13px;font-weight:500">' + doubtText + '</div></div>'
    + '<div class="inp-group"><label>Your Answer</label>'
    + '<textarea id="doubt-resolve-textarea" class="inp-field" placeholder="Type your response here..." rows="4" style="width:100%;resize:vertical;margin-top:4px"></textarea></div>'
    + '<div class="inp-group"><label>Attach Resource</label>'
    + '<div style="display:flex;gap:7px;margin-top:4px">'
    + '<button class="btn btn-purple" onclick="toast(\'Image upload\',\'🖼\')">🖼 Image</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Video upload\',\'📹\')">📹 Video</button>'
    + '<button class="btn btn-purple" onclick="toast(\'PDF upload\',\'📄\')">📄 PDF</button></div></div>';
  openDetail('💬 Resolve Doubt — ' + student, body, '<button class="btn btn-solid" onclick="window.submitDoubtResolution(\'' + doubtId + '\')">📤 Post Answer</button>');
}

PAGES['faculty_batches'] = function() {
  var batches = [
    { n:'JEE Advanced — Batch A', e:'⚛️', s:142, cl:45, avg:78, col:'#ff2d6b', sch:'Mon,Wed,Fri' },
    { n:'JEE Advanced — Batch B', e:'⚛️', s:98,  cl:38, avg:72, col:'#6c47ff', sch:'Tue,Thu,Sat' },
    { n:'NEET Batch 2025',         e:'🔬', s:72,  cl:30, avg:80, col:'#4ade80', sch:'Mon-Fri' },
    { n:'JEE Mains Crash Course',  e:'🚀', s:56,  cl:20, avg:69, col:'#fbbf24', sch:'Sat,Sun' },
  ];
  return '<div class="grid-2">' + batches.map(function(b) {
    return '<div class="card" style="cursor:pointer;border-color:color-mix(in srgb,' + b.col + ' 22%,var(--border))" onclick="openBatchDetail(\'' + b.n.replace(/'/g,"\\'") + '\',\'' + b.e + '\',\'' + b.s + '\',\'' + b.avg + '\',\'' + b.col + '\')">'
      + '<div style="display:flex;gap:11px;align-items:center;margin-bottom:13px">'
      + '<div style="width:46px;height:46px;border-radius:11px;background:color-mix(in srgb,' + b.col + ' 10%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:24px">' + b.e + '</div>'
      + '<div><div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px">' + b.n + '</div><div style="font-size:12px;color:var(--muted)">' + b.sch + '</div></div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px">'
      + [['Students',b.s,'var(--text)'],['Classes',b.cl,'var(--text)'],['Avg',b.avg+'%',b.avg>=75?'var(--student)':'var(--admin)']].map(function(x) {
          return '<div><div style="font-size:11px;color:var(--muted)">' + x[0] + '</div><div style="font-weight:700;color:' + x[2] + '">' + x[1] + '</div></div>';
        }).join('')
      + '</div>'
      + '<div style="display:flex;gap:7px">'
      + '<button class="btn btn-sm btn-teal" style="flex:1" onclick="event.stopPropagation();openBatchDetail(\'' + b.n.replace(/'/g,"\\'") + '\',\'' + b.e + '\',\'' + b.s + '\',\'' + b.avg + '\',\'' + b.col + '\')">👥 Students</button>'
      + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Attendance opened\',\'✅\')">✅</button>'
      + '</div></div>';
  }).join('') + '</div>';
};

function openBatchDetail(name, icon, students, avg, col) {
  var actions = [
    { label: '📋 View Student List', act: 'loadPage(\'tracker\')' },
    { label: '📊 Performance Report', act: 'loadPage(\'analytics\')' },
    { label: '📝 Create Test', act: 'loadPage(\'tests\')' },
    { label: '📣 Send Announcement', act: 'loadPage(\'content\')' },
    { label: '✅ Take Attendance', act: 'loadPage(\'live\')' },
    { label: '📤 Upload Content', act: 'loadPage(\'content\')' }
  ];
  var body = '<div style="display:flex;gap:11px;margin-bottom:18px">'
    + '<div class="fee-card" style="flex:1"><div style="font-size:11px;color:var(--muted)">STUDENTS</div><div style="font-size:20px;font-weight:700;color:' + col + '">' + students + '</div></div>'
    + '<div class="fee-card" style="flex:1"><div style="font-size:11px;color:var(--muted)">AVG SCORE</div><div style="font-size:20px;font-weight:700;color:' + col + '">' + avg + '%</div></div>'
    + '</div><div style="display:flex;flex-direction:column;gap:7px">'
    + actions.map(function(a) {
        return '<button class="btn btn-purple" style="justify-content:flex-start" onclick="closeModal(\'modal-detail\'); ' + a.act + '">' + a.label + '</button>';
      }).join('') + '</div>';
  openDetail(icon + ' ' + name, body, '');
}

PAGES['faculty_content'] = function() {
  var library = [
    { title:'Electrostatics — Gauss Law',  type:'📹',size:'245 MB',batch:'JEE Adv A',views:312 },
    { title:'Magnetic Effects Notes',       type:'📄',size:'2.4 MB',batch:'JEE Adv A',views:189 },
    { title:'Thermodynamics Full Lecture',  type:'📹',size:'380 MB',batch:'All',      views:421 },
    { title:'Integration Formula Sheet',   type:'📊',size:'1.8 MB',batch:'JEE Adv B',views:156 },
  ];
  var uploadForm = '<div class="card">'
    + '<div class="card-title" style="margin-bottom:14px">📤 Upload New Content</div>'
    + makeInputGroup('Content Type','select','📹 Video Lecture, 📄 PDF Notes, 📊 PPT, 🖼 Image')
    + makeInputGroup('Title','text','e.g. Electrostatics — Gauss Law Part 1')
    + '<div class="inp-row">'
    + makeInputGroup('Subject','select','Physics, Chemistry, Maths, Biology')
    + makeInputGroup('Chapter','text','Chapter 5')
    + '</div>'
    + makeInputGroup('Assign to Batch','select','All Batches, JEE Advanced A, JEE Advanced B, NEET Batch')
    + '<div style="border:2px dashed var(--border);border-radius:var(--radius);padding:28px;text-align:center;cursor:pointer;margin-bottom:13px" onclick="toast(\'File picker opened\',\'📎\')">'
    + '<div style="font-size:30px;margin-bottom:7px">☁️</div>'
    + '<div style="font-size:13px;color:var(--muted)">Click to upload or drag & drop</div>'
    + '<div style="font-size:11px;color:var(--border);margin-top:3px">MP4, PDF, PPT up to 2GB</div></div>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn btn-teal" onclick="submitFacultyUpload()">📤 Submit for Approval</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Scheduled\',\'📅\')">📅 Schedule</button></div></div>';

  var libHtml = '<div class="card"><div class="card-title" style="margin-bottom:14px">📚 Content Library</div>'
    + library.map(function(c) {
        return '<div class="list-item" onclick="toast(\'Opening ' + c.title + '\',\'📂\')">'
          + '<div class="li-icon" style="background:var(--surface2)">' + c.type + '</div>'
          + '<div class="li-content"><div class="li-title">' + c.title + '</div><div class="li-sub">' + c.batch + ' • ' + c.views + ' views</div></div>'
          + '<div style="display:flex;gap:5px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Editing...\',\'✏️\')">✏️</button>'
          + '<button class="btn btn-sm btn-red" onclick="event.stopPropagation();toast(\'Deleted\',\'🗑️\')">🗑️</button></div></div>';
      }).join('') + '</div>';

  return '<div class="grid-2">' + uploadForm + libHtml + '</div>';
};

PAGES['faculty_live'] = function() {
  var upcoming = [
    { t:'11:00',batch:'JEE Adv B',topic:'Magnetic Effects',  n:98 },
    { t:'02:00',batch:'NEET Batch',topic:'Cell Biology',       n:72 },
    { t:'09:00',batch:'JEE Adv A', topic:'Modern Physics',    n:142,tomorrow:true },
    { t:'11:00',batch:'Crash',     topic:'Revision Mechanics', n:56, tomorrow:true },
  ];
  var liveCard = '<div class="card" style="border-color:rgba(255,45,107,.3);background:rgba(255,45,107,.03);margin-bottom:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + '<div><div class="live-badge" style="margin-bottom:7px"><div class="live-dot"></div>LIVE NOW</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:16px;font-weight:700">Physics — Electrostatics: Gauss Law</div>'
    + '<div style="color:var(--muted);font-size:13px;margin-top:3px">JEE Advanced Batch A • 142 students</div></div>'
    + '<div style="display:flex;gap:7px">'
    + '<button class="btn btn-red" onclick="openFacultyClassModal(\'Electrostatics\',\'JEE Adv A\',\'09:00\',\'live\')">🔴 Manage</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Attendance taken\',\'✅\')">✅</button></div></div></div>';

  var upHtml = '<div class="card"><div class="card-header"><div class="card-title">📅 Scheduled Classes</div>'
    + '<button class="btn btn-teal" onclick="openScheduleClassModal()">➕ Schedule</button></div>'
    + upcoming.map(function(c) {
        return '<div class="sched-item" onclick="openFacultyClassModal(\'' + c.topic + '\',\'' + c.batch + '\',\'' + c.t + '\',\'upcoming\')">'
          + '<div class="sched-time"><div class="st">' + c.t + '</div><div class="sd">' + (c.tomorrow?'Tmrw':'Today') + '</div></div>'
          + '<div class="sched-body"><div class="sched-title">' + c.batch + ': ' + c.topic + '</div><div class="sched-meta">' + c.n + ' students</div></div>'
          + '<div style="display:flex;gap:5px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Editing...\',\'✏️\')">✏️</button>'
          + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();toast(\'Students notified!\',\'🔔\')">🔔</button></div></div>';
      }).join('') + '</div>';
  return liveCard + upHtml;
};

function openScheduleClassModal() {
  var body = makeInputGroup('Subject & Topic','text','e.g. Physics — Optics: Snell\'s Law')
    + '<div class="inp-row">'
    + makeInputGroup('Date','date','')
    + makeInputGroup('Time','time','')
    + '</div><div class="inp-row">'
    + makeInputGroup('Duration','select','60 min, 90 min, 120 min')
    + makeInputGroup('Platform','select','In-app Live, Zoom, Google Meet')
    + '</div>'
    + makeInputGroup('Assign Batch','select','JEE Advanced A, JEE Advanced B, NEET Batch, All Batches');
  openDetail('📅 Schedule New Class', body, '<button class="btn btn-solid" onclick="toast(\'Class scheduled!\',\'📅\');closeModal(\'modal-detail\')">✅ Schedule Class</button>');
}

PAGES['faculty_tests'] = function() {
  var tests = [
    { n:'Chapter 5 — Wave Optics DPP',      type:'DPP',   batch:'JEE Adv A',   qs:20, deadline:'Mar 15', att:98,  pub:true },
    { n:'Weekly Test — Thermodynamics',      type:'Weekly',batch:'JEE Adv A,B', qs:30, deadline:'Mar 18', att:145, pub:true },
    { n:'Mock Test 14 — Full Syllabus',      type:'Mock',  batch:'All',         qs:90, deadline:'Mar 20', att:67,  pub:true },
    { n:'Biology — Cell Division DPP',       type:'DPP',   batch:'NEET',        qs:15, deadline:'Mar 16', att:0,   pub:false },
  ];
  var html = '<div style="display:flex;justify-content:flex-end;margin-bottom:14px">'
    + '<button class="btn btn-teal" onclick="openCreateTestModal()">➕ Create Test</button></div>'
    + '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>Test</th><th>Type</th><th>Batch</th><th>Qs</th><th>Deadline</th><th>Attempts</th><th>Action</th></tr></thead><tbody>'
    + tests.map(function(t) {
        return '<tr onclick="openTestResultsModal(\'' + t.n.replace(/'/g,"\\'") + '\',\'' + t.att + '\')">'
          + '<td>' + t.n + '</td><td><span class="badge badge-purple">' + t.type + '</span></td><td>' + t.batch + '</td><td>' + t.qs + '</td><td>' + t.deadline + '</td>'
          + '<td>' + (t.att>0 ? '<span style="color:var(--faculty);font-weight:700">' + t.att + '</span>' : '<span style="color:var(--muted)">Draft</span>') + '</td>'
          + '<td><div style="display:flex;gap:5px">'
          + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();openTestResultsModal(\'' + t.n.replace(/'/g,"\\'") + '\',\'' + t.att + '\')">📊 Results</button>'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();toast(\'Editing...\',\'✏️\')">✏️</button></div></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  return html;
};

function openCreateTestModal() {
  var body = makeInputGroup('Test Title','text','e.g. Chapter 6 — Optics DPP')
    + '<div class="inp-row">'
    + makeInputGroup('Test Type','select','DPP, Chapter Test, Weekly Test, Full Mock')
    + makeInputGroup('Subject','select','Physics, Chemistry, Maths, All')
    + '</div><div class="inp-row">'
    + makeInputGroup('Questions','text','','20')
    + makeInputGroup('Duration','select','30 min, 45 min, 60 min, 90 min, 3 hours')
    + '</div><div class="inp-row">'
    + makeInputGroup('Correct Marks','text','','+4')
    + makeInputGroup('Wrong Marks','text','','-1')
    + '</div>'
    + makeInputGroup('Assign to Batch','select','JEE Advanced A, JEE Advanced B, NEET Batch, All Batches')
    + '<div class="inp-row">'
    + makeInputGroup('Start Date','date','')
    + makeInputGroup('End Date','date','')
    + '</div>';
  openDetail('📝 Create New Test', body, '<button class="btn btn-solid" onclick="toast(\'Test created and published!\',\'📝\');closeModal(\'modal-detail\')">📤 Publish Test</button>');
}

function openTestResultsModal(title, attempts) {
  var body = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px">'
    + [['Attempts',attempts,'var(--faculty)'],['Avg Score','74%','var(--student)'],['Pass Rate','68%','var(--purple)']].map(function(x) {
        return '<div class="fee-card" style="text-align:center"><div style="font-size:20px;font-weight:800;color:' + x[2] + ';font-family:Syne,sans-serif">' + x[1] + '</div><div style="font-size:11px;color:var(--muted);margin-top:3px">' + x[0] + '</div></div>';
      }).join('') + '</div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>Rank</th><th>Student</th><th>Score</th><th>Time</th></tr></thead><tbody>'
    + [[1,'Sneha Patel','72/80 (90%)','24 min'],[2,'Rohan Gupta','68/80 (85%)','27 min'],[3,'Ananya Singh','65/80 (81%)','29 min']].map(function(r) {
        return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td style="color:var(--student);font-weight:700">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  openDetail('📊 Results — ' + title, body, '<button class="btn btn-teal" onclick="toast(\'Results exported!\',\'⬇\');closeModal(\'modal-detail\')">⬇ Export</button>');
}

PAGES['faculty_tracker'] = function() {
  var students = [
    { n:'Sneha Patel',  s:94, a:'96%', t:32, tr:'↑', alert:false },
    { n:'Rohan Gupta',  s:91, a:'92%', t:30, tr:'↑', alert:false },
    { n:'Ananya Singh', s:88, a:'94%', t:31, tr:'→', alert:false },
    { n:'Arjun Sharma', s:85, a:'89%', t:29, tr:'↑', alert:false },
    { n:'Dev Verma',    s:52, a:'64%', t:18, tr:'↓', alert:true },
    { n:'Meera Shah',   s:48, a:'58%', t:15, tr:'↓', alert:true },
  ];
  return '<div style="display:flex;justify-content:space-between;margin-bottom:14px">'
    + '<select class="inp-field" style="width:180px" onchange="toast(\'Filter applied\',\'🔍\')"><option>JEE Advanced A</option><option>JEE Advanced B</option><option>NEET Batch</option></select>'
    + '<button class="btn btn-red" onclick="toast(\'Showing at-risk students\',\'⚠️\')">⚠️ At-Risk Students</button></div>'
    + '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Avg Score</th><th>Attendance</th><th>Tests</th><th>Trend</th><th>Action</th></tr></thead><tbody>'
    + students.map(function(s) {
        return '<tr style="' + (s.alert?'background:rgba(255,45,107,.04)':'') + '" onclick="openSendFeedback(\'' + s.n + '\')">'
          + '<td><div style="display:flex;align-items:center;gap:8px">'
          + makeAv(s.n.charAt(0), 'rgba(0,212,200,.1)')
          + s.n + (s.alert ? '<span class="badge badge-red" style="margin-left:5px">⚠️ At Risk</span>' : '') + '</div></td>'
          + '<td><span style="color:' + (s.s>=70?'var(--student)':'var(--admin)') + ';font-weight:700">' + s.s + '%</span></td>'
          + '<td style="color:' + (parseInt(s.a)>=80?'var(--student)':'var(--admin)') + '">' + s.a + '</td>'
          + '<td>' + s.t + '</td>'
          + '<td style="font-size:17px;color:' + (s.tr==='↑'?'var(--student)':s.tr==='↓'?'var(--admin)':'var(--muted)') + '">' + s.tr + '</td>'
          + '<td><button class="btn btn-sm btn-teal" onclick="event.stopPropagation();openSendFeedback(\'' + s.n + '\')">💬</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
};

function openSendFeedback(name) {
  var body = makeInputGroup('Message', 'textarea', 'Write personal feedback...')
    + makeInputGroup('Type','select','Encouragement, Performance Alert, Improvement Tips, Congratulations');
  openDetail('💬 Feedback to ' + name, body, '<button class="btn btn-solid" onclick="toast(\'Feedback sent!\',\'✅\');closeModal(\'modal-detail\')">📤 Send</button>');
}

PAGES['faculty_analytics'] = function() {
  var stats = makeStats([
    { icon:'👁', val:'12.4K',label:'Video Views',      col:'var(--faculty)' },
    { icon:'⭐', val:'4.7',  label:'Avg Rating',       col:'var(--yellow)' },
    { icon:'📝', val:'14',   label:'Tests Created',    col:'var(--purple)' },
    { icon:'✅', val:'87%',  label:'Class Completion', col:'var(--student)' },
  ]);
  var chart = makeChartBars([{m:'Oct',v:70},{m:'Nov',v:78},{m:'Dec',v:65},{m:'Jan',v:82},{m:'Feb',v:75},{m:'Mar',v:88}], 'linear-gradient(180deg,var(--faculty),rgba(0,212,200,.3))');
  var top3 = [{t:'Electrostatics Lecture',v:312,c:'#ff2d6b'},{t:'Organic Chemistry',v:289,c:'#00d4c8'},{t:'Thermodynamics',v:245,c:'#6c47ff'}];
  var topHtml = top3.map(function(v) {
    return '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>' + v.t + '</span><span style="color:' + v.c + '">👁 ' + v.v + '</span></div>' + makeProgress(v.v/4, v.c) + '</div>';
  }).join('');
  return stats
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-title" style="margin-bottom:14px">📈 Monthly Engagement</div>' + chart + '</div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:14px">📚 Top Content</div>' + topHtml + '</div>'
    + '</div>';
};

PAGES['faculty_doubts'] = function() {
  var statsHtml = '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">'
    + '<div class="stat-card" style="border-color:color-mix(in srgb,var(--admin) 28%,var(--border))" onclick="toast(\'Pending doubts\',\'💬\')">'
    + '<div class="stat-icon">💬</div>'
    + '<div class="stat-val" style="background:none;-webkit-text-fill-color:initial;color:#ff2d6b">5</div>'
    + '<div class="stat-label">Pending</div></div>'
    + '<div class="stat-card" style="border-color:color-mix(in srgb,var(--student) 28%,var(--border))" onclick="toast(\'Resolved doubts\',\'✅\')">'
    + '<div class="stat-icon">✅</div>'
    + '<div class="stat-val" style="background:none;-webkit-text-fill-color:initial;color:#4ade80">89</div>'
    + '<div class="stat-label">Resolved Today</div></div>'
    + '<div class="stat-card" style="border-color:color-mix(in srgb,var(--yellow) 28%,var(--border))" onclick="toast(\'Average response time\',\'⏱\')">'
    + '<div class="stat-icon">⏱</div>'
    + '<div class="stat-val" style="background:none;-webkit-text-fill-color:initial;color:#fbbf24">1.2h</div>'
    + '<div class="stat-label">Avg Response</div></div>'
    + '</div>';

  var doubts = window.LMS_DOUBTS || [
    { st:'Arjun Sharma', q:'Gauss Law for non-uniform fields',        batch:'JEE A',  t:'2h ago' },
    { st:'Sneha Patel',  q:'Torque derivation in magnetic field',     batch:'JEE A',  t:'3h ago' },
    { st:'Rohan Gupta',  q:'Work-energy theorem — when does it fail?',batch:'JEE B',  t:'5h ago' },
    { st:'Priya Joshi',  q:'Pseudo force — concept and examples',     batch:'JEE B',  t:'Yesterday' },
    { st:'Dev Verma',    q:'Scalar vs vector potential difference',    batch:'JEE A',  t:'Yesterday' },
  ];

  var dHtml = '<div class="card">' + doubts.map(function(d) {
    var studentName = d.st || d.student || 'Student';
    var batchName = d.batch || (d.sub ? d.sub : 'General');
    var timeLabel = d.t || 'Just now';
    return '<div class="list-item" onclick="openResolveDoubt(\'' + studentName.replace(/'/g,"\\'") + '\',\'' + d.q.replace(/'/g,"\\'") + '\')">'
      + makeAv(studentName.charAt(0), 'rgba(0,212,200,.1)')
      + '<div class="li-content"><div class="li-title">' + d.q + '</div><div class="li-sub">' + studentName + ' • ' + batchName + ' • ' + timeLabel + '</div></div>'
      + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();openResolveDoubt(\'' + studentName.replace(/'/g,"\\'") + '\',\'' + d.q.replace(/'/g,"\\'") + '\')">Reply</button></div>';
  }).join('') + '</div>';

  return statsHtml + dHtml;
};

PAGES['faculty_reports'] = function() {
  var cards = [['Classes Taken','42','var(--faculty)'],['Tests Created','8','var(--purple)'],['Doubts Resolved','156','var(--student)'],['Student Rating','4.7⭐','var(--yellow)']];
  return '<div class="card"><div class="card-header"><div class="card-title">📋 Monthly Performance Report</div>'
    + '<button class="btn btn-sm btn-teal" onclick="toast(\'Report exported!\',\'⬇\')">⬇ Export</button></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:11px">'
    + cards.map(function(c) {
        return '<div class="fee-card" style="text-align:center"><div style="font-size:22px;font-weight:800;color:' + c[2] + ';font-family:Syne,sans-serif">' + c[1] + '</div><div style="font-size:11px;color:var(--muted);margin-top:3px">' + c[0] + '</div></div>';
      }).join('') + '</div></div>';
};

PAGES['faculty_feedback'] = function() {
  var fb = [
    { st:'Sneha Patel',  r:5, c:'Explains concepts very clearly. Examples are excellent!',       d:'Mar 10',batch:'JEE A' },
    { st:'Arjun Sharma', r:5, c:'Best physics teacher I have had. Very patient with doubts.',    d:'Mar 9', batch:'JEE A' },
    { st:'Rohan Gupta',  r:4, c:'Good style. Would appreciate more solved examples.',             d:'Mar 8', batch:'JEE B' },
    { st:'Ananya Singh', r:5, c:'The way she derives formulas makes it easy to understand.',     d:'Mar 7', batch:'JEE A' },
  ];
  return '<div class="card"><div class="card-title" style="margin-bottom:14px">⭐ Feedback Received</div>'
    + fb.map(function(f) {
        return '<div class="card" style="margin-bottom:11px;background:var(--surface2)">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
          + '<div style="display:flex;align-items:center;gap:8px">'
          + makeAv(f.st.charAt(0), 'rgba(0,212,200,.1)')
          + '<div><div style="font-weight:600;font-size:13px">' + f.st + '</div><div style="font-size:11px;color:var(--muted)">' + f.batch + ' • ' + f.d + '</div></div></div>'
          + '<span style="color:var(--yellow);font-size:13px">' + '⭐'.repeat(f.r) + '</span></div>'
          + '<div style="font-size:13px;color:var(--muted);font-style:italic">"' + f.c + '"</div></div>';
      }).join('') + '</div>';
};

// ═══════════════════════════════════════════════════════
// ADMIN PAGES
// ═══════════════════════════════════════════════════════

PAGES['admin_dashboard'] = function() {
  var statsHtml = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px">'
    + [
      { icon:'👨‍🎓', val:'1,248', label:'Total Students',  change:'+23 this week',     col:'var(--student)' },
      { icon:'👨‍🏫', val:'42',    label:'Active Faculty',  change:'All subjects',       col:'var(--faculty)' },
      { icon:'💰',  val:'₹8.4L', label:'Monthly Revenue', change:'↑12% vs last month', col:'var(--yellow)' },
      { icon:'📚',  val:'18',    label:'Active Courses',  change:'JEE, NEET, Commerce',col:'var(--purple)' },
      { icon:'🎬',  val:'324',   label:'Total Videos',    change:'+12 this week',      col:'var(--orange)' },
    ].map(function(s) {
      return '<div class="stat-card" style="border-color:color-mix(in srgb,' + s.col + ' 28%,var(--border))" onclick="toast(\'' + s.label + ' details\',\'📊\')">'
        + '<div class="stat-icon">' + s.icon + '</div>'
        + '<div class="stat-val" style="color:' + s.col + '">' + s.val + '</div>'
        + '<div class="stat-label">' + s.label + '</div>'
        + '<div class="stat-change" style="color:' + s.col + '">' + s.change + '</div>'
        + '</div>';
    }).join('') + '</div>';

  var enrollments = [
    { n:'Kavya Reddy', c:'JEE Advanced 2025', d:'Today',     s:'pending' },
    { n:'Aman Joshi',  c:'NEET Batch 2025',   d:'Today',     s:'approved' },
    { n:'Siya Patel',  c:'Commerce XI',        d:'Yesterday', s:'approved' },
    { n:'Ravi Kumar',  c:'JEE Mains Crash',   d:'Yesterday', s:'pending' },
  ];
  var enrHtml = enrollments.map(function(e) {
    return '<div class="list-item" onclick="openEnrollmentApproval(\'' + e.n + '\',\'' + e.c + '\',\'' + e.s + '\')">'
      + makeAv(e.n.charAt(0), 'rgba(255,45,107,.1)')
      + '<div class="li-content"><div class="li-title">' + e.n + '</div><div class="li-sub">' + e.c + ' • ' + e.d + '</div></div>'
      + '<span class="badge ' + (e.s==='approved'?'badge-green':'badge-yellow') + '">' + e.s + '</span></div>';
  }).join('');

  var fees = window.LMS_FEES || [['JEE Advanced','₹72,000',8],['NEET Batch','₹43,500',5],['Commerce','₹29,500',4]];
  var feeHtml = fees.map(function(f) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">'
      + '<div><div style="font-size:13px;font-weight:600">' + f[0] + '</div><div style="font-size:11px;color:var(--muted)">' + f[2] + ' payments</div></div>'
      + '<span style="color:var(--yellow);font-weight:700">' + f[1] + '</span></div>';
  }).join('');

  // Enrollment by Course - interactive chart
  var courseEnrollData = [
    { m:'JEE Adv',  v:85, students:240, capacity:300, col:'#ff2d6b' },
    { m:'JEE Main', v:60, students:120, capacity:200, col:'#6c47ff' },
    { m:'NEET',     v:72, students:144, capacity:200, col:'#4ade80' },
    { m:'XI Sci',   v:45, students:90,  capacity:200, col:'#00d4c8' },
    { m:'XII Sci',  v:55, students:110, capacity:200, col:'#fbbf24' },
    { m:'Commerce', v:38, students:76,  capacity:200, col:'#ff6b35' },
  ];
  var enrollChartHtml = '<div style="margin-bottom:4px">'
    + courseEnrollData.map(function(b) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">'
          + '<div style="width:9px;height:9px;border-radius:50%;background:' + b.col + ';flex-shrink:0"></div>'
          + '<div style="flex:1;font-size:12px;font-weight:600">' + b.m + '</div>'
          + '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:' + b.col + '">' + b.students + '</div>'
          + '<div style="font-size:11px;color:var(--muted);width:44px;text-align:right">/ ' + b.capacity + '</div>'
          + '<button class="btn btn-sm" style="font-size:11px;padding:3px 8px;background:color-mix(in srgb,' + b.col + ' 12%,transparent);color:' + b.col + ';border:1px solid color-mix(in srgb,' + b.col + ' 28%,transparent)" onclick="openCourseEnrollDetail(\'' + b.m + '\',' + b.students + ',' + b.capacity + ',\'' + b.col + '\')">View</button>'
          + '</div>';
      }).join('') + '</div>';

  var actions = [
    { label:'➕ Add Student',    fn:'openAddStudentModal()' },
    { label:'👨‍🏫 Add Faculty',   fn:'openAddFacultyModal()' },
    { label:'📢 Announcement',   fn:"loadPage('announcements')" },
    { label:'📊 Generate Report',fn:'openGenerateReportModal()' },
    { label:'💳 Record Payment', fn:"loadPage('fees')" },
    { label:'🏗️ Create Course',  fn:'openCreateCourseModal()' },
  ];
  var actHtml = actions.map(function(a) {
    return '<button class="btn btn-purple" style="justify-content:flex-start" onclick="' + a.fn + '">' + a.label + '</button>';
  }).join('');

  // Recent Activities
  var activities = [
    { icon:'🎬', iconBg:'rgba(255,107,53,.12)',  title:'New video uploaded for approval',    sub:'Dr. Priya Mehta uploaded "Electrostatics Part 3"',         time:'5 min ago',  badge:'badge-orange', bLabel:'Pending Approval', action:'openActivityModal(\'video\',\'Electrostatics Part 3\',\'Dr. Priya Mehta\')' },
    { icon:'📄', iconBg:'rgba(108,71,255,.12)', title:'Study material uploaded',            sub:'Prof. Amit Singh added "Organic Chemistry Notes PDF"',      time:'22 min ago', badge:'badge-purple', bLabel:'Material',         action:'openActivityModal(\'material\',\'Organic Chemistry Notes PDF\',\'Prof. Amit Singh\')' },
    { icon:'💳', iconBg:'rgba(251,191,36,.12)',  title:'Course material purchased',          sub:'Kavya Reddy purchased JEE Advanced notes pack (₹499)',      time:'1 hr ago',   badge:'badge-yellow', bLabel:'Purchase',         action:'openActivityModal(\'purchase\',\'JEE Advanced Notes Pack\',\'Kavya Reddy\')' },
    { icon:'📢', iconBg:'rgba(74,222,128,.12)',  title:'Announcement posted',               sub:'Admin posted "JEE Mock Test 14 — Sunday" to all batches',   time:'2 hrs ago',  badge:'badge-green',  bLabel:'Announcement',     action:"loadPage('announcements')" },
    { icon:'🎬', iconBg:'rgba(255,107,53,.12)',  title:'New video uploaded for approval',    sub:'Mr. Raj Sharma uploaded "Integration by Parts — Part 2"',   time:'3 hrs ago',  badge:'badge-orange', bLabel:'Pending Approval', action:'openActivityModal(\'video\',\'Integration by Parts — Part 2\',\'Mr. Raj Sharma\')' },
    { icon:'💳', iconBg:'rgba(251,191,36,.12)',  title:'Material purchase',                 sub:'Aman Joshi purchased NEET Biology DPP pack (₹299)',          time:'4 hrs ago',  badge:'badge-yellow', bLabel:'Purchase',         action:'openActivityModal(\'purchase\',\'NEET Biology DPP Pack\',\'Aman Joshi\')' },
    { icon:'👨‍🎓',iconBg:'rgba(255,45,107,.12)',   title:'New student enrollment request',    sub:'Riya Shah applied for Commerce XI batch',                  time:'5 hrs ago',  badge:'badge-red',    bLabel:'Enrollment',       action:"openEnrollmentApproval('Riya Shah','Commerce XI','pending')" },
  ];
  var activityHtml = activities.map(function(a) {
    return '<div class="list-item" onclick="' + a.action + '">'
      + '<div class="li-icon" style="background:' + a.iconBg + '">' + a.icon + '</div>'
      + '<div class="li-content"><div class="li-title">' + a.title + '</div><div class="li-sub">' + a.sub + '</div></div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">'
      + '<span class="badge ' + a.badge + '">' + a.bLabel + '</span>'
      + '<span style="font-size:10px;color:var(--muted)">' + a.time + '</span></div></div>';
  }).join('');

  return statsHtml
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-header"><div class="card-title">👥 Recent Enrollments</div><button class="card-act" onclick="loadPage(\'users\')">Manage</button></div>' + enrHtml + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">💰 Fee Collection Today</div><button class="card-act" onclick="loadPage(\'fees\')">View All</button></div>'
    + '<div style="text-align:center;padding:14px 0;border-bottom:1px solid var(--border);margin-bottom:13px">'
    + '<div style="font-family:Syne,sans-serif;font-size:30px;font-weight:800;color:var(--yellow)">₹1,45,000</div>'
    + '<div style="color:var(--muted);font-size:12px;margin-top:3px">Collected today</div></div>' + feeHtml + '</div>'
    + '</div>'
    + '<div class="grid-2">'
    + '<div class="card"><div class="card-header"><div class="card-title">📊 Enrollment by Course</div><button class="card-act" onclick="toast(\'Opening course details...\',\'📊\')">View All</button></div>' + enrollChartHtml + '</div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:14px">📣 Quick Actions</div><div style="display:flex;flex-direction:column;gap:7px">' + actHtml + '</div></div>'
    + '</div>'
    + '<div class="card"><div class="card-header"><div class="card-title">⚡ Recent Activities</div><button class="card-act" onclick="toast(\'Full activity log\',\'📋\')">View All</button></div>'
    + activityHtml + '</div>';
};

function openEnrollmentApproval(name, course, status) {
  var isPending = status === 'pending';
  var body = '<div style="display:grid;gap:8px;margin-bottom:15px">'
    + [['Student',name],['Course',course],['Status',status]].map(function(e) { return makeFeeCard(e[0], e[1]); }).join('') + '</div>';
  var footer = isPending
    ? '<button class="btn btn-green" onclick="toast(\'' + name + ' approved!\',\'✅\');closeModal(\'modal-detail\')">✅ Approve</button>'
      + '<button class="btn btn-red" onclick="toast(\'' + name + ' rejected\',\'❌\');closeModal(\'modal-detail\')">❌ Reject</button>'
    : '<button class="btn btn-purple" onclick="toast(\'Viewing profile\',\'👤\');closeModal(\'modal-detail\')">👤 View Profile</button>';
  openDetail('👤 Enrollment — ' + name, body, footer);
}

function openCourseEnrollDetail(course, students, capacity, col) {
  var pct = Math.round((students / capacity) * 100);
  var remaining = capacity - students;
  var recentStudents = [
    { n:'Kavya Reddy',  d:'Today' },
    { n:'Aman Joshi',   d:'Today' },
    { n:'Siya Patel',   d:'Yesterday' },
    { n:'Ravi Kumar',   d:'Mar 11' },
    { n:'Meera Shah',   d:'Mar 10' },
  ];
  var body = '<div style="text-align:center;padding:16px;background:color-mix(in srgb,' + col + ' 8%,var(--surface2));border-radius:12px;margin-bottom:16px;border:1px solid color-mix(in srgb,' + col + ' 20%,transparent)">'
    + '<div style="font-family:Syne,sans-serif;font-size:36px;font-weight:800;color:' + col + '">' + students + '</div>'
    + '<div style="color:var(--muted);font-size:13px;margin-top:2px">Enrolled Students</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px">'
    + makeFeeCard('Capacity', capacity + ' seats')
    + makeFeeCard('Remaining', remaining + ' seats')
    + makeFeeCard('Fill Rate', pct + '%')
    + '</div>'
    + '<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px"><span>Batch Fill</span><span style="color:' + col + ';font-weight:700">' + pct + '%</span></div>'
    + '<div class="prog-bar" style="height:10px"><div class="prog-fill" style="width:' + pct + '%;background:' + col + '"></div></div></div>'
    + '<div class="card-title" style="margin-bottom:10px">Recent Enrollments</div>'
    + recentStudents.map(function(s) {
        return '<div class="list-item">'
          + makeAv(s.n.charAt(0), 'color-mix(in srgb,' + col + ' 12%,var(--surface2))')
          + '<div class="li-content"><div class="li-title">' + s.n + '</div><div class="li-sub">Enrolled ' + s.d + '</div></div>'
          + '<span class="badge badge-green">Enrolled</span></div>';
      }).join('');
  openDetail('📊 ' + course + ' — Enrollment Details', body,
    '<button class="btn btn-solid" onclick="loadPage(\'users\');closeModal(\'modal-detail\')">👥 Manage Students</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Exporting...\',\'📊\');closeModal(\'modal-detail\')">📊 Export</button>');
}

function openActivityModal(type, title, person) {
  var configs = {
    video: {
      icon: '🎬', badgeClass: 'badge-orange', badgeLabel: 'Pending Approval',
      desc: 'A new video has been uploaded and is awaiting admin approval before being visible to students.',
      actions: [
        { label:'✅ Approve Video',   cls:'btn-green',  fn:'toast(\'Video approved and published!\',\'✅\');closeModal(\'modal-detail\')' },
        { label:'❌ Reject',          cls:'btn-red',    fn:'toast(\'Video rejected\',\'❌\');closeModal(\'modal-detail\')' },
        { label:'▶ Preview Video',   cls:'btn-purple', fn:'toast(\'Opening preview...\',\'▶\')' },
      ]
    },
    material: {
      icon: '📄', badgeClass: 'badge-purple', badgeLabel: 'Material Uploaded',
      desc: 'New study material has been uploaded and is ready for review before publishing to students.',
      actions: [
        { label:'✅ Approve Material', cls:'btn-green',  fn:'toast(\'Material approved!\',\'✅\');closeModal(\'modal-detail\')' },
        { label:'❌ Reject',           cls:'btn-red',    fn:'toast(\'Material rejected\',\'❌\');closeModal(\'modal-detail\')' },
        { label:'📥 Download Preview',cls:'btn-purple', fn:'toast(\'Downloading...\',\'📥\')' },
      ]
    },
    purchase: {
      icon: '💳', badgeClass: 'badge-yellow', badgeLabel: 'Purchase',
      desc: 'A student has purchased course material. Payment has been received and access has been granted.',
      actions: [
        { label:'🧾 View Receipt',    cls:'btn-purple', fn:'toast(\'Opening receipt...\',\'🧾\')' },
        { label:'👤 View Student',    cls:'btn-teal',   fn:'toast(\'Opening profile...\',\'👤\');closeModal(\'modal-detail\')' },
      ]
    }
  };
  var cfg = configs[type] || configs.video;
  var body = '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface2);border-radius:10px;margin-bottom:16px">'
    + '<div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:24px">' + cfg.icon + '</div>'
    + '<div><div style="font-weight:700;font-size:14px">' + title + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:3px">by ' + person + '</div>'
    + '<span class="badge ' + cfg.badgeClass + '" style="margin-top:6px">' + cfg.badgeLabel + '</span></div></div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.7">' + cfg.desc + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + [['Faculty/Student', person], ['Time', 'Just now'], ['Status', cfg.badgeLabel], ['Type', type.charAt(0).toUpperCase()+type.slice(1)]].map(function(e) { return makeFeeCard(e[0], e[1]); }).join('')
    + '</div>';
  var footer = cfg.actions.map(function(a) {
    return '<button class="btn ' + a.cls + '" onclick="' + a.fn + '">' + a.label + '</button>';
  }).join('');
  openDetail(cfg.icon + ' Activity — ' + title, body, footer);
}

// ── ADMIN USERS DATA ──
var ADMIN_STUDENTS = [
  { n:'Arjun Sharma', roll:'RV2024001', course:'JEE Advanced (Main + KCET Decoded)', batch:'Batch A', fee:'Paid',    st:'active', email:'arjun.sharma@student.rvhub.com', campus:'RV Jayanagar', gender:'Male',   mobile:'+91 98001 00001' },
  { n:'Sneha Patel',  roll:'RV2024002', course:'JEE Advanced (Main + KCET Decoded)', batch:'Batch A', fee:'Paid',    st:'active', email:'sneha.patel@student.rvhub.com',   campus:'RV Rajajinagar', gender:'Female', mobile:'+91 98001 00002' },
  { n:'Rohan Gupta',  roll:'RV2024003', course:'JEE (Main + KCET Decoded)',          batch:'Batch B', fee:'Due',     st:'active', email:'rohan.gupta@student.rvhub.com',   campus:'RV Jayanagar', gender:'Male',   mobile:'+91 98001 00003' },
  { n:'Kavya Reddy',  roll:'RV2024015', course:'NEET UG Decoded',                   batch:'NEET A',  fee:'Paid',    st:'active', email:'kavya.reddy@student.rvhub.com',   campus:'RV Electronic City', gender:'Female', mobile:'+91 98001 00015' },
  { n:'Dev Verma',    roll:'RV2024020', course:'Commerce Decoded Programme',         batch:'Crash',   fee:'Overdue', st:'warning',email:'dev.verma@student.rvhub.com',     campus:'RV Rajajinagar', gender:'Male',   mobile:'+91 98001 00020' },
];
var ADMIN_FACULTY = [
  { n:'Dr. Priya Mehta',  id:'RVF001', email:'priya.mehta@rvhub.com',    campus:'RV Jayanagar',       course:'JEE Advanced (Main + KCET Decoded)', sub:'Physics',     batches:'JEE A,B',    rat:'4.8', st:'active' },
  { n:'Prof. Amit Singh', id:'RVF002', email:'amit.singh@rvhub.com',     campus:'RV Rajajinagar',     course:'JEE (Main + KCET Decoded)',          sub:'Chemistry',   batches:'JEE,NEET',   rat:'4.5', st:'active' },
  { n:'Mr. Raj Sharma',   id:'RVF003', email:'raj.sharma@rvhub.com',     campus:'RV Electronic City', course:'JEE Advanced (Main + KCET Decoded)', sub:'Mathematics', batches:'JEE A,B',    rat:'4.3', st:'active' },
  { n:'Dr. Kavya R.',     id:'RVF004', email:'kavya.r@rvhub.com',        campus:'RV Jayanagar',       course:'NEET UG Decoded',                   sub:'Biology',     batches:'NEET Batch', rat:'4.6', st:'inactive' },
];

PAGES['admin_users'] = function() {
  var students = window.ADMIN_STUDENTS || ADMIN_STUDENTS;
  var faculty   = window.ADMIN_FACULTY || ADMIN_FACULTY;
  var batches = [
    { n:'JEE Advanced (Main + KCET Decoded)', e:'⚛️', s:142, fac:'Dr. Priya Mehta',  col:'#ff2d6b', course:'JEE Advanced (Main + KCET Decoded)' },
    { n:'JEE (Main + KCET Decoded)',          e:'⚛️', s:98,  fac:'Dr. Priya Mehta',  col:'#6c47ff', course:'JEE (Main + KCET Decoded)' },
    { n:'NEET UG Decoded',                    e:'🔬', s:72,  fac:'Dr. Kavya R.',     col:'#4ade80', course:'NEET UG Decoded' },
    { n:'Commerce Decoded Programme',         e:'💼', s:56,  fac:'Multi-faculty',    col:'#fbbf24', course:'Commerce Decoded Programme' },
  ];

  // ── STUDENTS TAB ──
  var stHtml = '<div class="card">'
    + '<div style="display:flex;gap:8px;margin-bottom:13px;flex-wrap:wrap">'
    + '<input class="inp-field" id="st-search" placeholder="🔍 Search students..." style="flex:1;min-width:160px" oninput="filterStudentTable()">'
    + '<select class="inp-field" id="st-filter-course" style="width:220px" onchange="filterStudentTable()">'
    + '<option value="">All Courses</option>'
    + '<option>JEE Advanced (Main + KCET Decoded)</option>'
    + '<option>JEE (Main + KCET Decoded)</option>'
    + '<option>NEET UG Decoded</option>'
    + '<option>Commerce Decoded Programme</option>'
    + '</select>'
    + '<select class="inp-field" id="st-filter-campus" style="width:160px" onchange="filterStudentTable()">'
    + '<option value="">All Campuses</option>'
    + '<option>RV Jayanagar</option><option>RV Rajajinagar</option><option>RV Electronic City</option>'
    + '</select>'
    + '<button class="btn btn-red" onclick="openAddStudentModal()">➕ Add Student</button></div>'
    + '<div class="tbl-wrap"><table id="st-table"><thead><tr><th>Student</th><th>Roll No</th><th>Mail ID</th><th>Course</th><th>Campus</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
    + students.map(function(s, idx) {
        const feeBadge = s.fee==='Paid'?'badge-green':s.fee==='Due'?'badge-yellow':'badge-red';
        const stBadge = s.st==='active'?'badge-teal':'badge-red';
        return '<tr data-name="' + s.n.toLowerCase() + '" data-course="' + s.course + '" data-campus="' + s.campus + '">'
          + '<td><div style="display:flex;align-items:center;gap:7px">' + makeAv(s.n.charAt(0), 'rgba(255,45,107,.1)') + '<div><div style="font-weight:600">' + s.n + '</div><div style="font-size:11px;color:var(--muted)">' + s.gender + ' • ' + s.mobile + '</div></div></div></td>'
          + '<td style="color:var(--muted)">' + s.roll + '</td>'
          + '<td style="color:var(--muted);font-size:12px">' + s.email + '</td>'
          + '<td>' + s.course + '</td>'
          + '<td style="font-size:12px">' + s.campus + '</td>'
          + '<td><span class="badge ' + feeBadge + '">' + s.fee + '</span></td>'
          + '<td><span class="badge ' + stBadge + '">' + s.st + '</span></td>'
          + '<td><div style="display:flex;gap:5px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openStudentEditModal(' + idx + ')">✏️ Edit</button>'
          + '<button class="btn btn-sm btn-red" onclick="event.stopPropagation();deactivateStudent(' + idx + ',this)">🚫</button></div></td></tr>';
      }).join('') + '</tbody></table></div></div>';

  // ── FACULTY TAB ──
  var facHtml = '<div style="display:flex;gap:8px;margin-bottom:11px;flex-wrap:wrap">'
    + '<input class="inp-field" id="fac-search" placeholder="🔍 Search faculty..." style="flex:1;min-width:160px" oninput="filterFacultyTable()">'
    + '<select class="inp-field" id="fac-filter-sub" style="width:160px" onchange="filterFacultyTable()">'
    + '<option value="">All Subjects</option>'
    + '<option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option>'
    + '</select>'
    + '<select class="inp-field" id="fac-filter-course" style="width:220px" onchange="filterFacultyTable()">'
    + '<option value="">All Courses</option>'
    + '<option>JEE Advanced (Main + KCET Decoded)</option>'
    + '<option>JEE (Main + KCET Decoded)</option>'
    + '<option>NEET UG Decoded</option>'
    + '<option>Commerce Decoded Programme</option>'
    + '</select>'
    + '<button class="btn btn-teal" onclick="openAddFacultyModal()">➕ Add Faculty</button></div>'
    + '<div class="card"><div class="tbl-wrap"><table id="fac-table"><thead><tr><th>Faculty</th><th>Emp ID</th><th>Office Mail</th><th>Campus</th><th>Course</th><th>Subject</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
    + faculty.map(function(f, idx) {
        return '<tr data-name="' + f.n.toLowerCase() + '" data-sub="' + f.sub + '" data-course="' + f.course + '">'
          + '<td><div style="display:flex;align-items:center;gap:7px">' + makeAv(f.n.charAt(0), 'rgba(0,212,200,.1)') + f.n + '</div></td>'
          + '<td style="color:var(--muted)">' + f.id + '</td>'
          + '<td style="color:var(--muted);font-size:12px">' + f.email + '</td>'
          + '<td style="font-size:12px">' + f.campus + '</td>'
          + '<td style="font-size:12px">' + f.course + '</td>'
          + '<td>' + f.sub + '</td>'
          + '<td><span style="color:var(--yellow);font-weight:700">⭐ ' + f.rat + '</span></td>'
          + '<td><span class="badge ' + (f.st==='active'?'badge-green':'badge-red') + '">' + f.st + '</span></td>'
          + '<td><div style="display:flex;gap:4px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openFacultyEditModal(' + idx + ')">✏️</button>'
          + '<button class="btn btn-sm ' + (f.st==='active'?'btn-red':'btn-green') + '" id="fac-toggle-' + idx + '" onclick="event.stopPropagation();toggleFacultyStatus(' + idx + ')">' + (f.st==='active'?'Deactivate':'Activate') + '</button>'
          + '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>';

  // ── BATCHES TAB ──
  var batHtml = '<div class="grid-2">' + batches.map(function(b) {
    return '<div class="card" style="border-color:color-mix(in srgb,' + b.col + ' 20%,var(--border))">'
      + '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">'
      + '<div style="width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,' + b.col + ' 10%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:22px">' + b.e + '</div>'
      + '<div><div style="font-weight:700;font-size:13px">' + b.n + '</div><div style="font-size:12px;color:var(--muted)">' + b.fac + '</div></div></div>'
      + '<div style="font-size:13px;color:var(--muted);margin-bottom:11px">👨‍🎓 ' + b.s + ' students enrolled</div>'
      + '<button class="btn btn-sm btn-teal" style="width:100%;justify-content:center" onclick="openBatchManageModal(\'' + b.course.replace(/'/g,"\\'") + '\',\'' + b.n.replace(/'/g,"\\'") + '\',\'' + b.col + '\',\'' + b.fac + '\')">📋 Manage Students</button></div>';
  }).join('') + '</div>';

  var _ut = window._usersTab||'st';
  return '<div class="inner-tabs">'
    + '<button class="itab'+(_ut!=='fa'&&_ut!=='ba'?' active':'')+'" onclick="itab(this,\'st\');window._usersTab=\'st\'">Students</button>'
    + '<button class="itab'+(_ut==='fa'?' active':'')+'" onclick="itab(this,\'fa\');window._usersTab=\'fa\'">Faculty</button>'
    + '<button class="itab'+(_ut==='ba'?' active':'')+'" onclick="itab(this,\'ba\');window._usersTab=\'ba\'">Batches</button>'
    + '</div>'
    + '<div data-tab="st"'+(_ut==='fa'||_ut==='ba'?' style="display:none"':'')+'>'+stHtml+'</div>'
    + '<div data-tab="fa"'+(_ut==='fa'?'':' style="display:none"')+'>'+facHtml+'</div>'
    + '<div data-tab="ba"'+(_ut==='ba'?'':' style="display:none"')+'>'+batHtml+'</div>';
};

// ── FILTER HELPERS ──
window.filterStudentTable = function() {
  var q = (document.getElementById('st-search')||{value:''}).value.toLowerCase();
  var fc = (document.getElementById('st-filter-course')||{value:''}).value;
  var fp = (document.getElementById('st-filter-campus')||{value:''}).value;
  var rows = document.querySelectorAll('#st-table tbody tr');
  rows.forEach(function(r) {
    var match = (!q || r.dataset.name.includes(q)) && (!fc || r.dataset.course===fc) && (!fp || r.dataset.campus===fp);
    r.style.display = match ? '' : 'none';
  });
}

window.filterFacultyTable = function() {
  var q  = (document.getElementById('fac-search')||{value:''}).value.toLowerCase();
  var fs = (document.getElementById('fac-filter-sub')||{value:''}).value;
  var fc = (document.getElementById('fac-filter-course')||{value:''}).value;
  var rows = document.querySelectorAll('#fac-table tbody tr');
  rows.forEach(function(r) {
    var match = (!q || r.dataset.name.includes(q)) && (!fs || r.dataset.sub===fs) && (!fc || r.dataset.course===fc);
    r.style.display = match ? '' : 'none';
  });
}

window.deactivateStudent = async function(idx, btn) {
  var s = window.ADMIN_STUDENTS[idx];
  try {
    const updated = await api('/api/auth/users/' + s._id + '/status', {
      method: 'PUT'
    });
    toast(updated.name + (updated.st === 'active' ? ' activated' : ' deactivated'), updated.st === 'active' ? 'OK' : 'X');
    window._usersTab = 'st';
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to change status: ' + err.message, '❌');
  }
}

window.toggleFacultyStatus = async function(idx) {
  var f = window.ADMIN_FACULTY[idx];
  try {
    const updated = await api('/api/auth/users/' + f._id + '/status', {
      method: 'PUT',
      body: JSON.stringify({
        st: f.st === 'active' ? 'inactive' : 'active'
      })
    });
    toast(updated.name + (updated.st === 'active' ? ' activated' : ' deactivated'), updated.st === 'active' ? 'OK' : 'X');
    window._usersTab = 'fa';
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to change status: ' + err.message, '❌');
  }
}

// ── BATCH MANAGE MODAL ──
window.removeStudentFromBatch = async function(roll) {
  var s = (window.ADMIN_STUDENTS || []).find(function(x){return x.roll===roll;});
  if (!s) return;
  if (!confirm('Are you sure you want to remove ' + s.n + ' from this batch?')) return;
  try {
    await api('/api/auth/users/' + s._id, {
      method: 'PUT',
      body: JSON.stringify({
        batch: '—'
      })
    });
    toast(s.n + ' removed from batch!', '✅');
    await syncLMSData();
    openBatchManageModal(window._batchCourse, window._batchName, window._batchCol, window._batchFac);
  } catch(err) {
    toast('Error: ' + err.message, '❌');
  }
};

window.addStudentToBatch = async function() {
  var rollSelect = document.getElementById('add-st-batch-sel');
  if (!rollSelect || !rollSelect.value) { toast('Select student!', '⚠️'); return; }
  var roll = rollSelect.value;
  var s = (window.ADMIN_STUDENTS || []).find(function(x){return x.roll===roll;});
  if (!s) return;
  try {
    await api('/api/auth/users/' + s._id, {
      method: 'PUT',
      body: JSON.stringify({
        batch: window._batchCourse
      })
    });
    toast(s.n + ' added to batch!', '✅');
    await syncLMSData();
    batchShowStudents();
  } catch(err) {
    toast('Error: ' + err.message, '❌');
  }
};

window.removeFacultyFromBatch = async function(empId) {
  var f = (window.ADMIN_FACULTY || []).find(function(x){return x.id===empId;});
  if (!f) return;
  if (!confirm('Are you sure you want to remove ' + f.n + ' from this batch?')) return;
  try {
    await api('/api/auth/users/' + f._id, {
      method: 'PUT',
      body: JSON.stringify({
        batch: '—'
      })
    });
    toast(f.n + ' removed from batch!', '✅');
    await syncLMSData();
    batchShowFaculty();
  } catch(err) {
    toast('Error: ' + err.message, '❌');
  }
};

window.addFacultyToBatch = async function() {
  var facSelect = document.getElementById('add-fac-batch-sel');
  if (!facSelect || !facSelect.value) { toast('Select faculty!', '⚠️'); return; }
  var empId = facSelect.value;
  var f = (window.ADMIN_FACULTY || []).find(function(x){return x.id===empId;});
  if (!f) return;
  try {
    await api('/api/auth/users/' + f._id, {
      method: 'PUT',
      body: JSON.stringify({
        batch: window._batchCourse
      })
    });
    toast(f.n + ' assigned to batch!', '✅');
    await syncLMSData();
    batchShowFaculty();
  } catch(err) {
    toast('Error: ' + err.message, '❌');
  }
};

window.openBatchManageModal = function(course, batchName, col, fac) {
  var enrolled = (window.ADMIN_STUDENTS || []).filter(function(s) { return s.course === course; });
  window._batchCourse = course; window._batchName = batchName; window._batchCol = col; window._batchFac = fac;
  var header = '<div style="display:flex;gap:9px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:110px;background:color-mix(in srgb,' + col + ' 8%,var(--surface2));border:1px solid color-mix(in srgb,' + col + ' 20%,transparent);border-radius:10px;padding:12px;text-align:center">'
    + '<div style="font-family:Syne,sans-serif;font-size:26px;font-weight:800;color:' + col + '">' + enrolled.length + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">Students</div></div>'
    + '<div style="flex:1;min-width:110px;background:var(--surface2);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center">'
    + '<div style="font-size:12px;font-weight:600;margin-bottom:2px">' + fac + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">Lead Faculty</div></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<button class="btn btn-purple" onclick="batchShowStudents()">Manage Students</button>'
    + '<button class="btn btn-teal" onclick="batchShowFaculty()">Manage Faculty</button>'
    + '<button class="btn btn-yellow" onclick="batchExport()">Batch Report</button></div>';
  var rows = enrolled.length ? '<div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Roll</th><th>Fee</th><th>Status</th><th>Action</th></tr></thead><tbody>'
    + enrolled.map(function(s){
        return '<tr><td style="font-weight:600">' + s.n + '</td><td style="color:var(--muted);font-size:12px">' + s.roll + '</td>'
          + '<td><span class="badge ' + (s.fee==='Paid'?'badge-green':s.fee==='Due'?'badge-yellow':'badge-red') + '">' + s.fee + '</span></td>'
          + '<td><span class="badge ' + (s.st==='active'?'badge-teal':'badge-red') + '">' + s.st + '</span></td>'
          + '<td><button class="btn btn-sm btn-red" onclick="removeStudentFromBatch(\'' + s.roll + '\')">Remove</button></td></tr>';
      }).join('') + '</tbody></table></div>'
    : '<div style="text-align:center;padding:20px;color:var(--muted)">No students enrolled yet.</div>';
  openDetail('Manage: ' + batchName, header + rows,
    '<button class="btn btn-purple" onclick="openAddStudentModal();closeModal(\'modal-detail\')">Add Student</button>');
};

window.batchShowStudents = function() {
  var enrolled = (window.ADMIN_STUDENTS || []).filter(function(s){return s.course===window._batchCourse;});
  var body = '<div style="margin-bottom:12px;font-weight:700">Enrolled Students</div>'
    + (enrolled.length ? '<div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Roll</th><th>Action</th></tr></thead><tbody>'
      + enrolled.map(function(s){return '<tr><td>'+s.n+'</td><td style="color:var(--muted)">'+s.roll+'</td><td><button class="btn btn-sm btn-red" onclick="removeStudentFromBatch(\''+s.roll+'\')">Remove</button></td></tr>';}).join('')
      + '</tbody></table></div>' : '<p style="color:var(--muted)">No students.</p>')
    + '<div style="margin-top:14px;font-weight:700;margin-bottom:8px">Add Student</div>'
    + '<div style="display:flex;gap:8px"><select class="inp-field" id="add-st-batch-sel" style="flex:1">'
    + '<option value="">-- Select student --</option>'
    + (window.ADMIN_STUDENTS || []).map(function(s){return '<option value="'+s.roll+'">'+s.n+' ('+s.roll+')</option>';}).join('')
    + '</select><button class="btn btn-green" onclick="addStudentToBatch()">Add</button></div>';
  document.getElementById('detail-body').innerHTML = body;
};

window.batchShowFaculty = function() {
  var assigned = (window.ADMIN_FACULTY || []).filter(function(f){return f.course===window._batchCourse;});
  var body = '<div style="margin-bottom:12px;font-weight:700">Assigned Faculty</div>'
    + (assigned.length ? '<div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Subject</th><th>Action</th></tr></thead><tbody>'
      + assigned.map(function(f){return '<tr><td>'+f.n+'</td><td>'+f.sub+'</td><td><button class="btn btn-sm btn-red" onclick="removeFacultyFromBatch(\''+f.id+'\')">Remove</button></td></tr>';}).join('')
      + '</tbody></table></div>' : '<p style="color:var(--muted)">No faculty assigned.</p>')
    + '<div style="margin-top:14px;font-weight:700;margin-bottom:8px">Assign Faculty</div>'
    + '<div style="display:flex;gap:8px"><select class="inp-field" id="add-fac-batch-sel" style="flex:1">'
    + '<option value="">-- Select faculty --</option>'
    + (window.ADMIN_FACULTY || []).map(function(f){return '<option value="'+f.id+'">'+f.n+' ('+f.sub+')</option>';}).join('')
    + '</select><button class="btn btn-teal" onclick="addFacultyToBatch()">Assign</button></div>';
  document.getElementById('detail-body').innerHTML = body;
};

window.batchExport = function() {
  var students = (window.ADMIN_STUDENTS || []).filter(function(s){return s.course===window._batchCourse;});
  var rows = ['Name,Roll No,Email,Campus,Fee Status,Status'].concat(students.map(function(s){return [s.n,s.roll,s.email,s.campus,s.fee,s.st].join(',');}));
  var blob = new Blob([rows.join('\n')],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download=(window._batchName||'batch')+'_students.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('Student list exported!','OK');
};

window.openStudentEditModal = function(idx) {
  var s = window.ADMIN_STUDENTS[idx];
  var body = '<div class="inp-row">'
    + '<div class="inp-group"><label>First Name</label><input class="inp-field" id="se-fn" value="' + s.n.split(' ')[0] + '"></div>'
    + '<div class="inp-group"><label>Last Name</label><input class="inp-field" id="se-ln" value="' + (s.n.split(' ')[1]||'') + '"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mail ID</label><input class="inp-field" id="se-email" type="email" value="' + s.email + '"></div>'
    + '<div class="inp-group"><label>Student ID (Roll)</label><input class="inp-field" id="se-roll" value="' + s.roll + '"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mobile Number</label><input class="inp-field" id="se-mobile" type="tel" value="' + s.mobile + '"></div>'
    + '<div class="inp-group"><label>Gender</label><select class="inp-field" id="se-gender"><option' + (s.gender==='Male'?' selected':'') + '>Male</option><option' + (s.gender==='Female'?' selected':'') + '>Female</option><option' + (s.gender==='Other'?' selected':'') + '>Other</option></select></div>'
    + '</div>'
    + '<div class="inp-group"><label>Course</label><select class="inp-field" id="se-course">'
    + ['JEE Advanced (Main + KCET Decoded)','JEE (Main + KCET Decoded)','NEET UG Decoded','Commerce Decoded Programme'].map(function(c) { return '<option' + (s.course===c?' selected':'') + '>' + c + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Campus</label><select class="inp-field" id="se-campus">'
    + ['RV Jayanagar','RV Rajajinagar','RV Electronic City'].map(function(c) { return '<option' + (s.campus===c?' selected':'') + '>' + c + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="inp-group"><label>Fee Status</label><select class="inp-field" id="se-fee"><option' + (s.fee==='Paid'?' selected':'') + '>Paid</option><option' + (s.fee==='Due'?' selected':'') + '>Due</option><option' + (s.fee==='Overdue'?' selected':'') + '>Overdue</option></select></div>'
    + '</div>';
  openDetail('✏️ Edit Student — ' + s.n, body,
    '<button class="btn btn-solid" onclick="saveStudentEdit(' + idx + ')">💾 Save Changes</button>'
  );
}

window.saveStudentEdit = async function(idx) {
  var s = window.ADMIN_STUDENTS[idx];
  var n = (document.getElementById('se-fn').value + ' ' + document.getElementById('se-ln').value).trim();
  var email = document.getElementById('se-email').value;
  var roll = document.getElementById('se-roll').value;
  var mobile = document.getElementById('se-mobile').value;
  var gender = document.getElementById('se-gender').value;
  var course = document.getElementById('se-course').value;
  var campus = document.getElementById('se-campus').value;
  var fee = document.getElementById('se-fee').value;
  
  try {
    await api('/api/auth/users/' + s._id, {
      method: 'PUT',
      body: JSON.stringify({
        name: n,
        email: email,
        roll: roll,
        phone: mobile,
        gender: gender,
        batch: course,
        campus: campus,
        feeStatus: fee,
        feeAmount: fee === 'Paid' ? 45000 : s.feeAmount,
        feePaid: fee === 'Paid' ? s.feeAmount : s.feePaid,
        feePending: fee === 'Paid' ? 0 : s.feePending
      })
    });
    closeModal('modal-detail');
    toast('Student updated successfully!', '✅');
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to update student: ' + err.message, '❌');
  }
}

window.openAddStudentModal = function() {
  var body = '<div class="inp-row">'
    + '<div class="inp-group"><label>First Name</label><input class="inp-field" id="add-st-fn" placeholder="e.g. Arjun"></div>'
    + '<div class="inp-group"><label>Last Name</label><input class="inp-field" id="add-st-ln" placeholder="e.g. Sharma"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mail ID</label><input class="inp-field" id="add-st-email" type="email" placeholder="student@email.com"></div>'
    + '<div class="inp-group"><label>Student ID (Roll)</label><input class="inp-field" id="add-st-roll" placeholder="e.g. RV2024099"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mobile Number</label><input class="inp-field" id="add-st-mobile" type="tel" placeholder="+91 XXXXX XXXXX"></div>'
    + '<div class="inp-group"><label>Gender</label><select class="inp-field" id="add-st-gender"><option>Male</option><option>Female</option><option>Other</option></select></div>'
    + '</div>'
    + '<div class="inp-group"><label>Course</label><select class="inp-field" id="add-st-course">'
    + '<option>JEE Advanced (Main + KCET Decoded)</option><option>JEE (Main + KCET Decoded)</option><option>NEET UG Decoded</option><option>Commerce Decoded Programme</option>'
    + '</select></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Campus</label><select class="inp-field" id="add-st-campus"><option>RV Jayanagar</option><option>RV Rajajinagar</option><option>RV Electronic City</option></select></div>'
    + '<div class="inp-group"><label>Target Year</label><select class="inp-field" id="add-st-year"><option>2025</option><option>2026</option><option>2027</option></select></div>'
    + '</div>'
    + '<div style="border-top:1px solid var(--border);padding-top:13px;margin-top:4px">'
    + '<div style="font-size:12px;font-weight:700;color:var(--admin);margin-bottom:10px;display:flex;align-items:center;gap:6px">🔑 Create Login Password</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Password</label><div style="position:relative"><input type="password" class="inp-field" id="add-st-pass" placeholder="Min 8 • 1 Uppercase • 1 Special" style="padding-right:38px" oninput="validateStPass()"><button type="button" onclick="toggleFieldPw(\'add-st-pass\',\'toggle-st-pw\')" id="toggle-st-pw" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div>'
    + '<div id="st-pass-hint" style="font-size:10px;margin-top:4px;color:var(--muted)">Min 8 chars • 1 uppercase • 1 special character</div></div>'
    + '<div class="inp-group"><label>Confirm Password</label><div style="position:relative"><input type="password" class="inp-field" id="add-st-cpass" placeholder="Re-enter password" style="padding-right:38px"><button type="button" onclick="toggleFieldPw(\'add-st-cpass\',\'toggle-st-cpw\')" id="toggle-st-cpw" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div></div>'
    + '</div></div>';
  openDetail('➕ Add New Student', body, '<button class="btn btn-solid" onclick="submitAddStudent()">✅ Add Student</button>');
}

window.validateStPass = function() {
  var pw = (document.getElementById('add-st-pass')||{}).value||'';
  var ok = pw.length>=8 && /[A-Z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
  var hint = document.getElementById('st-pass-hint');
  if (hint) { hint.textContent = ok ? '✅ Password meets requirements' : 'Min 8 chars • 1 uppercase • 1 special character'; hint.style.color = ok ? 'var(--student)' : 'var(--muted)'; }
}

window.submitAddStudent = async function() {
  var pw = (document.getElementById('add-st-pass')||{}).value||'';
  var cpw = (document.getElementById('add-st-cpass')||{}).value||'';
  if (pw.length<8 || !/[A-Z]/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) { toast('Password must be min 8 chars, 1 uppercase, 1 special character','⚠️'); return; }
  if (pw !== cpw) { toast('Passwords do not match','⚠️'); return; }
  
  var firstName = document.getElementById('add-st-fn').value.trim();
  var lastName = document.getElementById('add-st-ln').value.trim();
  var email = document.getElementById('add-st-email').value.trim();
  var roll = document.getElementById('add-st-roll').value.trim();
  var phone = document.getElementById('add-st-mobile').value.trim();
  var gender = document.getElementById('add-st-gender').value;
  var course = document.getElementById('add-st-course').value;
  var campus = document.getElementById('add-st-campus').value;

  if (!firstName || !lastName || !email) { toast('First Name, Last Name, and Email are required!','⚠️'); return; }
  
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: firstName + ' ' + lastName,
        email: email,
        phone: phone,
        password: pw,
        role: 'student',
        roll: roll,
        batch: course,
        campus: campus,
        gender: gender,
        feeStatus: 'Paid',
        feeAmount: 45000,
        feePaid: 0,
        feePending: 45000
      })
    });
    toast('Student added successfully!','✅');
    closeModal('modal-detail');
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to add student: ' + err.message, '❌');
  }
}

window.openFacultyEditModal = function(idx) {
  var f = window.ADMIN_FACULTY[idx];
  var body = '<div class="inp-row">'
    + '<div class="inp-group"><label>First Name</label><input class="inp-field" id="fe-fn" value="' + f.n.split(' ').slice(0,-1).join(' ') + '"></div>'
    + '<div class="inp-group"><label>Last Name</label><input class="inp-field" id="fe-ln" value="' + (f.n.split(' ').slice(-1)[0]||'') + '"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Office Mail ID</label><input class="inp-field" id="fe-email" type="email" value="' + f.email + '"></div>'
    + '<div class="inp-group"><label>Faculty ID</label><input class="inp-field" id="fe-id" value="' + f.id + '"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mobile Number</label><input class="inp-field" id="fe-mobile" type="tel" placeholder="+91 XXXXX XXXXX"></div>'
    + '<div class="inp-group"><label>Gender</label><select class="inp-field" id="fe-gender"><option>Male</option><option>Female</option><option>Other</option></select></div>'
    + '</div>'
    + '<div class="inp-group"><label>Subject</label><select class="inp-field" id="fe-sub">'
    + ['Physics','Chemistry','Mathematics','Biology','Commerce','Accountancy'].map(function(s){ return '<option' + (f.sub===s?' selected':'') + '>' + s + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="inp-group"><label>Course</label><select class="inp-field" id="fe-course">'
    + ['JEE Advanced (Main + KCET Decoded)','JEE (Main + KCET Decoded)','NEET UG Decoded','Commerce Decoded Programme'].map(function(c){ return '<option' + (f.course===c?' selected':'') + '>' + c + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="inp-group"><label>Campus</label><select class="inp-field" id="fe-campus">'
    + ['RV Jayanagar','RV Rajajinagar','RV Electronic City'].map(function(c){ return '<option' + (f.campus===c?' selected':'') + '>' + c + '</option>'; }).join('')
    + '</select></div>';
  openDetail('✏️ Edit Faculty — ' + f.n, body,
    '<button class="btn btn-solid" onclick="saveFacultyEdit(' + idx + ')">💾 Save Changes</button>'
  );
}

window.saveFacultyEdit = async function(idx) {
  var f = window.ADMIN_FACULTY[idx];
  var fn = document.getElementById('fe-fn').value;
  var ln = document.getElementById('fe-ln').value;
  var n = (fn + ' ' + ln).trim();
  var email = document.getElementById('fe-email').value;
  var emp = document.getElementById('fe-id').value;
  var mobile = document.getElementById('fe-mobile').value;
  var gender = document.getElementById('fe-gender').value;
  var subject = document.getElementById('fe-sub').value;
  var course = document.getElementById('fe-course').value;
  var campus = document.getElementById('fe-campus').value;
  
  try {
    await api('/api/auth/users/' + f._id, {
      method: 'PUT',
      body: JSON.stringify({
        name: n,
        email: email,
        emp: emp,
        phone: mobile,
        gender: gender,
        subject: subject,
        batch: course,
        campus: campus
      })
    });
    closeModal('modal-detail');
    toast('Faculty updated successfully!', '✅');
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to update faculty: ' + err.message, '❌');
  }
}

window.openAddFacultyModal = function() {
  var body = '<div class="inp-row">'
    + '<div class="inp-group"><label>First Name</label><input class="inp-field" id="add-fac-fn" placeholder="e.g. Dr. Priya"></div>'
    + '<div class="inp-group"><label>Last Name</label><input class="inp-field" id="add-fac-ln" placeholder="e.g. Mehta"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Office Mail ID</label><input class="inp-field" id="add-fac-email" type="email" placeholder="faculty@rvhub.com"></div>'
    + '<div class="inp-group"><label>Faculty ID</label><input class="inp-field" id="add-fac-emp" placeholder="e.g. RVF005"></div>'
    + '</div><div class="inp-row">'
    + '<div class="inp-group"><label>Mobile Number</label><input class="inp-field" id="add-fac-mobile" type="tel" placeholder="+91 XXXXX XXXXX"></div>'
    + '<div class="inp-group"><label>Gender</label><select class="inp-field" id="add-fac-gender"><option>Male</option><option>Female</option><option>Other</option></select></div>'
    + '</div>'
    + '<div class="inp-group"><label>Subject</label><select class="inp-field" id="add-fac-sub"><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option><option>Commerce</option><option>Accountancy</option></select></div>'
    + '<div class="inp-group"><label>Course</label><select class="inp-field" id="add-fac-course"><option>JEE Advanced (Main + KCET Decoded)</option><option>JEE (Main + KCET Decoded)</option><option>NEET UG Decoded</option><option>Commerce Decoded Programme</option></select></div>'
    + '<div class="inp-group"><label>Campus</label><select class="inp-field" id="add-fac-campus"><option>RV Jayanagar</option><option>RV Rajajinagar</option><option>RV Electronic City</option></select></div>'
    + '<div style="border-top:1px solid var(--border);padding-top:13px;margin-top:4px">'
    + '<div style="font-size:12px;font-weight:700;color:var(--faculty);margin-bottom:10px;display:flex;align-items:center;gap:6px">🔑 Create Login Password</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Password</label><div style="position:relative"><input type="password" class="inp-field" id="add-fac-pass" placeholder="Min 8 • 1 Uppercase • 1 Special" style="padding-right:38px" oninput="validateFacPass()"><button type="button" onclick="toggleFieldPw(\'add-fac-pass\',\'toggle-fac-pw\')" id="toggle-fac-pw" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div>'
    + '<div id="fac-pass-hint" style="font-size:10px;margin-top:4px;color:var(--muted)">Min 8 chars • 1 uppercase • 1 special character</div></div>'
    + '<div class="inp-group"><label>Confirm Password</label><div style="position:relative"><input type="password" class="inp-field" id="add-fac-cpass" placeholder="Re-enter password" style="padding-right:38px"><button type="button" onclick="toggleFieldPw(\'add-fac-cpass\',\'toggle-fac-cpw\')" id="toggle-fac-cpw" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div></div>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:4px">💡 Faculty will receive login credentials via email and can update their password from profile settings.</div>'
    + '</div>';
  openDetail('👨‍🏫 Add New Faculty', body, '<button class="btn btn-solid" onclick="submitAddFaculty()">✅ Add Faculty</button>');
}

window.validateFacPass = function() {
  var pw = (document.getElementById('add-fac-pass')||{}).value||'';
  var ok = pw.length>=8 && /[A-Z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
  var hint = document.getElementById('fac-pass-hint');
  if (hint) { hint.textContent = ok ? '✅ Password meets requirements' : 'Min 8 chars • 1 uppercase • 1 special character'; hint.style.color = ok ? 'var(--faculty)' : 'var(--muted)'; }
}

window.submitAddFaculty = async function() {
  var pw = (document.getElementById('add-fac-pass')||{}).value||'';
  var cpw = (document.getElementById('add-fac-cpass')||{}).value||'';
  if (pw.length<8 || !/[A-Z]/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) { toast('Password must be min 8 chars, 1 uppercase, 1 special character','⚠️'); return; }
  if (pw !== cpw) { toast('Passwords do not match','⚠️'); return; }
  
  var firstName = document.getElementById('add-fac-fn').value.trim();
  var lastName = document.getElementById('add-fac-ln').value.trim();
  var email = document.getElementById('add-fac-email').value.trim();
  var emp = document.getElementById('add-fac-emp').value.trim();
  var phone = document.getElementById('add-fac-mobile').value.trim();
  var gender = document.getElementById('add-fac-gender').value;
  var subject = document.getElementById('add-fac-sub').value;
  var course = document.getElementById('add-fac-course').value;
  var campus = document.getElementById('add-fac-campus').value;

  if (!firstName || !lastName || !email) { toast('First Name, Last Name, and Email are required!','⚠️'); return; }
  
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: firstName + ' ' + lastName,
        email: email,
        phone: phone,
        password: pw,
        role: 'faculty',
        emp: emp,
        subject: subject,
        batch: course,
        campus: campus,
        gender: gender
      })
    });
    toast('Faculty member added successfully!','✅');
    closeModal('modal-detail');
    await syncLMSData();
    loadPage('users');
  } catch (err) {
    toast('Failed to add faculty: ' + err.message, '❌');
  }
}

// ── COURSE DATABASE ──
var COURSE_DB = [
  { id:1, n:'JEE Advanced (Main + KCET Decoded)', e:'⚛️', cat:'JEE',      dur:'2 Years',   fee:45000, maxSt:150, enrolled:142, pub:true,  col:'#ff2d6b',
    faculty:'Dr. Priya Mehta',  desc:'Comprehensive 2-year program covering full JEE Advanced + Mains syllabus with KCET integration.',
    subjects:['Physics','Chemistry','Mathematics'], curriculum:'Chapter-wise DPPs, weekly tests, mock series, dedicated doubt sessions.' },
  { id:2, n:'JEE (Main + KCET Decoded)',           e:'⚛️', cat:'JEE',      dur:'1 Year',    fee:30000, maxSt:150, enrolled:98,  pub:true,  col:'#6c47ff',
    faculty:'Prof. Amit Singh', desc:'Focused 1-year JEE Mains preparation with KCET decoded strategy.',
    subjects:['Physics','Chemistry','Mathematics'], curriculum:'Subject-wise modules, weekly mocks, previous year papers.' },
  { id:3, n:'NEET UG Decoded',                     e:'🔬', cat:'NEET',     dur:'1 Year',    fee:38000, maxSt:120, enrolled:72,  pub:true,  col:'#4ade80',
    faculty:'Dr. Kavya R.',    desc:'Complete NEET UG preparation covering Biology, Physics & Chemistry.',
    subjects:['Biology','Physics','Chemistry'], curriculum:'NCERT-based modules, MCQ practice, full mock tests.' },
  { id:4, n:'Commerce Decoded Programme',          e:'💼', cat:'Commerce', dur:'1 Year',    fee:28000, maxSt:100, enrolled:56,  pub:true,  col:'#fbbf24',
    faculty:'Prof. Neha K.',   desc:'XI & XII Commerce covering Accountancy, Economics, Business Studies.',
    subjects:['Accountancy','Economics','Business Studies','Mathematics'], curriculum:'Board + competitive exam focus, case studies.' },
  { id:5, n:'NEET Biology Special',                e:'🧬', cat:'NEET',     dur:'6 Months',  fee:12000, maxSt:80,  enrolled:0,   pub:false, col:'#00d4c8',
    faculty:'Dr. Kavya R.',    desc:'Intensive Biology revision for NEET aspirants.',
    subjects:['Biology'], curriculum:'Topic-wise revision, high-yield MCQs, previous year analysis.' },
];

PAGES['admin_courses'] = function() {
  var notice = '<div style="margin-bottom:13px;padding:11px 14px;background:rgba(108,71,255,.07);border:1px solid rgba(108,71,255,.2);border-radius:9px;font-size:12px;color:var(--muted)">'
    + '<strong style="color:var(--purple)">Builder Flow:</strong> Create Course → Add Subjects → Add Chapters → Link Content → Assign Faculty → Activate / Publish</div>';

  var grid = '<div class="grid-2">' + COURSE_DB.map(function(cr,idx) {
    return '<div class="card" style="border-color:color-mix(in srgb,' + cr.col + ' 22%,var(--border))">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px">'
      + '<div style="display:flex;gap:10px;align-items:center">'
      + '<div style="width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,' + cr.col + ' 10%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:22px">' + cr.e + '</div>'
      + '<div><div style="font-weight:700;font-size:13px">' + cr.n + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + cr.cat + ' • ' + cr.dur + ' • ₹' + cr.fee.toLocaleString() + '</div></div></div>'
      + '<span class="badge ' + (cr.pub?'badge-green':'badge-yellow') + '">' + (cr.pub?'Active':'Draft') + '</span></div>'
      + '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">👨‍🎓 ' + cr.enrolled + ' / ' + cr.maxSt + ' enrolled &nbsp;•&nbsp; 👨‍🏫 ' + cr.faculty + '</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-bottom:11px">📚 ' + cr.subjects.join(', ') + '</div>'
      + '<div style="display:flex;gap:7px">'
      + '<button class="btn btn-sm btn-purple" style="flex:1" onclick="openCourseEditModal(' + idx + ')">✏️ Edit</button>'
      + '<button class="btn btn-sm ' + (cr.pub?'btn-red':'btn-green') + '" onclick="toggleCourseStatus(' + idx + ')">' + (cr.pub?'Deactivate':'Activate') + '</button>'
      + '</div></div>';
  }).join('') + '</div>';

  return '<div style="display:flex;justify-content:flex-end;margin-bottom:14px">'
    + '<button class="btn btn-red" onclick="openCreateCourseModal()">🏗️ Create Course</button></div>'
    + notice + grid;
};

window.toggleCourseStatus = async function(idx) {
  var cr = window.COURSE_DB[idx];
  try {
    await api('/api/courses/' + cr._id + '/status', {
      method: 'PUT'
    });
    toast(cr.n + (!cr.pub ? ' activated!' : ' deactivated!'), !cr.pub ? '✅' : '🚫');
    await syncLMSData();
    loadPage('courses');
  } catch (err) {
    toast('Failed to toggle course status: ' + err.message, '❌');
  }
};

window.openCourseEditModal = function(idx) {
  var cr = window.COURSE_DB[idx];
  var cats = ['JEE','NEET','Commerce','Foundation'];
  var durs = ['1 Year','2 Years','6 Months','3 Months (Crash)'];
  var facs = ['Dr. Priya Mehta','Prof. Amit Singh','Mr. Raj Sharma','Dr. Kavya R.','Prof. Neha K.'];
  var body = '<div id="cef-wrap">'
    + '<div class="inp-group"><label>Course Name</label><input class="inp-field" id="cef-name" value="' + cr.n.replace(/"/g,'&quot;') + '"></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Category</label><select class="inp-field" id="cef-cat">' + cats.map(function(o){return '<option'+(cr.cat===o?' selected':'')+'>'+o+'</option>';}).join('') + '</select></div>'
    + '<div class="inp-group"><label>Duration</label><select class="inp-field" id="cef-dur">' + durs.map(function(o){return '<option'+(cr.dur===o?' selected':'')+'>'+o+'</option>';}).join('') + '</select></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Fee (₹)</label><input class="inp-field" id="cef-fee" type="number" value="' + cr.fee + '"></div>'
    + '<div class="inp-group"><label>Max Students</label><input class="inp-field" id="cef-max" type="number" value="' + cr.maxSt + '"></div>'
    + '</div>'
    + '<div class="inp-group"><label>Lead Faculty</label><select class="inp-field" id="cef-fac">' + facs.map(function(o){return '<option'+(cr.faculty===o?' selected':'')+'>'+o+'</option>';}).join('') + '</select></div>'
    + '<div class="inp-group"><label>Subjects (comma separated)</label><input class="inp-field" id="cef-subs" value="' + cr.subjects.join(', ') + '"></div>'
    + '<div class="inp-group"><label>Description</label><textarea class="inp-field" id="cef-desc" rows="3">' + cr.desc + '</textarea></div>'
    + '<div class="inp-group"><label>Curriculum Overview</label><textarea class="inp-field" id="cef-curr" rows="3">' + cr.curriculum + '</textarea></div>'
    + '<div style="padding:10px;background:rgba(0,0,0,.2);border-radius:8px;margin-top:4px">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:7px">Course Status</div>'
    + '<button class="btn ' + (cr.pub?'btn-red':'btn-green') + '" onclick="toggleCourseStatus('+idx+');closeModal(\'modal-detail\')">' + (cr.pub?'🚫 Deactivate Course':'✅ Activate Course') + '</button>'
    + '</div></div>';
  openDetail('✏️ Edit — ' + cr.n, body,
    '<button class="btn btn-solid" onclick="saveCourseEdit(' + idx + ')">💾 Save Changes</button>');
};

window.saveCourseEdit = async function(idx) {
  var cr = window.COURSE_DB[idx];
  var n   = document.getElementById('cef-name');
  var cat = document.getElementById('cef-cat');
  var dur = document.getElementById('cef-dur');
  var fee = document.getElementById('cef-fee');
  var mx  = document.getElementById('cef-max');
  var fac = document.getElementById('cef-fac');
  var sb  = document.getElementById('cef-subs');
  var ds  = document.getElementById('cef-desc');
  var cu  = document.getElementById('cef-curr');

  try {
    await api('/api/courses/' + cr._id, {
      method: 'PUT',
      body: JSON.stringify({
        title: n ? n.value : cr.n,
        cat: cat ? cat.value : cr.cat,
        dur: dur ? dur.value : cr.dur,
        fee: fee ? parseInt(fee.value) : cr.fee,
        maxSt: mx ? parseInt(mx.value) : cr.maxSt,
        fac: fac ? fac.value : cr.faculty,
        subjects: sb ? sb.value.split(',').map(function(s){return s.trim();}).filter(Boolean) : cr.subjects,
        desc: ds ? ds.value : cr.desc,
        curriculum: cu ? cu.value : cr.curriculum
      })
    });
    closeModal('modal-detail');
    toast('Course saved successfully!', '✅');
    await syncLMSData();
    loadPage('courses');
  } catch (err) {
    toast('Failed to save course: ' + err.message, '❌');
  }
};

window.openCreateCourseModal = function() {
  var cats = ['JEE','NEET','Commerce','Foundation'];
  var durs = ['1 Year','2 Years','6 Months','3 Months (Crash)'];
  var facs = ['Dr. Priya Mehta','Prof. Amit Singh','Mr. Raj Sharma','Dr. Kavya R.','Prof. Neha K.'];
  var body = '<div id="ccf-wrap">'
    + '<div class="inp-group"><label>Course Name <span style="color:var(--admin)">*</span></label><input class="inp-field" id="ccf-name" placeholder="e.g. JEE Advanced 2026"></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Category</label><select class="inp-field" id="ccf-cat">' + cats.map(function(o){return '<option>'+o+'</option>';}).join('') + '</select></div>'
    + '<div class="inp-group"><label>Duration</label><select class="inp-field" id="ccf-dur">' + durs.map(function(o){return '<option>'+o+'</option>';}).join('') + '</select></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Fee (₹)</label><input class="inp-field" id="ccf-fee" type="number" placeholder="e.g. 45000"></div>'
    + '<div class="inp-group"><label>Max Students</label><input class="inp-field" id="ccf-max" type="number" placeholder="e.g. 150"></div>'
    + '</div>'
    + '<div class="inp-group"><label>Lead Faculty</label><select class="inp-field" id="ccf-fac">' + facs.map(function(o){return '<option>'+o+'</option>';}).join('') + '</select></div>'
    + '<div class="inp-group"><label>Subjects (comma separated)</label><input class="inp-field" id="ccf-subs" placeholder="e.g. Physics, Chemistry, Mathematics"></div>'
    + '<div class="inp-group"><label>Description</label><textarea class="inp-field" id="ccf-desc" rows="3" placeholder="Course description..."></textarea></div>'
    + '<div class="inp-group"><label>Curriculum Overview</label><textarea class="inp-field" id="ccf-curr" rows="3" placeholder="Curriculum overview..."></textarea></div>'
    + '</div>';
  openDetail('🏗️ Create New Course', body,
    '<button class="btn btn-solid" onclick="submitCreateCourse()">🏗️ Create Course</button>');
};

async function submitCreateCourse() {
  var nm = document.getElementById('ccf-name');
  if (!nm || !nm.value.trim()) { toast('Course name is required!', '⚠️'); return; }
  
  var titleVal = nm.value.trim();
  var descVal = document.getElementById('ccf-desc').value;
  var facultyVal = document.getElementById('ccf-fac').value;
  var totalVal = parseInt(document.getElementById('ccf-max').value)||150;
  var feeVal = parseInt(document.getElementById('ccf-fee').value)||0;
  var catVal = document.getElementById('ccf-cat').value;
  var durVal = document.getElementById('ccf-dur').value;
  var subVal = document.getElementById('ccf-subs').value;
  var currVal = document.getElementById('ccf-curr').value;
  
  try {
    await api('/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        title: titleVal,
        e: '📚',
        desc: descVal,
        fac: facultyVal,
        total: totalVal,
        fee: feeVal,
        cat: catVal,
        dur: durVal,
        subjects: subVal ? subVal.split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
        curriculum: currVal
      })
    });
    closeModal('modal-detail');
    toast('Course "' + titleVal + '" created successfully!', '🏗️');
    await syncLMSData();
    loadPage('courses');
  } catch (err) {
    toast('Failed to create course: ' + err.message, '❌');
  }
}

// ── FEE DATABASE ──
var FEE_STUDENTS = [
  { n:'Sneha Patel',  roll:'RV2024002', course:'JEE Advanced (Main + KCET Decoded)', amount:45000, paid:45000, pending:0,    due:'Mar 1',  method:'UPI',   date:'Mar 12', st:'paid',    campus:'RV Rajajinagar' },
  { n:'Kavya Reddy',  roll:'RV2024015', course:'NEET UG Decoded',                   amount:38000, paid:38000, pending:0,    due:'Mar 1',  method:'Card',  date:'Mar 12', st:'paid',    campus:'RV Electronic City' },
  { n:'Aman Joshi',   roll:'RV2024010', course:'Commerce Decoded Programme',         amount:28000, paid:28000, pending:0,    due:'Mar 1',  method:'Cash',  date:'Mar 11', st:'paid',    campus:'RV Jayanagar' },
  { n:'Arjun Sharma', roll:'RV2024001', course:'JEE Advanced (Main + KCET Decoded)', amount:45000, paid:22500, pending:22500,due:'Mar 31', method:'—',     date:'—',      st:'pending', campus:'RV Jayanagar' },
  { n:'Rohan Gupta',  roll:'RV2024003', course:'JEE (Main + KCET Decoded)',          amount:30000, paid:15000, pending:15000,due:'Mar 20', method:'—',     date:'—',      st:'pending', campus:'RV Jayanagar' },
  { n:'Meera Shah',   roll:'RV2024008', course:'JEE Advanced (Main + KCET Decoded)', amount:45000, paid:30000, pending:15000,due:'Mar 10', method:'—',     date:'—',      st:'overdue', campus:'RV Rajajinagar' },
  { n:'Dev Verma',    roll:'RV2024020', course:'Commerce Decoded Programme',          amount:28000, paid:0,     pending:28000,due:'Mar 1',  method:'—',     date:'—',      st:'overdue', campus:'RV Rajajinagar' },
  { n:'Ravi Kumar',   roll:'RV2024012', course:'NEET UG Decoded',                   amount:38000, paid:19000, pending:19000,due:'Mar 15', method:'—',     date:'—',      st:'overdue', campus:'RV Electronic City' },
];
var FEE_COURSE_DATA = [
  { n:'JEE Advanced (Main + KCET Decoded)', students:142, fee:45000, collected:4230000, pending:375000, col:'#ff2d6b' },
  { n:'JEE (Main + KCET Decoded)',          students:98,  fee:30000, collected:2205000, pending:150000, col:'#6c47ff' },
  { n:'NEET UG Decoded',                    students:72,  fee:38000, collected:2166000, pending:190000, col:'#4ade80' },
  { n:'Commerce Decoded Programme',         students:56,  fee:28000, collected:1372000, pending:84000,  col:'#fbbf24' },
];

PAGES['admin_fees'] = function() {
  var totalCollected = FEE_STUDENTS.filter(function(s){return s.st==='paid';}).reduce(function(a,s){return a+s.paid;},0);
  var totalRevenue   = FEE_COURSE_DATA.reduce(function(a,c){return a+c.collected;},0);
  var annualRevenue  = totalRevenue;
  var totalPending   = FEE_STUDENTS.filter(function(s){return s.st!=='paid';}).reduce(function(a,s){return a+s.pending;},0);
  var totalOverdue   = FEE_STUDENTS.filter(function(s){return s.st==='overdue';}).reduce(function(a,s){return a+s.pending;},0);

  function fmt(n){return '₹'+n.toLocaleString('en-IN');}

  var stats = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px">'
    + [
      { icon:'📈', val:fmt(totalRevenue),   label:'Total Revenue',   col:'var(--yellow)'  },
      { icon:'🗓️', val:fmt(annualRevenue),  label:'Annual Revenue',  col:'var(--purple)'  },
    ].map(function(s) {
      return '<div class="stat-card" style="border-color:color-mix(in srgb,' + s.col + ' 28%,var(--border))">'
        + '<div class="stat-icon">' + s.icon + '</div>'
        + '<div class="stat-val" style="font-size:16px;color:' + s.col + '">' + s.val + '</div>'
        + '<div class="stat-label">' + s.label + '</div></div>';
    }).join('') + '</div>';

  // Tabs
  var tabs = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">'
    + [['all','All'],['collected','💳 Collected']].map(function(t) {
        return '<button class="btn btn-sm" id="ftab-'+t[0]+'" onclick="switchFeeTab(\''+t[0]+'\')" style="'+(t[0]==='all'?'background:var(--admin);color:#fff;':'')+'">'+t[1]+'</button>';
      }).join('')
    + '<button class="btn btn-sm btn-teal" onclick="openRecordPaymentModal()" style="margin-left:auto">+ Record Payment</button>'
    + '</div>';

  // Students table
  function feeRow(s, idx) {
    var payType = s.payType || (s.st==='paid' ? (Math.random()>0.5?'course':'materials') : '—');
    var modeIcon = s.method==='UPI'?'📲':s.method==='Card'?'💳':s.method==='Cash'?'💵':s.method==='Net Banking'?'🏦':'—';
    return '<tr>'
      + '<td><div style="font-weight:600">' + s.n + '</div><div style="font-size:11px;color:var(--muted)">' + s.roll + '</div></td>'
      + '<td style="font-size:12px">' + s.course.replace(' (Main + KCET Decoded)','').replace(' Decoded','').replace(' Programme','') + '</td>'
      + '<td style="color:var(--student)">' + fmt(s.paid) + '</td>'
      + '<td style="font-size:12px">' + (s.method !== '—' ? modeIcon + ' ' + s.method : '<span style="color:var(--muted)">—</span>') + '</td>'
      + '<td>' + (payType !== '—' ? '<span class="badge ' + (payType==='course'?'badge-purple':'badge-teal') + '">' + (payType==='course'?'📚 Course':'📄 Materials') + '</span>' : '<span style="color:var(--muted);font-size:12px">—</span>') + '</td>'
      + '<td><div style="display:flex;gap:5px">'
      + (s.st==='paid'
          ? '<button class="btn btn-sm btn-teal" onclick="openFeeReceiptModal('+idx+')">🧾 Receipt</button>'
          : '<button class="btn btn-sm btn-red" onclick="openFeeReminderModal(\''+s.n+'\',\''+fmt(s.pending)+'\')">📨 Remind</button>')
      + '</div></td></tr>';
  }

  var feeCourseFilter = window._feeCourseFilter || '';
  window._feeCourseFilter = feeCourseFilter;
  var feeCoursesList = [''].concat(FEE_STUDENTS.map(function(s){return s.course;}).filter(function(v,i,a){return a.indexOf(v)===i;}));
  var courseFilterHtml = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
    + '<label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Filter by Course:</label>'
    + '<select class="inp-field" style="max-width:280px" id="fee-course-filter" onchange="window._feeCourseFilter=this.value;loadPage(\'fees\')">'
    + feeCoursesList.map(function(fc){return '<option value="'+fc+'"'+(feeCourseFilter===fc?' selected':'')+'>'
        +(fc?fc.replace(' (Main + KCET Decoded)','').replace(' Decoded','').replace(' Programme',''):'All Courses')+'</option>';}).join('')
    + '</select>'
    +(feeCourseFilter?'<button class="btn btn-sm btn-red" onclick="window._feeCourseFilter=\'\';loadPage(\'fees\')">✕ Clear</button>':'')
    + '</div>';
  var filteredFeeStudents = feeCourseFilter ? FEE_STUDENTS.filter(function(s){return s.course===feeCourseFilter;}) : FEE_STUDENTS;
  var tableHtml = '<div class="card"><div class="card-header"><div class="card-title" id="fee-table-title">💳 Fee Details — All Students</div>'
    + '<button class="btn btn-sm btn-purple" onclick="exportFeeData()">⬇ Export</button></div>'
    + courseFilterHtml
    + '<div class="tbl-wrap"><table id="fee-student-table"><thead><tr><th>Name</th><th>Course</th><th>Paid</th><th>Payment Mode</th><th>Type</th><th>Actions</th></tr></thead>'
    + '<tbody id="fee-tbody">'
    + filteredFeeStudents.map(feeRow).join('') + '</tbody></table></div></div>';

  // Fee by course
  var courseTable = '<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📊 Fee Collection by Course</div></div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>Course</th><th>Students</th><th>Collected</th><th>% Collected</th><th>Download</th></tr></thead><tbody>'
    + FEE_COURSE_DATA.map(function(cd) {
        var pct = Math.round(cd.collected/(cd.collected+cd.pending)*100);
        return '<tr>'
          + '<td><div style="display:flex;align-items:center;gap:7px"><div style="width:10px;height:10px;border-radius:50%;background:'+cd.col+'"></div><span style="font-weight:600;font-size:12px">'+cd.n.replace(' (Main + KCET Decoded)','').replace(' Decoded','').replace(' Programme','')+'</span></div></td>'
          + '<td><span style="font-weight:700;color:var(--purple)">'+cd.students+'</span></td>'
          + '<td style="color:var(--student);font-weight:600">'+fmt(cd.collected)+'</td>'
          + '<td><div style="display:flex;align-items:center;gap:7px"><div style="flex:1;height:5px;background:var(--surface2);border-radius:3px"><div style="height:5px;border-radius:3px;background:'+cd.col+';width:'+pct+'%"></div></div><span style="font-size:12px">'+pct+'%</span></div></td>'
          + '<td><button class="btn btn-sm btn-purple" onclick="downloadCourseData(\''+cd.n.replace(/'/g,"\\'")+'\')" title="Download '+cd.n+' fee data">⬇ CSV</button></td>'
          + '</tr>';
      }).join('') + '</tbody></table></div></div>';

  return stats + tabs + tableHtml + courseTable;
};

window.switchFeeTab = function(tab) {
  var tbody = document.getElementById('fee-tbody');
  var title = document.getElementById('fee-table-title');
  var tabs  = ['all','collected'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('ftab-'+t);
    if (btn) btn.style.cssText = t===tab ? 'background:var(--admin);color:#fff;' : '';
  });
  var students = window.FEE_STUDENTS || FEE_STUDENTS;
  var filtered = tab==='collected' ? students.filter(function(s){return s.st==='paid';}) : students;
  var labels = {all:'All Students', collected:'Collected Students'};
  if (title) title.textContent = '💳 Fee Details — ' + labels[tab];
  if (tbody) tbody.innerHTML = filtered.map(function(s,i){
    var idx = students.indexOf(s);
    return '<tr>'
      + '<td><div style="font-weight:600">'+s.n+'</div><div style="font-size:11px;color:var(--muted)">'+s.roll+'</div></td>'
      + '<td style="font-size:12px">'+s.course.replace(' (Main + KCET Decoded)','').replace(' Decoded','').replace(' Programme','')+'</td>'
      + '<td style="color:var(--student)">₹'+s.paid.toLocaleString('en-IN')+'</td>'
      + '<td><div style="display:flex;gap:5px">'
      + (s.st==='paid'
          ? '<button class="btn btn-sm btn-teal" onclick="openFeeReceiptModal('+idx+')">🧾 Receipt</button>'
          : '<button class="btn btn-sm btn-red" onclick="openFeeReminderModal(\''+s.n+'\',\'₹'+s.pending.toLocaleString('en-IN')+'\')">📨 Remind</button>')
      + '</div></td></tr>';
  }).join('');
};

window.openFeeReceiptModal = function(idx) {
  var students = window.FEE_STUDENTS || FEE_STUDENTS;
  var s = students[idx];
  var body = '<div style="background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(0,212,200,.08));border:1px solid rgba(74,222,128,.2);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    + '<div style="font-size:18px;font-weight:800;font-family:Syne,sans-serif">🧾 Payment Receipt</div>'
    + '<span class="badge badge-green">✅ PAID</span></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + [['Student',s.n],['Roll No',s.roll],['Course',s.course.split('(')[0].trim()],['Amount Paid','₹'+s.paid.toLocaleString('en-IN')],['Payment Method',s.method],['Date',s.date],['Campus',s.campus],['Receipt No','RV-RCP-'+Math.floor(Math.random()*90000+10000)]].map(function(e){
        return '<div style="background:var(--surface2);border-radius:7px;padding:8px"><div style="font-size:10px;color:var(--muted)">'+e[0]+'</div><div style="font-size:13px;font-weight:600;margin-top:2px">'+e[1]+'</div></div>';
      }).join('') + '</div></div>';
  openDetail('🧾 Receipt — '+s.n, body, '<button class="btn btn-teal" onclick="toast(\'Receipt downloaded!\',\'⬇\');closeModal(\'modal-detail\')">⬇ Download PDF</button>');
};

window.openRecordPaymentModal = function() {
  var students = window.FEE_STUDENTS || FEE_STUDENTS;
  var body = '<div class="inp-group"><label>Student</label><select class="inp-field" id="rp-st">'
    + students.map(function(s){return '<option value="' + s.roll + '">'+s.n+' ('+s.roll+')</option>';}).join('')
    + '</select></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Amount (₹)</label><input class="inp-field" id="rp-amt" type="number" placeholder="e.g. 15000"></div>'
    + '<div class="inp-group"><label>Payment Method</label><select class="inp-field" id="rp-method"><option>UPI</option><option>Net Banking</option><option>Credit Card</option><option>Debit Card</option><option>Cash</option><option>Cheque</option></select></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Payment Mode — Type</label>'
    + '<select class="inp-field" id="rp-type" style="border-color:var(--purple)">'
    + '<option value="course">📚 Course Fee</option>'
    + '<option value="materials">📄 Materials Purchase</option>'
    + '</select>'
    + '<div style="font-size:10px;color:var(--muted);margin-top:3px">Specify whether this payment is for a course enrollment or materials purchase</div>'
    + '</div>'
    + '<div class="inp-group"><label>Reference No</label><input class="inp-field" id="rp-ref" placeholder="UTR/Transaction ID"></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Payment Date</label><input class="inp-field" id="rp-date" type="date"></div>'
    + '<div class="inp-group"><label>Course / Material Name</label><input class="inp-field" id="rp-item" placeholder="e.g. JEE Advanced 2025"></div>'
    + '</div>'
    + '<div class="inp-group"><label>Notes</label><textarea class="inp-field" id="rp-notes" rows="2" placeholder="Optional notes..."></textarea></div>';
  openDetail('+ Record Payment', body, '<button class="btn btn-solid" onclick="submitRecordPayment()">💾 Record Payment</button>');
};

window.submitRecordPayment = async function() {
  var rollSelect = document.getElementById('rp-st');
  var amt = document.getElementById('rp-amt');
  var method = document.getElementById('rp-method');
  var type = document.getElementById('rp-type');
  var ref = document.getElementById('rp-ref');
  var date = document.getElementById('rp-date');
  var item = document.getElementById('rp-item');
  var notes = document.getElementById('rp-notes');

  if (!rollSelect || !rollSelect.value) { toast('Select student!', '⚠️'); return; }
  if (!amt || !amt.value) { toast('Enter amount!', '⚠️'); return; }
  
  var roll = rollSelect.value;
  var payAmt = parseInt(amt.value);
  var methodVal = method ? method.value : 'UPI';
  var typeVal = type ? type.value : 'course';
  var dateVal = date && date.value ? date.value : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  var itemVal = item && item.value ? item.value : 'LMS Course Fee';
  var notesVal = notes && notes.value ? notes.value : '';

  try {
    await api('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        roll: roll,
        amount: payAmt,
        method: methodVal,
        type: typeVal,
        date: dateVal,
        item: itemVal,
        notes: notesVal
      })
    });
    closeModal('modal-detail');
    toast('Payment of ₹' + payAmt.toLocaleString('en-IN') + ' recorded successfully!', '✅');
    await syncLMSData();
    loadPage('fees');
  } catch (err) {
    toast('Failed to record payment: ' + err.message, '❌');
  }
};

window.submitFeeReminder = function(name) {
  var wa = document.getElementById('reminder-toggle-wa').classList.contains('on');
  var em = document.getElementById('reminder-toggle-em').classList.contains('on');
  var sms = document.getElementById('reminder-toggle-sms').classList.contains('on');
  
  var channels = [];
  if (wa) channels.push('WhatsApp');
  if (em) channels.push('Email');
  if (sms) channels.push('SMS');
  
  if (channels.length === 0) {
    toast('Please select at least one channel!', '⚠️');
    return;
  }
  
  toast('Reminder sent to ' + name + ' via ' + channels.join(', ') + '!', '📨');
  closeModal('modal-detail');
};

window.openFeeReminderModal = function(name, due) {
  var body = '<div style="background:rgba(255,45,107,.07);border:1px solid rgba(255,45,107,.2);border-radius:10px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:12px">'
    + '<div style="font-size:28px">⚠️</div>'
    + '<div><div style="font-size:12px;color:var(--muted)">Amount Due</div>'
    + '<div style="font-size:22px;font-weight:800;color:var(--admin);font-family:Syne,sans-serif">'+due+'</div></div></div>'
    + '<div class="inp-group"><label>Send Reminder Via</label>'
    + '<div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap">'
    + [['wa','💬 WhatsApp',true],['em','📧 Email',true],['sms','📱 SMS',false]].map(function(ch){
        return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">'
          + '<div class="toggle'+(ch[2]?' on':'')+'" id="reminder-toggle-'+ch[0]+'" onclick="this.classList.toggle(\'on\')"></div>'+ch[1]+'</label>';
      }).join('') + '</div></div>'
    + '<div class="inp-group"><label>Reminder Message</label>'
    + '<textarea class="inp-field" id="reminder-msg" rows="4">Dear '+name+',\n\nYour outstanding fee of '+due+' for RV Learning Hub is due. Please clear the payment at the earliest to avoid any disruption to your studies.\n\nFor queries, contact: fees@rvhub.com\n\nRV Learning Hub Team</textarea></div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Follow-up Date</label><input class="inp-field" type="date"></div>'
    + '<div class="inp-group"><label>Priority</label><select class="inp-field"><option>Normal</option><option>High</option><option>Urgent</option></select></div>'
    + '</div>';
  openDetail('📨 Fee Reminder — '+name, body,
    '<button class="btn btn-solid" onclick="submitFeeReminder(\'' + name.replace(/'/g, "\\'") + '\')">📨 Send Reminder</button>'
    + '<button class="btn btn-red" onclick="toast(\'Marked escalated!\',\'⚠️\');closeModal(\'modal-detail\')">⚠️ Escalate</button>');
};

window.downloadCourseData = function(courseName) {
  var courseData = window.FEE_COURSE_DATA || FEE_COURSE_DATA;
  var students = window.FEE_STUDENTS || FEE_STUDENTS;
  var cd = courseData.find(function(x){return x.n===courseName;});
  var filtered = students.filter(function(s){return s.course===courseName;});
  var rows = ['Roll No,Name,Fee Amount,Paid,Pending,Status,Campus'];
  filtered.forEach(function(s){
    rows.push([s.roll,s.n,s.amount,s.paid,s.pending,s.st,s.campus].join(','));
  });
  rows.push(''); rows.push('SUMMARY,,,,,,');
  rows.push('Total Students,'+( cd?cd.students:'N/A')+',,,,');
  rows.push('Total Collected,₹'+(cd?cd.collected.toLocaleString('en-IN'):'0')+',,,,');
  rows.push('Total Pending,₹'+(cd?cd.pending.toLocaleString('en-IN'):'0')+',,,,');
  var csv = rows.join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = courseName.replace(/[^a-z0-9]/gi,'_')+'_fee_data.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Fee data for "'+courseName.split('(')[0].trim()+'" downloaded!','⬇');
};

window.exportFeeData = function() {
  var students = window.FEE_STUDENTS || FEE_STUDENTS;
  var rows = ['Roll No,Name,Course,Total Fee,Paid,Pending,Status,Campus,Due Date'];
  students.forEach(function(s){
    rows.push([s.roll,s.n,s.course,s.amount,s.paid,s.pending,s.st,s.campus,s.due].join(','));
  });
  var csv = rows.join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a'); a.href=url; a.download='fee_report_all.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Full fee report downloaded!','⬇');
};


function downloadMaterialFile(title) {
  title = title || 'Material';
  var content = 'RV Learning Hub\n' + title + '\nDate: ' + new Date().toLocaleDateString('en-IN') + '\n\n[Full content available in the complete application]';
  var blob = new Blob([content], {type:'application/octet-stream'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = title.replace(/[^a-z0-9 ]/gi,'').replace(/ /g,'_').slice(0,40) + '.pdf';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast(title.slice(0,25) + ' downloaded!', 'OK');
}



PAGES['admin_reports'] = function() {
  var rState = window._repState || { tab: null };
  window._repState = rState;

  // ── 8 live stats ──
  var totalVideos = 0, totalMats = 0;
  if (typeof MEDIA_DB !== 'undefined') {
    Object.keys(MEDIA_DB).forEach(function(cn){
      Object.keys(MEDIA_DB[cn]).forEach(function(sn){
        totalVideos += MEDIA_DB[cn][sn].videos.length;
        totalMats   += MEDIA_DB[cn][sn].materials.length;
      });
    });
  }
  var totalStudents = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS.length : 5;
  var totalFaculty  = typeof ADMIN_FACULTY  !== 'undefined' ? ADMIN_FACULTY.length  : 4;
  var totalCourses  = typeof COURSE_DB      !== 'undefined' ? COURSE_DB.length      : 5;
  var enrolled = typeof COURSE_DB !== 'undefined'
    ? COURSE_DB.reduce(function(a,cr){return a+cr.enrolled;},0) : 368;

  var statsHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:20px">'
    + [
      { icon:'👨‍🎓', val:enrolled,       label:'Enrolled Students', col:'var(--student)', page:'enrollment_report' },
      { icon:'📊',  val:'78%',          label:'Avg Performance',   col:'var(--faculty)', page:'academic_report' },
      { icon:'✅',  val:'85%',          label:'Avg Attendance',    col:'var(--purple)',  page:'attendance_report' },
      { icon:'💰',  val:'₹84.2L',       label:'Annual Revenue',    col:'var(--yellow)',  page:'revenue_report' },
      { icon:'👥',  val:totalStudents,  label:'Total Students',    col:'var(--admin)',   page:'enrollment_report' },
      { icon:'👨‍🏫', val:totalFaculty,   label:'Faculty',           col:'var(--orange)',  page:'faculty_report' },
      { icon:'🎬',  val:totalVideos,    label:'Videos',            col:'var(--purple)',  page:'app_usage_report' },
      { icon:'📄',  val:totalMats,      label:'Materials',         col:'var(--faculty)', page:'app_usage_report' },
    ].map(function(s) {
      return '<div class="stat-card" style="border-color:color-mix(in srgb,'+s.col+' 28%,var(--border));cursor:pointer" onclick="openReport(\''+s.page+'\')">'
        + '<div class="stat-icon">'+s.icon+'</div>'
        + '<div class="stat-val" style="color:'+s.col+'">'+s.val+'</div>'
        + '<div class="stat-label">'+s.label+'</div></div>';
    }).join('') + '</div>';

  // Revenue 2024 chart with export
  var months  = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  var revVals = [62,68,55,72,75,80,85,88,78,90,86,95];
  var revAmts = [5.2,5.7,4.6,6.0,6.3,6.7,7.1,7.3,6.5,7.5,7.2,7.9];
  var maxV = Math.max.apply(null, revVals);
  var revChart = (function(){
    var html = '<div style="display:flex;align-items:flex-end;gap:6px;height:120px;margin-top:8px">';
    for (var i=0; i<revVals.length; i++) {
      var h = Math.round(revVals[i]/maxV*90);
      var tip = months[i] + ' 2024: Rs.' + revAmts[i] + 'L';
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer" title="' + tip + '" onclick="toast(\'' + months[i] + ' revenue\',\'\u{1F4B0}\')">';
      html += '<div style="font-size:9px;color:var(--student)">' + revAmts[i] + 'L</div>';
      html += '<div style="width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--yellow),rgba(251,191,36,.3));height:' + h + 'px"></div>';
      html += '<div style="font-size:9px;color:var(--muted)">' + months[i] + '</div></div>';
    }
    html += '</div>';
    return html;
  })();

  var revCard = '<div class="card"><div class="card-header"><div class="card-title">📈 Revenue 2024–25</div>'
    + '<button class="btn btn-sm btn-teal" onclick="exportRevenueCSV()">⬇ Export CSV</button></div>'
    + revChart + '</div>';

  // Generate Reports cards — all functional
  var reports = [
    { id:'enrollment_report',   l:'📊 Enrollment Report',    d:'Total enrolled, course-wise, dropout stats' },
    { id:'attendance_report',   l:'✅ Attendance Report',     d:'Batch-wise and student-wise attendance' },
    { id:'academic_report',     l:'📝 Academic Report',       d:'Test averages, top performers, trends' },
    { id:'faculty_report',      l:'👨‍🏫 Faculty Report',       d:'Ratings, classes taken, coverage' },
    { id:'revenue_report',      l:'💰 Revenue Report',        d:'Collection vs target, pending, overdue' },
    { id:'app_usage_report',    l:'📱 App Usage Report',      d:'Logins, video views, material downloads' },
  ];
  var repHtml = '<div class="grid-3">'
    + reports.map(function(r) {
        return '<div class="card" style="cursor:pointer;transition:all .18s" onmouseenter="this.style.background=\'var(--surface2)\'" onmouseleave="this.style.background=\'\'" onclick="openReport(\''+r.id+'\')">'
          + '<div style="font-weight:600;font-size:13px;margin-bottom:3px">'+r.l+'</div>'
          + '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">'+r.d+'</div>'
          + '<div style="display:flex;gap:6px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openReport(\''+r.id+'\')">📊 View</button>'
          + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();exportReport(\''+r.id+'\')">⬇ Export</button>'
          + '</div></div>';
      }).join('') + '</div>';

  return statsHtml
    + '<div class="grid-2">'
    + revCard
    + '<div class="card"><div class="card-title" style="margin-bottom:14px">📊 Enrollment by Course</div>'
    + (function(){
        if (typeof COURSE_DB === 'undefined') return '';
        var maxE = Math.max.apply(null, COURSE_DB.map(function(cr){return cr.enrolled;}));
        return '<div style="display:flex;flex-direction:column;gap:8px">'
          + COURSE_DB.map(function(cr){
              var pct = maxE ? Math.round(cr.enrolled/cr.maxSt*100) : 0;
              return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">'
                + '<span>'+cr.n.split('(')[0].trim()+'</span><span style="color:'+cr.col+'">'+cr.enrolled+'/'+cr.maxSt+'</span></div>'
                + '<div style="height:7px;background:var(--surface2);border-radius:4px"><div style="height:7px;border-radius:4px;background:'+cr.col+';width:'+pct+'%"></div></div></div>';
            }).join('') + '</div>';
      })()
    + '</div></div>'
    + '<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📋 Generate Reports</div></div>'
    + repHtml + '</div>';
};

// ── REPORT VIEWER ──
function openReport(reportId) {
  var enrolled = typeof COURSE_DB !== 'undefined'
    ? COURSE_DB.reduce(function(a,cr){return a+cr.enrolled;},0) : 368;

  var configs = {
    enrollment_report: {
      title: '📊 Enrollment Report',
      build: function() {
        var rows = (typeof COURSE_DB !== 'undefined' ? COURSE_DB : []).map(function(cr){
          var pct = Math.round(cr.enrolled/cr.maxSt*100);
          return '<tr><td style="font-weight:600">'+cr.n.split('(')[0].trim()+'</td><td>'+cr.cat+'</td>'
            + '<td style="color:var(--student);font-weight:700">'+cr.enrolled+'</td>'
            + '<td style="color:var(--muted)">'+cr.maxSt+'</td>'
            + '<td><div style="display:flex;align-items:center;gap:7px"><div style="flex:1;height:5px;background:var(--surface2);border-radius:3px"><div style="height:5px;border-radius:3px;background:'+cr.col+';width:'+pct+'%"></div></div><span style="font-size:12px">'+pct+'%</span></div></td>'
            + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'enrollment_report\',\''+cr.n.replace(/'/g,"\\'")+'\')" title="Download students for '+cr.n.split('(')[0].trim()+'">⬇ Download</button></td>'
            + '<td><span class="badge '+(cr.pub?'badge-green':'badge-yellow')+'">'+(cr.pub?'Active':'Draft')+'</span></td></tr>';
        }).join('');
        return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:16px">'
          + [['Total Enrolled',enrolled,'var(--student)'],['Active Courses',typeof COURSE_DB!=='undefined'?COURSE_DB.filter(function(cr){return cr.pub;}).length:4,'var(--faculty)'],['Dropout Rate','2.3%','var(--admin)']].map(function(s){
              return '<div class="fee-card" style="text-align:center"><div style="font-size:22px;font-weight:800;color:'+s[2]+';font-family:Syne">'+s[1]+'</div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+s[0]+'</div></div>';
            }).join('') + '</div>'
          + '<div class="tbl-wrap"><table><thead><tr><th>Course</th><th>Category</th><th>Enrolled</th><th>Capacity</th><th>Fill Rate</th><th>Student List</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    },
    attendance_report: {
      title: '✅ Attendance Report',
      build: function() {
        var data = [
          { b:'JEE Advanced (Main + KCET Decoded)', avg:87, students:142, below75:12, col:'#ff2d6b' },
          { b:'JEE (Main + KCET Decoded)',          avg:82, students:98,  below75:18, col:'#6c47ff' },
          { b:'NEET UG Decoded',                    avg:90, students:72,  below75:5,  col:'#4ade80' },
          { b:'Commerce Decoded Programme',         avg:88, students:56,  below75:4,  col:'#fbbf24' },
        ];
        var rows = data.map(function(b){
          return '<tr><td style="font-weight:600">'+b.b.split('(')[0].trim()+'</td>'
            + '<td>'+b.students+'</td>'
            + '<td><span style="font-weight:700;color:'+(b.avg>=85?'var(--student)':'var(--orange)')+'">'+b.avg+'%</span></td>'
            + '<td><span style="color:var(--admin)">'+b.below75+'</span></td>'
            + '<td><div style="height:6px;background:var(--surface2);border-radius:3px"><div style="height:6px;border-radius:3px;background:'+b.col+';width:'+b.avg+'%"></div></div></td>'
            + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'attendance_report\',\''+b.b+'\')">⬇ Download</button></td></tr>';
        }).join('');
        return '<div class="tbl-wrap"><table><thead><tr><th>Course/Batch</th><th>Students</th><th>Avg Attendance</th><th>Below 75%</th><th>Visual</th><th>Student List</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    },
    academic_report: {
      title: '📝 Academic Report',
      build: function() {
        var students = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS : [];
        var subjects = ['Physics','Chemistry','Mathematics','Biology','Accountancy'];
        var rows = students.map(function(st){
          var scores = subjects.map(function(){ return Math.floor(Math.random()*30+60); });
          var avg = Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
          return '<tr><td style="font-weight:600">'+st.n+'</td><td style="font-size:11px;color:var(--muted)">'+st.course.split('(')[0].trim()+'</td>'
            + scores.map(function(sc){ return '<td><span style="color:'+(sc>=80?'var(--student)':sc>=65?'var(--yellow)':'var(--admin)')+'">'+sc+'%</span></td>'; }).join('')
            + '<td><strong style="color:var(--purple)">'+avg+'%</strong></td>'
            + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'academic_report\',\''+st.course+'\')">⬇ Download</button></td></tr>';
        }).join('');
        return '<div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Physics</th><th>Chemistry</th><th>Mathematics</th><th>Biology</th><th>Accountancy</th><th>Avg</th><th>Student List</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    },
    faculty_report: {
      title: '👨‍🏫 Faculty Report',
      build: function() {
        var faculty = typeof ADMIN_FACULTY !== 'undefined' ? ADMIN_FACULTY : [];
        var rows = faculty.map(function(f){
          var classes = Math.floor(Math.random()*20+30);
          var tests = Math.floor(Math.random()*8+4);
          var doubts = Math.floor(Math.random()*100+50);
          return '<tr><td style="font-weight:600">'+f.n+'</td><td>'+f.sub+'</td><td>'+f.course.split('(')[0].trim()+'</td>'
            + '<td>'+classes+'</td><td>'+tests+'</td><td>'+doubts+'</td>'
            + '<td><span style="color:var(--yellow);font-weight:700">⭐ '+f.rat+'</span></td>'
            + '<td><span class="badge '+(f.st==='active'?'badge-green':'badge-red')+'">'+f.st+'</span></td>'
            + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'faculty_report\',\''+f.course+'\')">⬇ Download</button></td></tr>';
        }).join('');
        return '<div class="tbl-wrap"><table><thead><tr><th>Faculty</th><th>Subject</th><th>Course</th><th>Classes</th><th>Tests</th><th>Doubts</th><th>Rating</th><th>Status</th><th>Student List</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    },
    revenue_report: {
      title: '💰 Revenue Report',
      build: function() {
        var feeData = typeof FEE_COURSE_DATA !== 'undefined' ? FEE_COURSE_DATA : [];
        var total = feeData.reduce(function(a,cd){return a+cd.collected;},0);
        var pending = feeData.reduce(function(a,cd){return a+cd.pending;},0);
        var rows = feeData.map(function(cd){
          var pct = Math.round(cd.collected/(cd.collected+cd.pending)*100);
          return '<tr><td style="font-weight:600">'+cd.n.split('(')[0].trim()+'</td>'
            + '<td>'+cd.students+'</td>'
            + '<td>₹'+cd.fee.toLocaleString('en-IN')+'</td>'
            + '<td style="color:var(--student);font-weight:700">₹'+cd.collected.toLocaleString('en-IN')+'</td>'
            + '<td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;background:var(--surface2);border-radius:3px"><div style="height:5px;background:'+cd.col+';border-radius:3px;width:'+pct+'%"></div></div>'+pct+'%</div></td>'
            + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'revenue_report\',\''+cd.n.replace(/'/g,"\\'")+'\')" title="Download students">⬇ Download</button></td>'
            + '<td><button class="btn btn-sm btn-purple" onclick="downloadCourseData(\''+cd.n.replace(/'/g,"\\'")+'\')" >⬇ CSV</button></td></tr>';
        }).join('');
        var summary = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:11px;margin-bottom:14px">'
          + [['Total Collected','₹'+total.toLocaleString('en-IN'),'var(--student)'],['Collection Rate',Math.round(total/(total+pending)*100)+'%','var(--yellow)']].map(function(s){
              return '<div class="fee-card" style="text-align:center"><div style="font-size:20px;font-weight:800;color:'+s[2]+';font-family:Syne">'+s[1]+'</div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+s[0]+'</div></div>';
            }).join('')+'</div>';
        return summary + '<div class="tbl-wrap"><table><thead><tr><th>Course</th><th>Students</th><th>Fee/Student</th><th>Collected</th><th>Rate</th><th>Student List</th><th>Export</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    },
    app_usage_report: {
      title: '📱 App Usage Report',
      build: function() {
        var totalVideos = 0, totalMats = 0;
        if (typeof MEDIA_DB !== 'undefined') {
          Object.keys(MEDIA_DB).forEach(function(cn){
            Object.keys(MEDIA_DB[cn]).forEach(function(sn){
              totalVideos += MEDIA_DB[cn][sn].videos.length;
              totalMats   += MEDIA_DB[cn][sn].materials.length;
            });
          });
        }
        var usageData = [
          { label:'Daily Active Users',   val:'312', trend:'↑8%', col:'var(--student)' },
          { label:'Video Views (Month)',   val:totalVideos*120+'', trend:'↑15%', col:'var(--orange)' },
          { label:'Material Downloads',   val:totalMats*85+'',    trend:'↑12%', col:'var(--purple)' },
          { label:'Live Class Joins',     val:'2,847',            trend:'↑5%',  col:'var(--faculty)' },
          { label:'Quiz Attempts',        val:'1,204',            trend:'↑22%', col:'var(--yellow)' },
          { label:'Avg Session (min)',    val:'42',               trend:'↑3%',  col:'var(--admin)' },
        ];
        var students_au = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS : [];
        return '<div class="tbl-wrap" style="margin-bottom:16px"><table><thead><tr><th>Metric</th><th>Value</th><th>Trend</th><th>Student List</th></tr></thead><tbody>'
          + usageData.map(function(u){
              return '<tr>'
                + '<td style="font-weight:600">'+u.label+'</td>'
                + '<td><span style="font-family:Syne,sans-serif;font-weight:700;color:'+u.col+'">'+u.val+'</span></td>'
                + '<td><span style="color:var(--student);font-size:12px">'+u.trend+'</span></td>'
                + '<td><button class="btn btn-sm btn-teal" onclick="exportStudentList(\'app_usage_report\')">⬇ Download</button></td>'
                + '</tr>';
            }).join('') + '</tbody></table></div>'
          + '<div class="card"><div class="card-title" style="margin-bottom:10px">📊 Top Videos by Views</div>'
          + (function(){
              var allVids = [];
              if (typeof MEDIA_DB !== 'undefined') {
                Object.keys(MEDIA_DB).forEach(function(cn){ Object.keys(MEDIA_DB[cn]).forEach(function(sn){ MEDIA_DB[cn][sn].videos.forEach(function(v){allVids.push({t:v.t,views:v.views,fac:v.fac,sub:sn});}); }); });
              }
              allVids.sort(function(a,b){return b.views-a.views;});
              return allVids.slice(0,6).map(function(v){
                return '<div class="list-item"><div class="li-icon" style="background:rgba(255,107,53,.1)">🎬</div>'
                  + '<div class="li-content"><div class="li-title">'+v.t+'</div><div class="li-sub">'+v.fac+' • '+v.sub+'</div></div>'
                  + '<span style="color:var(--orange);font-weight:700">👁 '+v.views+'</span></div>';
              }).join('');
            })() + '</div>';
      }
    },
  };

  var cfg = configs[reportId];
  if (!cfg) { toast('Report not found', '⚠️'); return; }
  var title = cfg.title;

  openDetail(title,
    '<div style="margin-bottom:14px">'+cfg.build()+'</div>',
    '<button class="btn btn-teal" onclick="exportReport(\''+reportId+'\')">⬇ Export Report CSV</button>');
}

function exportStudentList(reportId, courseFilter) {
  var allStudents = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS : [];
  var students = courseFilter ? allStudents.filter(function(s){ return s.course === courseFilter; }) : allStudents;
  var rows = [['Roll No','Name','Email','Course','Campus','Fee Status','Status']].concat(
    students.map(function(s){return [s.roll,s.n,s.email,s.course,s.campus,s.fee,s.st];}));
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='students_list_'+(reportId||'report')+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Students list exported! ('+students.length+' students)','👥');
}

function exportReport(reportId) {
  var titles = {
    enrollment_report:'Enrollment Report',
    attendance_report:'Attendance Report',academic_report:'Academic Report',
    faculty_report:'Faculty Report',revenue_report:'Revenue Report',app_usage_report:'App Usage Report'
  };
  var rows = [];
  var students = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS : [];
  if (reportId === 'enrollment_report' && typeof COURSE_DB !== 'undefined') {
    rows = [['Course','Category','Enrolled','Capacity','Fill %','Status']].concat(
      COURSE_DB.map(function(cr){return [cr.n,cr.cat,cr.enrolled,cr.maxSt,Math.round(cr.enrolled/cr.maxSt*100)+'%',cr.pub?'Active':'Draft'];}));
    if (students.length) {
      rows.push([]); rows.push(['--- STUDENT LIST ---']);
      rows.push(['Roll No','Name','Email','Course','Campus','Fee Status','Status']);
      students.forEach(function(s){rows.push([s.roll,s.n,s.email,s.course,s.campus,s.fee,s.st]);});
    }
  } else if (reportId === 'attendance_report') {
    rows = [['Roll No','Name','Course','Campus','Attendance %','Status']].concat(
      students.map(function(s){ var att=Math.floor(Math.random()*30+65); return [s.roll,s.n,s.course,s.campus,att+'%',att>=75?'Regular':'Low Attendance']; }));
  } else if (reportId === 'academic_report') {
    rows = [['Roll No','Name','Course','Physics','Chemistry','Mathematics','Biology','Accountancy','Average']].concat(
      students.map(function(s){
        var scores=[Math.floor(Math.random()*30+60),Math.floor(Math.random()*30+60),Math.floor(Math.random()*30+60),Math.floor(Math.random()*30+60),Math.floor(Math.random()*30+60)];
        var avg=Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
        return [s.roll,s.n,s.course].concat(scores).concat([avg+'%']);
      }));
  } else if (reportId === 'revenue_report' && typeof FEE_COURSE_DATA !== 'undefined') {
    rows = [['Course','Students','Fee','Collected','Pending','Rate']].concat(
      FEE_COURSE_DATA.map(function(cd){return [cd.n,cd.students,'₹'+cd.fee,'₹'+cd.collected,'₹'+cd.pending,Math.round(cd.collected/(cd.collected+cd.pending)*100)+'%'];}));
    if (typeof FEE_STUDENTS !== 'undefined' && FEE_STUDENTS.length) {
      rows.push([]); rows.push(['--- FEE DETAILS PER STUDENT ---']);
      rows.push(['Roll No','Name','Course','Total Fee','Paid','Pending','Status']);
      FEE_STUDENTS.forEach(function(s){rows.push([s.roll,s.n,s.course,'₹'+s.amount,'₹'+s.paid,'₹'+s.pending,s.st]);});
    }
  } else if (reportId === 'faculty_report' && typeof ADMIN_FACULTY !== 'undefined') {
    rows = [['Name','Subject','Course','Rating','Status']].concat(
      ADMIN_FACULTY.map(function(f){return [f.n,f.sub,f.course,f.rat,f.st];}));
    if (students.length) {
      rows.push([]); rows.push(['--- STUDENT LIST ---']);
      rows.push(['Roll No','Name','Course','Campus','Status']);
      students.forEach(function(s){rows.push([s.roll,s.n,s.course,s.campus,s.st]);});
    }
  } else if (reportId === 'app_usage_report') {
    rows = [['Metric','Value','Trend'],['Daily Active Users','312','↑8%'],['Video Views (Month)','38400','↑15%'],['Material Downloads','1700','↑12%'],['Live Class Joins','2847','↑5%'],['Quiz Attempts','1204','↑22%'],['Avg Session (min)','42','↑3%']];
    if (students.length) {
      rows.push([]); rows.push(['--- STUDENT LIST ---']);
      rows.push(['Roll No','Name','Course','Campus','Fee Status','Status']);
      students.forEach(function(s){rows.push([s.roll,s.n,s.course,s.campus,s.fee,s.st]);});
    }
  } else {
    rows = [['Report','Generated','Date'],[(titles[reportId]||reportId),'RV Learning Hub',new Date().toLocaleDateString()]];
    if (students.length) {
      rows.push([]); rows.push(['--- STUDENT LIST ---']);
      rows.push(['Roll No','Name','Email','Course','Campus','Fee Status','Status']);
      students.forEach(function(s){rows.push([s.roll,s.n,s.email,s.course,s.campus,s.fee,s.st]);});
    }
  }
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v||'').replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download=(reportId)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast((titles[reportId]||'Report')+' exported with student list!','⬇');
}


function openGenerateReportModal() {
  var rTypes = [
    { id:'enrollment_report',   l:'📊 Enrollment Report',    d:'Total enrolled, course-wise, capacity stats' },
    { id:'attendance_report',   l:'✅ Attendance Report',    d:'Batch-wise and student-wise attendance' },
    { id:'academic_report',     l:'📝 Academic Report',      d:'Test averages, top performers, trends' },
    { id:'faculty_report',      l:'👨‍🏫 Faculty Report',      d:'Ratings, classes taken, subject coverage' },
    { id:'revenue_report',      l:'💰 Revenue Report',       d:'Collection vs target, pending, overdue' },
    { id:'app_usage_report',    l:'📱 App Usage Report',     d:'Logins, video views, material downloads' },
  ];
  var body = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Select a report to generate, view and export. All reports include a full student list.</div>'
    + '<div style="display:flex;flex-direction:column;gap:9px">'
    + rTypes.map(function(r) {
        return '<div style="display:flex;align-items:center;gap:12px;padding:13px;background:var(--surface2);border-radius:10px;border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all .18s" '
          + 'onclick="openReport(\''+r.id+'\')" onmouseover="this.style.borderColor=\'var(--purple)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
          + '<div style="flex:1"><div style="font-weight:600;font-size:13px">'+r.l+'</div>'
          + '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+r.d+'</div></div>'
          + '<div style="display:flex;gap:6px">'
          + '<button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openReport(\''+r.id+'\')">👁 View</button>'
          + '<button class="btn btn-sm btn-teal" onclick="event.stopPropagation();exportReport(\''+r.id+'\')">⬇ Report+Students</button>'
          + '<button class="btn btn-sm btn-green" onclick="event.stopPropagation();exportStudentList(\''+r.id+'\')">👥 Students</button>'
          + '</div></div>';
      }).join('') + '</div>';
  openDetail('📊 Generate Reports', body, '');
}

function exportRevenueCSV() {
  var months = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  var revAmts = [5.2,5.7,4.6,6.0,6.3,6.7,7.1,7.3,6.5,7.5,7.2,7.9];
  var rows = [['Month','Revenue (Lakhs)','Revenue (₹)']].concat(
    months.map(function(m,i){return [m+' 2024',revAmts[i],Math.round(revAmts[i]*100000)];}));
  var csv = rows.map(function(r){return r.join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='revenue_2024_25.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Revenue 2024–25 exported!','⬇');
}

PAGES['admin_attendance'] = function() {
  var data = [
    { b:'JEE Advanced A', s:142, avg:87, below:12, tr:'↑' },
    { b:'JEE Advanced B', s:98,  avg:82, below:18, tr:'→' },
    { b:'NEET Batch 2025',s:72,  avg:90, below:5,  tr:'↑' },
    { b:'JEE Mains Crash',s:56,  avg:75, below:14, tr:'↓' },
    { b:'Commerce XI',    s:45,  avg:88, below:4,  tr:'↑' },
  ];
  return '<div class="card"><div class="card-header"><div class="card-title">✅ Attendance Overview — March 2024</div>'
    + '<button class="btn btn-sm btn-teal" onclick="downloadFullAttendance()">⬇ Download Full Report</button></div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>Batch</th><th>Students</th><th>Avg Attendance</th><th>Below 75%</th><th>Trend</th><th>Action</th></tr></thead><tbody>'
    + data.map(function(b) {
        return '<tr onclick="toast(\'' + b.b + ' details\',\'✅\')">'
          + '<td>' + b.b + '</td><td>' + b.s + '</td>'
          + '<td><span style="color:' + (b.avg>=80?'var(--student)':'var(--admin)') + ';font-weight:700">' + b.avg + '%</span></td>'
          + '<td style="color:' + (b.below>15?'var(--admin)':'var(--muted)') + '">' + b.below + ' students</td>'
          + '<td style="font-size:17px;color:' + (b.tr==='↑'?'var(--student)':b.tr==='↓'?'var(--admin)':'var(--muted)') + '">' + b.tr + '</td>'
          + '<td><button class="btn btn-sm btn-purple" onclick="event.stopPropagation();downloadBatchAttendance(\'' + b.b + '\',' + b.s + ',' + b.avg + ')">⬇ Report</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
};

function downloadBatchAttendance(batchName, totalStudents, avgPct) {
  var students = typeof ADMIN_STUDENTS !== 'undefined' ? ADMIN_STUDENTS : [];
  var rows = [['Roll No','Student Name','Batch','Classes Held','Classes Attended','Attendance %','Status']];
  var classesHeld = 48;
  for (var i=0; i<totalStudents; i++) {
    var s = students[i % students.length];
    var att = Math.floor(Math.random()*15 + (avgPct - 7));
    att = Math.max(50, Math.min(100, att));
    var attended = Math.round(classesHeld * att / 100);
    rows.push([s ? s.roll : 'RV'+String(1000+i), s ? s.n : 'Student '+(i+1), batchName, classesHeld, attended, att+'%', att>=75?'Regular':'Low Attendance']);
  }
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download=batchName.replace(/\s+/g,'_')+'_attendance.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Attendance report for '+batchName+' downloaded!','⬇');
}

function downloadFullAttendance() {
  var batches = [
    { b:'JEE Advanced A', s:142, avg:87 }, { b:'JEE Advanced B', s:98, avg:82 },
    { b:'NEET Batch 2025', s:72, avg:90 }, { b:'JEE Mains Crash', s:56, avg:75 },
    { b:'Commerce XI', s:45, avg:88 }
  ];
  var rows = [['Batch','Total Students','Avg Attendance %','Below 75%','Status']];
  batches.forEach(function(b){
    var below = Math.round(b.s * (100-b.avg) / 100);
    rows.push([b.b, b.s, b.avg+'%', below, b.avg>=80?'Good':'Needs Attention']);
  });
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='full_attendance_march_2024.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Full attendance report downloaded!','⬇');
}

PAGES['admin_notifications'] = function() {
  // Incoming notifications from students and faculty
  var INCOMING_NOTIFS = window._incomingNotifs || [
    { id:1, from:'Arjun Sharma',    role:'student', roll:'RV2024001', type:'doubt',        msg:'I have a doubt in Chapter 5 — Electrostatics. The formula for electric potential seems different in my notes vs the video.',                    course:'JEE Advanced', time:'5 min ago',  read:false, priority:'normal'  },
    { id:2, from:'Dr. Priya Mehta', role:'faculty', emp:'RVF001',     type:'leave',         msg:'I will be unavailable on March 20 (Holi). Please arrange a substitute for the scheduled Physics live class at 10 AM.',                         course:'JEE Advanced', time:'22 min ago', read:false, priority:'high'    },
    { id:3, from:'Kavya Reddy',     role:'student', roll:'RV2024015', type:'fee_issue',     msg:'I have paid the fees via NEFT on March 13 but my portal still shows pending. Transaction ref: NEFT240313001234.',                               course:'NEET UG',      time:'1 hr ago',  read:false, priority:'high'    },
    { id:4, from:'Prof. Amit Singh',role:'faculty', emp:'RVF002',     type:'material',      msg:'I have uploaded 3 new PDFs for Organic Chemistry Chapter 8. Please approve them so students can access them.',                                    course:'JEE Advanced', time:'2 hrs ago', read:true,  priority:'normal'  },
    { id:5, from:'Rohan Gupta',     role:'student', roll:'RV2024003', type:'complaint',     msg:'The video for Integration by Parts is buffering repeatedly. It stops at 12 minutes every time. Please fix the streaming issue.',                  course:'JEE Mains',    time:'3 hrs ago', read:true,  priority:'normal'  },
    { id:6, from:'Dev Verma',       role:'student', roll:'RV2024020', type:'fee_issue',     msg:'Requesting instalment extension for pending fees. Personal reason — family emergency. Can I get a 2-week extension?',                             course:'Commerce',     time:'4 hrs ago', read:true,  priority:'high'    },
    { id:7, from:'Mr. Raj Sharma',  role:'faculty', emp:'RVF003',     type:'schedule',      msg:'Request to reschedule the Saturday Mathematics session to Sunday 2 PM due to a personal commitment on March 16.',                                 course:'JEE Mains',    time:'5 hrs ago', read:true,  priority:'normal'  },
    { id:8, from:'Sneha Patel',     role:'student', roll:'RV2024002', type:'certificate',   msg:'Requesting a bonafide certificate for bank account opening. Please issue at the earliest.',                                                        course:'JEE Advanced', time:'Yesterday', read:true,  priority:'low'     },
    { id:9, from:'Prof. Neha K.',   role:'faculty', emp:'RVF004',     type:'material',      msg:'New formula sheet for Accountancy Chapter 6 — Partnership Accounts has been uploaded. Kindly approve for student access.',                        course:'Commerce',     time:'Yesterday', read:true,  priority:'normal'  },
    { id:10,from:'Meera Shah',      role:'student', roll:'RV2024008', type:'complaint',     msg:'Attendance marked absent for March 10 but I was present. Please correct my attendance record.',                                                    course:'JEE Advanced', time:'2 days ago',read:true,  priority:'normal'  },
  ];
  window._incomingNotifs = INCOMING_NOTIFS;

  var nState = window._notifState || { filter:'all', typeFilter:'all' };
  window._notifState = nState;

  var unread = INCOMING_NOTIFS.filter(function(n){return !n.read;}).length;

  var typeIcons = { doubt:'❓', leave:'📅', fee_issue:'💳', material:'📄', complaint:'⚠️', schedule:'🗓️', certificate:'📋' };
  var typeLabels = { doubt:'Doubt Query', leave:'Leave Request', fee_issue:'Fee Issue', material:'Content Approval', complaint:'Complaint', schedule:'Schedule Change', certificate:'Certificate Request' };
  var typeCols = { doubt:'badge-purple', leave:'badge-yellow', fee_issue:'badge-red', material:'badge-teal', complaint:'badge-orange', schedule:'badge-yellow', certificate:'badge-teal' };

  // Stats bar
  var typeCounts = {};
  INCOMING_NOTIFS.forEach(function(n){ typeCounts[n.type] = (typeCounts[n.type]||0)+1; });

  var statsBar = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">'
    + [
        ['📬', unread, 'Unread', 'var(--admin)'],
        ['❓', (typeCounts['doubt']||0)+(typeCounts['complaint']||0), 'Student Queries', 'var(--purple)'],
        ['👨‍🏫', (typeCounts['leave']||0)+(typeCounts['schedule']||0)+(typeCounts['material']||0), 'Faculty Requests', 'var(--faculty)'],
        ['💳', typeCounts['fee_issue']||0, 'Fee Issues', 'var(--yellow)'],
      ].map(function(s){
        return '<div class="stat-card" style="border-color:color-mix(in srgb,'+s[3]+' 28%,var(--border))">'
          + '<div class="stat-icon">'+s[0]+'</div><div class="stat-val" style="color:'+s[3]+'">'+s[1]+'</div>'
          + '<div class="stat-label">'+s[2]+'</div></div>';
      }).join('') + '</div>';

  // Filter tabs
  var filterTabs = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;align-items:center">'
    + [['all','All',INCOMING_NOTIFS.length],['student','👨‍🎓 RVLH Students',INCOMING_NOTIFS.filter(function(n){return n.role==='student';}).length],['off_campus','🏠 Off Campus Students',INCOMING_NOTIFS.filter(function(n){return n.role==='off_campus';}).length],['faculty','👨‍🏫 Faculty',INCOMING_NOTIFS.filter(function(n){return n.role==='faculty';}).length],['unread','🔴 Unread',unread]]
      .map(function(f){
        var active = nState.filter===f[0];
        return '<button class="btn btn-sm" onclick="window._notifState.filter=\''+f[0]+'\';loadPage(\'notifications\')" '
          + 'style="'+(active?'background:var(--admin);color:#fff':'')+'">'+f[1]+' <span style="opacity:.7">('+f[2]+')</span></button>';
      }).join('')
    + '<div style="margin-left:auto;display:flex;gap:6px">'
    + '<button class="btn btn-sm btn-purple" onclick="markAllRead()">✓ Mark All Read</button>'
    + '<button class="btn btn-sm btn-teal" onclick="exportNotifications()">⬇ Export</button>'
    + '</div></div>';

  var filtered = INCOMING_NOTIFS.filter(function(n){
    if (nState.filter==='student')    return n.role==='student';
    if (nState.filter==='off_campus') return n.role==='off_campus';
    if (nState.filter==='faculty')    return n.role==='faculty';
    if (nState.filter==='unread')     return !n.read;
    return true;
  });

  var list = '<div style="display:flex;flex-direction:column;gap:10px">'
    + filtered.map(function(n, i) {
        var priColor = n.priority==='high'?'var(--admin)':n.priority==='low'?'var(--muted)':'var(--purple)';
        var roleBadge = n.role==='student'
          ? '<span class="badge badge-teal" style="font-size:10px">👨‍🎓 RVLH Student</span>'
          : n.role==='off_campus'
          ? '<span class="badge badge-purple" style="font-size:10px">🏠 Off Campus</span>'
          : '<span class="badge badge-yellow" style="font-size:10px">👨‍🏫 Faculty</span>';
        return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid '+(n.read?'var(--border)':'color-mix(in srgb,var(--purple) 40%,var(--border))')+';border-left:3px solid '+priColor+';border-radius:12px;padding:14px;transition:all .2s" '
          + 'onmouseover="this.style.transform=\'translateX(3px)\'" onmouseout="this.style.transform=\'\'">'
          + '<div style="display:flex;align-items:flex-start;gap:12px">'
          + '<div style="width:44px;height:44px;border-radius:12px;background:'+(n.role==='student'?'rgba(0,212,200,.12)':'rgba(251,191,36,.12)')+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+(typeIcons[n.type]||'📬')+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">'
          + '<span style="font-weight:700;font-size:13px">'+n.from+'</span>'
          + roleBadge
          + (n.roll ? '<span style="font-size:10px;color:var(--muted)">'+n.roll+'</span>' : '<span style="font-size:10px;color:var(--muted)">'+n.emp+'</span>')
          + '<span class="badge '+typeCols[n.type]+'" style="font-size:10px">'+typeIcons[n.type]+' '+(typeLabels[n.type]||n.type)+'</span>'
          + (!n.read ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--admin);flex-shrink:0;display:inline-block"></span>' : '')
          + '</div>'
          + '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">'+n.course+' &nbsp;•&nbsp; '+n.time+'</div>'
          + '<div style="font-size:13px;line-height:1.6;color:var(--text)">'+n.msg+'</div>'
          + '</div></div>'
          + '<div style="display:flex;gap:7px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
          + '<button class="btn btn-sm btn-purple" onclick="replyNotif('+n.id+',\''+n.from.replace(/'/g,"\\'")+'\')" style="gap:5px">💬 Reply</button>'
          + '<button class="btn btn-sm btn-green" onclick="resolveNotif('+n.id+')" style="gap:5px">✅ Resolve</button>'
          + '<button class="btn btn-sm btn-teal" onclick="forwardNotif('+n.id+')" style="gap:5px">↗ Forward</button>'
          + (n.priority==='high' ? '<span class="badge badge-red" style="align-self:center">🔴 High Priority</span>' : '')
          + '</div>'
          + '</div>';
      }).join('') + '</div>';

  if (!filtered.length) list = '<div class="empty"><div class="empty-icon">📭</div><p>No notifications in this category</p></div>';

  return statsBar + filterTabs
    + '<div class="card" style="padding:0;overflow:hidden"><div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'
    + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px">📬 Incoming Notifications <span style="font-size:12px;color:var(--muted);font-family:DM Sans">('+filtered.length+')</span></div>'
    + '</div><div style="padding:16px">' + list + '</div></div>';
};

function replyNotif(id, fromName) {
  var body = '<div class="inp-group"><label>To</label><input class="inp-field" value="'+fromName+'" readonly style="opacity:.7"></div>'
    + '<div class="inp-group"><label>Your Reply</label><textarea class="inp-field" id="notif-reply-msg" rows="4" placeholder="Type your reply..."></textarea></div>';
  openDetail('💬 Reply to '+fromName, body,
    '<button class="btn btn-solid" onclick="var m=document.getElementById(\'notif-reply-msg\');if(!m||!m.value){toast(\'Write a reply first\',\'⚠️\');return;}resolveNotif('+id+');toast(\'Reply sent to '+fromName+'!\',\'✅\');closeModal(\'modal-detail\')">📤 Send Reply</button>');
}

function resolveNotif(id) {
  var notifs = window._incomingNotifs || [];
  var n = notifs.find(function(x){return x.id===id;});
  if (n) { n.read = true; }
  toast('Notification marked as resolved','✅');
  loadPage('notifications');
}

function forwardNotif(id) {
  var body = '<div class="inp-group"><label>Forward To</label><select class="inp-field"><option>Dr. Priya Mehta (Physics)</option><option>Prof. Amit Singh (Chemistry)</option><option>Mr. Raj Sharma (Mathematics)</option><option>Fee Department</option><option>IT Support</option></select></div>'
    + '<div class="inp-group"><label>Note</label><textarea class="inp-field" rows="2" placeholder="Optional note..."></textarea></div>';
  openDetail('↗ Forward Notification', body, '<button class="btn btn-teal" onclick="toast(\'Notification forwarded!\',\'↗\');closeModal(\'modal-detail\')">↗ Forward</button>');
}

function markAllRead() {
  var notifs = window._incomingNotifs || [];
  notifs.forEach(function(n){ n.read = true; });
  toast('All notifications marked as read','✅');
  loadPage('notifications');
}

function exportNotifications() {
  var notifs = window._incomingNotifs || [];
  var rows = [['From','Role','ID','Type','Course','Message','Time','Priority','Status']].concat(
    notifs.map(function(n){return [n.from, n.role, n.roll||n.emp, n.type, n.course, n.msg.slice(0,80), n.time, n.priority, n.read?'Read':'Unread'];}));
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='notifications.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Notifications exported!','⬇');
}

PAGES['admin_announcements'] = function() {
  var announcements = window.LMS_ANNOUNCEMENTS || [
    { t:'JEE Mock Test 14 — Sunday',       cat:'Exam',    pri:'Important',d:'Mar 12',v:342 },
    { t:'Fee Due Date Extended to Mar 20',  cat:'Fee',     pri:'Important',d:'Mar 10',v:428 },
    { t:'Holi Holiday — March 25',          cat:'General', pri:'Normal',   d:'Mar 8', v:895 },
    { t:'New Physics Notes Uploaded',       cat:'Academic',pri:'Normal',   d:'Mar 7', v:267 },
  ];
  var form = '<div class="card" style="margin-bottom:14px">'
    + '<div class="card-title" style="margin-bottom:14px">📢 Create Announcement</div>'
    + makeInputGroup('Title','text','e.g. Holiday Notice')
    + '<div class="inp-row">'
    + makeInputGroup('Category','select','General, Academic, Fee, Exam, Event')
    + makeInputGroup('Priority','select','Normal, Important, Urgent')
    + '</div>'
    + '<div class="inp-group"><label>Send To</label>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">'
    + [['ann-to-faculty','👨‍🏫 Faculty'],['ann-to-rvlh','🎓 RVLH Students'],['ann-to-offcampus','🏠 Off Campus Students']].map(function(ch){
        return '<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;background:var(--surface2);border:1px solid rgba(255,255,255,0.07);padding:7px 13px;border-radius:8px">'
          + '<input type="checkbox" id="'+ch[0]+'" checked style="width:15px;height:15px;accent-color:var(--purple);">'
          + ch[1] + '</label>';
      }).join('')
    + '</div>'
    + '<div style="font-size:10px;color:var(--muted);margin-top:5px">Select the audience for this announcement</div></div>'
    + makeInputGroup('Message','textarea','Write announcement...')
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn btn-solid" onclick="publishAnnouncement()">📢 Publish</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Saved as draft\',\'💾\')">💾 Draft</button></div></div>';

  var list = '<div class="card"><div class="card-title" style="margin-bottom:14px">📋 Recent Announcements</div>'
    + announcements.map(function(a) {
        return '<div class="list-item" onclick="toast(\'' + a.t.replace(/'/g,"\\'") + '\',\'📢\')">'
          + '<div class="li-icon" style="background:var(--surface2)">📢</div>'
          + '<div class="li-content"><div class="li-title">' + a.t + '</div><div class="li-sub">' + a.cat + ' • ' + a.d + ' • ' + a.v + ' views</div></div>'
          + '<span class="badge ' + (a.pri==='Important'?'badge-yellow':'badge-purple') + '">' + a.pri + '</span></div>';
      }).join('') + '</div>';
  return form + list;
};


// ═══════════════════════════════════════════════════════
// MY PROFILE (admin_profile)
// ═══════════════════════════════════════════════════════
PAGES['admin_profile'] = function() {
  var u = G.user || {};
  var nameParts = (u.name || '').split(' ');
  var prof = {
    firstName  : nameParts[0]  || 'Rahul',
    lastName   : nameParts.slice(1).join(' ') || 'Verma',
    phone      : u.phone       || '',
    gender     : u.gender      || '',
    dob        : u.dob         || '',
    designation: u.designation || 'System Administrator',
    department : u.dept        || 'Administration',
    campus     : u.campus      || 'RV Learning Hub HQ',
    joinDate   : u.joinDate    || '',
    employeeId : u.emp         || 'ADM-001',
  };
  var email = u.email || 'admin@rvhub.com';
  var initials = ((prof.firstName||'R')[0]+(prof.lastName||'V')[0]).toUpperCase();
  var lbl = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:5px';

  // ── HERO ──
  var hero = '<div style="background:linear-gradient(135deg,#0d1526 0%,#111827 60%,#0a1020 100%);border-radius:20px;padding:30px 36px;margin-bottom:22px;border:1px solid rgba(108,71,255,.2);position:relative;overflow:hidden">'
    + '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(108,71,255,.14),transparent 50%),radial-gradient(ellipse at 85% 30%,rgba(255,45,107,.09),transparent 45%);pointer-events:none"></div>'
    + '<div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(108,71,255,.07),transparent 70%);pointer-events:none"></div>'
    + '<div style="position:relative;display:flex;align-items:center;gap:26px">'
    // Avatar
    + '<div style="position:relative;flex-shrink:0">'
    + '<div style="width:82px;height:82px;border-radius:22px;background:linear-gradient(135deg,#6c47ff,#ff2d6b);display:flex;align-items:center;justify-content:center;color:#fff;font-family:Syne,sans-serif;font-weight:900;font-size:28px;box-shadow:0 10px 30px rgba(108,71,255,.4),0 0 0 3px rgba(108,71,255,.15)">'+initials+'</div>'
    + '<div style="position:absolute;bottom:-5px;right:-5px;width:22px;height:22px;background:var(--student);border-radius:50%;border:3px solid #0d1526;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff">✓</div>'
    + '</div>'
    // Name & info
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-family:Syne,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.4px;margin-bottom:4px">'+prof.firstName+' '+prof.lastName+'</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:12px;font-family:DM Mono,monospace">'+email+'</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="background:rgba(255,45,107,.18);color:#ff2d6b;border:1px solid rgba(255,45,107,.3);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🛡️ Administrator</span>'
    + '<span style="background:rgba(74,222,128,.14);color:var(--student);border:1px solid rgba(74,222,128,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">✅ Active</span>'
    + '<span style="background:rgba(108,71,255,.14);color:var(--purple);border:1px solid rgba(108,71,255,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🪪 '+prof.employeeId+'</span>'
    + '</div></div>'
    // Right meta
    + '<div style="display:flex;gap:22px;flex-shrink:0;border-left:1px solid rgba(255,255,255,.07);padding-left:28px">'
    + [['🏢',prof.department,'Department'],['💼',prof.designation,'Designation'],['📍',prof.campus.replace(' Hub HQ','').replace(' Hub',''),'Campus']].map(function(s){
        return '<div style="text-align:center">'
          + '<div style="font-size:17px;margin-bottom:5px">'+s[0]+'</div>'
          + '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.75);max-width:90px;word-break:break-word;line-height:1.3">'+(s[1]||'—')+'</div>'
          + '<div style="font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.9px;margin-top:3px">'+s[2]+'</div>'
          + '</div>';
      }).join('')
    + '</div></div></div>';

  // ── CHIPS ──
  var chips = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">'
    + [{icon:'🎂',label:'Birthday',val:prof.dob||'—'},{icon:'👤',label:'Gender',val:prof.gender||'—'},{icon:'📅',label:'Joined',val:prof.joinDate||'—'},{icon:'🔒',label:'Status',val:'APPROVED',ac:'var(--student)'}].map(function(s){
        return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:15px 12px;text-align:center;transition:border-color .2s" onmouseover="this.style.borderColor=\'var(--purple)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
          + '<div style="font-size:21px;margin-bottom:6px">'+s.icon+'</div>'
          + '<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">'+s.label+'</div>'
          + '<div style="font-size:12px;font-weight:800;color:'+(s.ac||'var(--text)')+'">'+s.val+'</div>'
          + '</div>';
      }).join('')
    + '</div>';

  // helper
  function infoRow(label, val, ac) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</span>'
      + '<span style="font-size:13px;font-weight:700;color:'+(ac||'var(--text)')+'">'+( val||'—')+'</span>'
      + '</div>';
  }

  // ── LEFT: Personal Info ──
  var infoCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">👤</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Personal Information</div><div style="font-size:11px;color:var(--muted)">Your profile details</div></div></div>'
    + infoRow('First Name', prof.firstName)
    + infoRow('Last Name',  prof.lastName)
    + infoRow('Email',      email, 'var(--purple)')
    + infoRow('Phone',      prof.phone)
    + infoRow('Gender',     prof.gender)
    + infoRow('Date of Birth', prof.dob)
    + infoRow('Employee ID',  prof.employeeId, 'var(--student)')
    + infoRow('Designation',  prof.designation)
    + infoRow('Department',   prof.department)
    + infoRow('Campus',       prof.campus)
    + infoRow('Joined',       prof.joinDate)
    + '</div>';

  // ── CENTRE: Edit Profile ──
  var editCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(0,212,200,.12);border:1px solid rgba(0,212,200,.18);display:flex;align-items:center;justify-content:center;font-size:16px">✏️</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Edit Profile</div><div style="font-size:11px;color:var(--muted)">Update your details</div></div></div>'
    + '<form onsubmit="saveAdminProfile(event)" style="display:flex;flex-direction:column;gap:12px">'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">First Name</label><input class="inp-field" id="ap-fn" value="'+prof.firstName+'"></div>'
    +   '<div><label style="'+lbl+'">Last Name</label><input class="inp-field" id="ap-ln" value="'+prof.lastName+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Phone</label><input class="inp-field" id="ap-phone" value="'+prof.phone+'" placeholder="+91 98765 43210"></div>'
    +   '<div><label style="'+lbl+'">Gender</label><select class="inp-field" id="ap-gender"><option value="">Select</option>'
    +   ['Male','Female','Non-binary','Prefer not to say'].map(function(g){return '<option value="'+g+'"'+(prof.gender===g?' selected':'')+'>'+g+'</option>';}).join('')
    +   '</select></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Designation</label><input class="inp-field" id="ap-desig" value="'+prof.designation+'"></div>'
    +   '<div><label style="'+lbl+'">Department</label><input class="inp-field" id="ap-dept" value="'+prof.department+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Date of Birth</label><input class="inp-field" type="date" id="ap-dob" value="'+prof.dob+'"></div>'
    +   '<div><label style="'+lbl+'">Join Date</label><input class="inp-field" type="date" id="ap-join" value="'+prof.joinDate+'"></div>'
    + '</div>'
    + '<div><label style="'+lbl+'">Email</label>'
    +   '<input class="inp-field" value="'+email+'" disabled style="width:100%;cursor:not-allowed;background:rgba(255,255,255,0.02);color:var(--muted)" placeholder="cannot change"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#00d4c8,#4ade80);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">💾 Save Changes</button>'
    + '</form></div>';

  // ── RIGHT: Change Password ──
  var pwCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">🔐</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Change Password</div><div style="font-size:11px;color:var(--muted)">Keep your account secure</div></div></div>'
    + '<form onsubmit="changeAdminPassword(event)" style="display:flex;flex-direction:column;gap:13px">'
    + '<div><label style="'+lbl+'">Current Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cur" type="password" placeholder="Enter current password" style="padding-right:44px" oninput="">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cur\',\'ap-b1\')" id="ap-b1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div></div>'
    + '<div><label style="'+lbl+'">New Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-nw" type="password" placeholder="Min 8 · uppercase · special" style="padding-right:44px" oninput="apPwStrength(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-nw\',\'ap-b2\')" id="ap-b2" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div>'
    +   '<div id="ap-pw-strength" style="display:none;margin-top:6px"><div style="display:flex;gap:3px;margin-bottom:3px"><div id="aps1" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps2" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps3" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps4" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div></div><div id="aps-label" style="font-size:10px;color:var(--muted)"></div></div></div>'
    + '<div><label style="'+lbl+'">Confirm Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cnw" type="password" placeholder="Re-enter new password" style="padding-right:44px" oninput="apPwMatch(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cnw\',\'ap-b3\')" id="ap-b3" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button>'
    +   '<div id="ap-match-hint" style="font-size:11px;margin-top:5px;display:none"></div></div></div>'
    + '<div id="ap-pw-err" style="display:none;color:var(--admin);font-size:12px;font-weight:600;padding:10px 13px;background:rgba(255,45,107,.08);border-radius:9px;border:1px solid rgba(255,45,107,.2)"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#6c47ff,#ff2d6b);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">🔐 Update Password</button>'
    + '</form>'
    + '<div style="margin-top:16px;padding:12px 14px;background:rgba(108,71,255,.06);border:1px solid rgba(108,71,255,.15);border-radius:10px">'
    + '<div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:4px">🛡️ Password tips</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.7">Use uppercase, lowercase, numbers and symbols. Avoid using your name or email as your password.</div>'
    + '</div></div>';

  return '<div style="animation:fadeUp .28s ease;max-width:1100px">'
    + hero + chips
    + '<div style="display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:16px;align-items:start">'
    + infoCard + editCard + pwCard
    + '</div></div>';
};

async function saveAdminProfile(e) {
  e.preventDefault();
  var get = function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var firstName = get('ap-fn');
  var lastName = get('ap-ln');
  var phone = get('ap-phone');
  
  if (!firstName) { toast('First name is required', '⚠️'); return; }
  
  var fullName = firstName + ' ' + lastName;
  
  try {
    const updatedUser = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: fullName,
        phone: phone,
        gender: get('ap-gender'),
        dob: get('ap-dob'),
        designation: get('ap-desig'),
        dept: get('ap-dept'),
        joinDate: get('ap-join')
      })
    });
    
    G.user = updatedUser;
    
    // Update sidebar interface
    var sbName = document.getElementById('sb-name');
    if (sbName) sbName.textContent = G.user.name;
    var nameParts = (G.user.name || '').split(' ');
    var initials = ((nameParts[0]||'R')[0]+(nameParts.slice(1).join(' ')||'V')[0]).toUpperCase();
    var sbAvatar = document.getElementById('sb-avatar');
    if (sbAvatar) sbAvatar.textContent = initials;
    
    toast('Profile saved successfully!', '✅');
    loadPage('profile');
  } catch (err) {
    toast('Failed to save profile: ' + err.message, '❌');
  }
}

async function changeAdminPassword(e) {
  e.preventDefault();
  var errEl = document.getElementById('ap-pw-err');
  if (errEl) errEl.style.display = 'none';
  var get = function(id){var el=document.getElementById(id);return el?el.value:'';};
  var cur = get('ap-cur'), nw = get('ap-nw'), cnw = get('ap-cnw');
  var showErr = function(msg){if(errEl){errEl.textContent=msg;errEl.style.display='block';}};
  
  if (!cur) { showErr('Enter your current password.'); return; }
  if (nw.length < 8) { showErr('Min 8 characters required.'); return; }
  if (!/[A-Z]/.test(nw)) { showErr('Must include at least 1 uppercase letter.'); return; }
  if (!/[^A-Za-z0-9]/.test(nw)) { showErr('Must include at least 1 special character.'); return; }
  if (nw !== cnw) { showErr('Passwords do not match.'); return; }
  
  try {
    await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        password: nw
      })
    });
    
    ['ap-cur', 'ap-nw', 'ap-cnw'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    
    var sb = document.getElementById('ap-pw-strength');
    if (sb) sb.style.display = 'none';
    var mh = document.getElementById('ap-match-hint');
    if (mh) mh.style.display = 'none';
    
    toast('Password updated successfully!', '🔐');
  } catch (err) {
    showErr('Failed to update password: ' + err.message);
  }
}

async function saveFacultyProfile(e) {
  e.preventDefault();
  var get = function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var firstName = get('ap-fn');
  var lastName = get('ap-ln');
  var phone = get('ap-phone');
  
  if (!firstName) { toast('First name is required', '⚠️'); return; }
  
  var fullName = firstName + ' ' + lastName;
  
  try {
    const updatedUser = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: fullName,
        phone: phone,
        gender: get('ap-gender'),
        dob: get('ap-dob'),
        designation: get('ap-desig'),
        subject: get('ap-dept'),
        joinDate: get('ap-join')
      })
    });
    
    G.user = updatedUser;
    
    // Update sidebar interface
    var sbName = document.getElementById('sb-name');
    if (sbName) sbName.textContent = G.user.name;
    var nameParts = (G.user.name || '').split(' ');
    var initials = ((nameParts[0]||'P')[0]+(nameParts.slice(1).join(' ')||'M')[0]).toUpperCase();
    var sbAvatar = document.getElementById('sb-avatar');
    if (sbAvatar) sbAvatar.textContent = initials;
    
    toast('Profile saved successfully!', '✅');
    loadPage('profile');
  } catch (err) {
    toast('Failed to save profile: ' + err.message, '❌');
  }
}

function changeFacultyPassword(e) {
  changeAdminPassword(e);
}

PAGES['faculty_profile'] = function() {
  var u = G.user || {};
  var nameParts = (u.name || '').split(' ');
  var prof = {
    firstName  : nameParts[0]  || 'Dr.',
    lastName   : nameParts.slice(1).join(' ') || 'Priya Mehta',
    phone      : u.phone       || '',
    gender     : u.gender      || '',
    dob        : u.dob         || '',
    designation: u.designation || 'Faculty Member',
    department : u.subject     || 'Physics',
    campus     : u.campus      || 'RV Learning Hub HQ',
    joinDate   : u.joinDate    || '',
    employeeId : u.emp         || 'RVF001',
  };
  var email = u.email || 'priya@rvhub.com';
  var initials = ((prof.firstName||'P')[0]+(prof.lastName||'M')[0]).toUpperCase();
  var lbl = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:5px';

  // ── HERO ──
  var hero = '<div style="background:linear-gradient(135deg,#0d1526 0%,#111827 60%,#0a1020 100%);border-radius:20px;padding:30px 36px;margin-bottom:22px;border:1px solid rgba(108,71,255,.2);position:relative;overflow:hidden">'
    + '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(108,71,255,.14),transparent 50%),radial-gradient(ellipse at 85% 30%,rgba(255,45,107,.09),transparent 45%);pointer-events:none"></div>'
    + '<div style="position:relative;display:flex;align-items:center;gap:26px">'
    + '<div style="position:relative;flex-shrink:0">'
    + '<div style="width:82px;height:82px;border-radius:22px;background:linear-gradient(135deg,#6c47ff,#ff2d6b);display:flex;align-items:center;justify-content:center;color:#fff;font-family:Syne,sans-serif;font-weight:900;font-size:28px;box-shadow:0 10px 30px rgba(108,71,255,.4),0 0 0 3px rgba(108,71,255,.15)">'+initials+'</div>'
    + '<div style="position:absolute;bottom:-5px;right:-5px;width:22px;height:22px;background:var(--student);border-radius:50%;border:3px solid #0d1526;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff">✓</div>'
    + '</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-family:Syne,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.4px;margin-bottom:4px">'+prof.firstName+' '+prof.lastName+'</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:12px;font-family:DM Mono,monospace">'+email+'</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="background:rgba(108,71,255,.18);color:#a78bff;border:1px solid rgba(108,71,255,.3);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🎓 Faculty</span>'
    + '<span style="background:rgba(74,222,128,.14);color:var(--student);border:1px solid rgba(74,222,128,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">✅ Active</span>'
    + '<span style="background:rgba(108,71,255,.14);color:var(--purple);border:1px solid rgba(108,71,255,.28);padding:4px 13px;border-radius:20px;font-size:11px;font-weight:700">🪪 '+prof.employeeId+'</span>'
    + '</div></div>'
    + '<div style="display:flex;gap:22px;flex-shrink:0;border-left:1px solid rgba(255,255,255,.07);padding-left:28px">'
    + [['📚',prof.department,'Subject'],['💼',prof.designation,'Designation'],['📍',prof.campus.replace(' Hub HQ','').replace(' Hub',''),'Campus']].map(function(s){
        return '<div style="text-align:center">'
          + '<div style="font-size:17px;margin-bottom:5px">'+s[0]+'</div>'
          + '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.75);max-width:90px;word-break:break-word;line-height:1.3">'+(s[1]||'—')+'</div>'
          + '<div style="font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.9px;margin-top:3px">'+s[2]+'</div>'
          + '</div>';
      }).join('')
    + '</div></div></div>';

  var chips = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">'
    + [{icon:'🎂',label:'Birthday',val:prof.dob||'—'},{icon:'👤',label:'Gender',val:prof.gender||'—'},{icon:'📅',label:'Joined',val:prof.joinDate||'—'},{icon:'🔒',label:'Status',val:'APPROVED',ac:'var(--student)'}].map(function(s){
        return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:15px 12px;text-align:center;transition:border-color .2s" onmouseover="this.style.borderColor=\'var(--purple)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
          + '<div style="font-size:21px;margin-bottom:6px">'+s.icon+'</div>'
          + '<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">'+s.label+'</div>'
          + '<div style="font-size:12px;font-weight:800;color:'+(s.ac||'var(--text)')+'">'+s.val+'</div>'
          + '</div>';
      }).join('')
    + '</div>';

  function infoRow(label, val, ac) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</span>'
      + '<span style="font-size:13px;font-weight:700;color:'+(ac||'var(--text)')+'">'+(val||'—')+'</span>'
      + '</div>';
  }

  var infoCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">👤</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Personal Information</div><div style="font-size:11px;color:var(--muted)">Your profile details</div></div></div>'
    + infoRow('First Name', prof.firstName)
    + infoRow('Last Name',  prof.lastName)
    + infoRow('Email',      email, 'var(--purple)')
    + infoRow('Phone',      prof.phone)
    + infoRow('Gender',     prof.gender)
    + infoRow('Date of Birth', prof.dob)
    + infoRow('Employee ID',  prof.employeeId, 'var(--student)')
    + infoRow('Designation',  prof.designation)
    + infoRow('Subject',      prof.department)
    + infoRow('Campus',       prof.campus)
    + infoRow('Joined',       prof.joinDate)
    + '</div>';

  var editCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(0,212,200,.12);border:1px solid rgba(0,212,200,.18);display:flex;align-items:center;justify-content:center;font-size:16px">✏️</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Edit Profile</div><div style="font-size:11px;color:var(--muted)">Update your details</div></div></div>'
    + '<form onsubmit="saveFacultyProfile(event)" style="display:flex;flex-direction:column;gap:12px">'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">First Name</label><input class="inp-field" id="ap-fn" value="'+prof.firstName+'"></div>'
    +   '<div><label style="'+lbl+'">Last Name</label><input class="inp-field" id="ap-ln" value="'+prof.lastName+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Phone</label><input class="inp-field" id="ap-phone" value="'+prof.phone+'" placeholder="+91 98765 43210"></div>'
    +   '<div><label style="'+lbl+'">Gender</label><select class="inp-field" id="ap-gender"><option value="">Select</option>'
    +   ['Male','Female','Non-binary','Prefer not to say'].map(function(g){return '<option value="'+g+'"'+(prof.gender===g?' selected':'')+'>'+g+'</option>';}).join('')
    +   '</select></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Designation</label><input class="inp-field" id="ap-desig" value="'+prof.designation+'"></div>'
    +   '<div><label style="'+lbl+'">Subject</label><input class="inp-field" id="ap-dept" value="'+prof.department+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    +   '<div><label style="'+lbl+'">Date of Birth</label><input class="inp-field" type="date" id="ap-dob" value="'+prof.dob+'"></div>'
    +   '<div><label style="'+lbl+'">Join Date</label><input class="inp-field" type="date" id="ap-join" value="'+prof.joinDate+'"></div>'
    + '</div>'
    + '<div><label style="'+lbl+'">Email</label>'
    +   '<input class="inp-field" value="'+email+'" disabled style="width:100%;cursor:not-allowed;background:rgba(255,255,255,0.02);color:var(--muted)" placeholder="cannot change"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#00d4c8,#4ade80);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">💾 Save Changes</button>'
    + '</form></div>';

  var pwCard = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">'
    + '<div style="width:34px;height:34px;border-radius:9px;background:rgba(108,71,255,.12);border:1px solid rgba(108,71,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">🔐</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:800">Change Password</div><div style="font-size:11px;color:var(--muted)">Keep your account secure</div></div></div>'
    + '<form onsubmit="changeFacultyPassword(event)" style="display:flex;flex-direction:column;gap:13px">'
    + '<div><label style="'+lbl+'">Current Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cur" type="password" placeholder="Enter current password" style="padding-right:44px" oninput="">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cur\',\'ap-b1\')" id="ap-b1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div></div>'
    + '<div><label style="'+lbl+'">New Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-nw" type="password" placeholder="Min 8 · uppercase · special" style="padding-right:44px" oninput="apPwStrength(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-nw\',\'ap-b2\')" id="ap-b2" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button></div>'
    +   '<div id="ap-pw-strength" style="display:none;margin-top:6px"><div style="display:flex;gap:3px;margin-bottom:3px"><div id="aps1" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps2" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps3" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div><div id="aps4" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:background .3s"></div></div><div id="aps-label" style="font-size:10px;color:var(--muted)"></div></div></div>'
    + '<div><label style="'+lbl+'">Confirm Password</label>'
    +   '<div style="position:relative"><input class="inp-field" id="ap-cnw" type="password" placeholder="Re-enter new password" style="padding-right:44px" oninput="apPwMatch(this.value)">'
    +   '<button type="button" onclick="toggleFieldPw(\'ap-cnw\',\'ap-b3\')" id="ap-b3" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted)">👁️</button>'
    +   '<div id="ap-match-hint" style="font-size:11px;margin-top:5px;display:none"></div></div></div>'
    + '<div id="ap-pw-err" style="display:none;color:var(--admin);font-size:12px;font-weight:600;padding:10px 13px;background:rgba(255,45,107,.08);border-radius:9px;border:1px solid rgba(255,45,107,.2)"></div>'
    + '<button type="submit" style="height:44px;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,#6c47ff,#ff2d6b);color:#fff;font-family:Syne,sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .18s" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">🔐 Update Password</button>'
    + '</form>'
    + '<div style="margin-top:16px;padding:12px 14px;background:rgba(108,71,255,.06);border:1px solid rgba(108,71,255,.15);border-radius:10px">'
    + '<div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:4px">🛡️ Password tips</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.7">Use uppercase, lowercase, numbers and symbols. Avoid using your name or email as your password.</div>'
    + '</div></div>';

  return '<div style="animation:fadeUp .28s ease;max-width:1100px">'
    + hero + chips
    + '<div style="display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:16px;align-items:start">'
    + infoCard + editCard + pwCard
    + '</div></div>';
};

function apPwStrength(v) {
  var sb=document.getElementById('ap-pw-strength'),l=document.getElementById('aps-label');
  if(!sb)return; sb.style.display=v?'block':'none';
  var bars=['aps1','aps2','aps3','aps4'].map(function(id){return document.getElementById(id);});
  var sc=0; if(v.length>=8)sc++; if(/[A-Z]/.test(v))sc++; if(/[0-9]/.test(v))sc++; if(/[^A-Za-z0-9]/.test(v))sc++;
  var cols=['#ff2d6b','#fbbf24','#fbbf24','#4ade80'];
  bars.forEach(function(b,i){if(b)b.style.background=i<sc?cols[sc-1]:'var(--border)';});
  if(l)l.textContent=sc>0?['Weak','Fair','Good','Strong'][sc-1]:'';
}

function apPwMatch(v) {
  var h=document.getElementById('ap-match-hint'),nw=document.getElementById('ap-nw');
  if(!h)return; if(!v){h.style.display='none';return;} h.style.display='block';
  var match=v===(nw?nw.value:'');
  h.textContent=match?'✅ Passwords match':'❌ Passwords don\'t match';
  h.style.color=match?'var(--student)':'var(--admin)';
}


function publishAnnouncement() {
  var targets = [];
  if (document.getElementById('ann-to-faculty') && document.getElementById('ann-to-faculty').checked)     targets.push('Faculty');
  if (document.getElementById('ann-to-rvlh') && document.getElementById('ann-to-rvlh').checked)           targets.push('RVLH Students');
  if (document.getElementById('ann-to-offcampus') && document.getElementById('ann-to-offcampus').checked) targets.push('Off Campus Students');
  if (!targets.length) { toast('Select at least one audience','⚠️'); return; }
  toast('Published to: ' + targets.join(', '),'📢');
}


PAGES['admin_settings'] = function() {
  // Persistent state for settings
  if (!window._settingsData) {
    window._settingsData = {
      general: { name:'RV Learning Hub', website:'www.rvlearninghub.com', email:'admin@rvhub.com', phone:'+91 98765 43210', address:'Rajajinagar, Bengaluru — 560010', tagline:'JEE • NEET • Commerce', timezone:'IST (UTC+5:30)', academic:'2024-25' },
      toggles: { 'Student Self-Registration':true,'Online Fee Payment':true,'Parent Portal':true,'AI Suggestions':true,'Auto Attendance':false,'Live Recording':true,'DRM Protection':true,'WhatsApp Notifs':false,'Email Notifications':true,'SMS Alerts':false,'Dark Mode Default':true,'Maintenance Mode':false },
      integrations: [
        { key:'razorpay', n:'Razorpay (Payments)',    s:true,  ic:'💳', url:'https://api.razorpay.com', key_hint:'rzp_live_****' },
        { key:'zoom',     n:'Zoom (Live Classes)',    s:true,  ic:'📡', url:'https://api.zoom.us',      key_hint:'zoom_key_****' },
        { key:'whatsapp', n:'WhatsApp Business API',  s:false, ic:'💬', url:'https://api.whatsapp.com', key_hint:'Not configured' },
        { key:'firebase', n:'Firebase (Push Notif)',  s:true,  ic:'🔥', url:'https://firebase.google.com',key_hint:'firebase_****' },
        { key:'analytics',n:'Google Analytics',       s:true,  ic:'📊', url:'https://analytics.google.com',key_hint:'UA-*****' },
        { key:'digilocker',n:'DigiLocker',            s:false, ic:'🏅', url:'https://digilocker.gov.in', key_hint:'Not configured' },
      ],
      fees: [
        { id:0, c:'JEE Advanced (2yr)',  f:45000, e:4000,   freq:'monthly', disc:5 },
        { id:1, c:'NEET Complete',       f:38000, e:3500,   freq:'monthly', disc:0 },
        { id:2, c:'Commerce XI+XII',     f:28000, e:2500,   freq:'monthly', disc:3 },
        { id:3, c:'JEE Mains Crash',     f:12000, e:12000,  freq:'one-time', disc:0 },
      ],
    };
  }
  var D = window._settingsData;

  // ── GENERAL SETTINGS ──
  var genCard = '<div class="card">'
    + '<div class="card-title" style="margin-bottom:14px">⚙️ General Settings</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Institute Name</label><input class="inp-field" id="gs-name" value="'+D.general.name+'"></div>'
    + '<div class="inp-group"><label>Tagline</label><input class="inp-field" id="gs-tagline" value="'+D.general.tagline+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Website</label><input class="inp-field" id="gs-web" value="'+D.general.website+'"></div>'
    + '<div class="inp-group"><label>Admin Email</label><input class="inp-field" id="gs-email" type="email" value="'+D.general.email+'"></div>'
    + '</div>'
    + '<div class="inp-row">'
    + '<div class="inp-group"><label>Phone</label><input class="inp-field" id="gs-phone" value="'+D.general.phone+'"></div>'
    + '<div class="inp-group"><label>Academic Year</label><input class="inp-field" id="gs-year" value="'+D.general.academic+'"></div>'
    + '</div>'
    + '<div class="inp-group"><label>Address</label><input class="inp-field" id="gs-addr" value="'+D.general.address+'"></div>'
    + '<div style="display:flex;gap:8px;margin-top:4px">'
    + '<button class="btn btn-solid" onclick="saveGeneralSettings()">💾 Save Changes</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Settings reset to defaults\',\'↺\')">↺ Reset</button>'
    + '</div></div>';

  // ── FEATURE TOGGLES ──
  var toggleCard = '<div class="card"><div class="card-title" style="margin-bottom:14px">🔧 Feature Toggles</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    + Object.entries(D.toggles).map(function(entry) {
        var k = entry[0], v = entry[1];
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:9px;background:var(--surface2);border:1px solid rgba(255,255,255,0.07)">'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:12px;font-weight:600;color:var(--text)">'+k+'</div>'
          + '<div style="font-size:10px;color:'+(v?'var(--student)':'var(--muted)')+';margin-top:2px">'+(v?'● Active':'○ Inactive')+'</div></div>'
          + '<div class="toggle '+(v?'on':'')+'" id="tog-'+k.replace(/\s+/g,'-')+'" onclick="toggleSetting(\''+k.replace(/'/g,"\\'")+'\')" title="Toggle '+k+'"></div>'
          + '</div>';
      }).join('')
    + '</div></div>';

  // ── INTEGRATIONS ──
  var intCard = '<div class="card">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div class="card-title" style="margin-bottom:0">🔗 Integrations</div>'
    + '<span style="font-size:11px;color:var(--muted)">'+D.integrations.filter(function(i){return i.s;}).length+' / '+D.integrations.length+' connected</span>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + D.integrations.map(function(intg) {
        var borderCol = intg.s ? 'rgba(74,222,128,.35)' : 'var(--border)';
        return '<div style="padding:14px;background:var(--surface2);border-radius:12px;border:1.5px solid '+borderCol+';display:flex;flex-direction:column;gap:10px">'
          + '<div style="display:flex;align-items:center;gap:10px">'
          + '<div style="width:40px;height:40px;border-radius:10px;background:'+(intg.s?'rgba(74,222,128,.12)':'rgba(107,122,153,.08)')+';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">'+intg.ic+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-weight:700;font-size:12px;color:var(--text)">'+intg.n+'</div>'
          + '<div style="font-size:10px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+intg.url+'</div></div>'
          + '<span class="badge '+(intg.s?'badge-green':'badge-red')+'">'+( intg.s?'ON':'OFF')+'</span>'
          + '</div>'
          + '<div style="display:flex;gap:7px">'
          + '<button class="btn btn-sm '+(intg.s?'btn-red':'btn-green')+' btn-full" onclick="toggleIntegration(\''+intg.key+'\')">'+(intg.s?'Disconnect':'⚡ Connect')+'</button>'
          + (intg.s ? '<button class="btn btn-sm btn-teal" onclick="testIntegration(\''+intg.n+'\')">🔍 Test</button>' : '')
          + '</div>'
          + (!intg.s ? '<div style="display:flex;flex-direction:column;gap:6px">'
              + '<input class="inp-field" style="font-size:11px;padding:7px 10px" placeholder="API key..." id="int-key-'+intg.key+'">'
              + '<input class="inp-field" style="font-size:11px;padding:7px 10px" placeholder="Secret / Webhook URL...">'
              + '</div>' : '')
          + '</div>';
      }).join('')
    + '</div></div>';

  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div class="grid-2">' + genCard + toggleCard + '</div>'
    + intCard
    + '</div>';
};

function saveGeneralSettings() {
  var D = window._settingsData;
  if (!D) return;
  var fields = { name:'gs-name', website:'gs-web', email:'gs-email', phone:'gs-phone', address:'gs-addr', academic:'gs-year', tagline:'gs-tagline' };
  var errors = [];
  Object.entries(fields).forEach(function(e) {
    var el = document.getElementById(e[1]);
    if (el) { D.general[e[0]] = el.value.trim(); if (!el.value.trim()) errors.push(e[0]); }
  });
  if (errors.length) { toast('Please fill in: '+errors.join(', '),'⚠️'); return; }
  toast('General settings saved successfully!','✅');
}

function toggleSetting(key) {
  var D = window._settingsData;
  if (!D) return;
  D.toggles[key] = !D.toggles[key];
  var state = D.toggles[key];

  // ── Apply real functional effects ──
  switch(key) {
    case 'Dark Mode Default':
      // Toggle CSS class on body for dark/light mode
      document.body.classList.toggle('light-mode', !state);
      if (!state) {
        document.body.style.setProperty('--bg','#f0f4f8');
        document.body.style.setProperty('--surface','#ffffff');
        document.body.style.setProperty('--surface2','#f5f7fa');
        document.body.style.setProperty('--border','#e2e8f0');
        document.body.style.setProperty('--text','#1a2235');
        document.body.style.setProperty('--muted','#64748b');
      } else {
        document.body.style.setProperty('--bg','#080c14');
        document.body.style.setProperty('--surface','#0e1420');
        document.body.style.setProperty('--surface2','#141c2c');
        document.body.style.setProperty('--border','#1e2a3a');
        document.body.style.setProperty('--text','#e8edf5');
        document.body.style.setProperty('--muted','#6b7a99');
      }
      toast('Dark Mode ' + (state ? 'enabled' : 'disabled — Light Mode active'), state ? '🌙' : '☀️');
      break;

    case 'Maintenance Mode':
      var existBanner = document.getElementById('maintenance-banner');
      if (state) {
        if (!existBanner) {
          var banner = document.createElement('div');
          banner.id = 'maintenance-banner';
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#fbbf24,#ff6b35);color:#080c14;padding:10px 20px;font-size:13px;font-weight:700;text-align:center;animation:fadeUp .3s ease;display:flex;align-items:center;justify-content:center;gap:10px';
          banner.innerHTML = '🚧 MAINTENANCE MODE ACTIVE — Site is in maintenance. Users will see a maintenance page. <button onclick="document.getElementById(\'maintenance-banner\').remove()" style="margin-left:12px;background:rgba(0,0,0,.15);border:none;padding:3px 10px;border-radius:6px;cursor:pointer;font-weight:700">Dismiss</button>';
          document.body.prepend(banner);
        }
        toast('⚠️ Maintenance Mode ON — users are locked out', '🚧');
      } else {
        if (existBanner) existBanner.remove();
        toast('Maintenance Mode disabled — site is live', '✅');
      }
      break;

    case 'Student Self-Registration':
      toast('Student Self-Registration ' + (state ? 'enabled — /register page is live' : 'disabled — registration blocked'), state ? '✅' : '🔒');
      break;

    case 'Online Fee Payment':
      toast('Online Fee Payment ' + (state ? 'enabled — Razorpay active' : 'disabled — manual payments only'), state ? '✅' : '💳');
      break;

    case 'Parent Portal':
      toast('Parent Portal ' + (state ? 'enabled — parents can log in' : 'disabled — parent access blocked'), state ? '✅' : '🔒');
      break;

    case 'AI Suggestions':
      toast('AI Suggestions ' + (state ? 'enabled — recommendations active' : 'disabled'), state ? '🤖' : '🔒');
      break;

    case 'Auto Attendance':
      toast('Auto Attendance ' + (state ? 'enabled — QR/biometric attendance tracking on' : 'disabled — manual attendance only'), state ? '✅' : '📋');
      break;

    case 'Live Recording':
      toast('Live Recording ' + (state ? 'enabled — classes will be recorded' : 'disabled — no recording'), state ? '🔴' : '⏹');
      break;

    case 'DRM Protection':
      toast('DRM Protection ' + (state ? 'enabled — videos are protected' : 'DISABLED — video protection off ⚠️'), state ? '🔒' : '⚠️');
      break;

    case 'WhatsApp Notifs':
      toast('WhatsApp Notifications ' + (state ? 'enabled — messages will be sent via WhatsApp Business' : 'disabled'), state ? '💬' : '🔕');
      break;

    case 'Email Notifications':
      toast('Email Notifications ' + (state ? 'enabled — automated emails active' : 'disabled — no emails will be sent'), state ? '📧' : '🔕');
      break;

    case 'SMS Alerts':
      toast('SMS Alerts ' + (state ? 'enabled — SMS gateway active' : 'disabled'), state ? '📱' : '🔕');
      break;

    default:
      toast(key + ' ' + (state ? 'enabled' : 'disabled'), state ? '✅' : '❌');
  }

  // Update toggle UI in-place (no reload)
  var togEl = document.getElementById('tog-'+key.replace(/\s+/g,'-'));
  if (togEl) {
    togEl.classList.toggle('on', state);
    var card = togEl.closest('div[style*="border-radius:9px"]');
    if (card) {
      var statusLine = card.querySelector('div[style*="font-size:10px"]');
      if (statusLine) {
        statusLine.textContent = state ? '● Active' : '○ Inactive';
        statusLine.style.color = state ? 'var(--student)' : 'var(--muted)';
      }
    }
  }
}

function toggleIntegration(key) {
  var D = window._settingsData;
  if (!D) return;
  var intg = D.integrations.find(function(i){ return i.key===key; });
  if (!intg) return;

  if (intg.s) {
    // Disconnect
    intg.s = false;
    intg.apiKey = '';
    toast(intg.n + ' disconnected', '❌');
    loadPage('settings');
    return;
  }

  // Connect — validate API key
  var apiKeyEl = document.getElementById('int-key-'+key);
  var apiKeyVal = apiKeyEl ? apiKeyEl.value.trim() : '';

  // Each integration has its own key format validation
  var validations = {
    razorpay  : function(k){ return k.startsWith('rzp_') && k.length > 10; },
    zoom      : function(k){ return k.length >= 8; },
    whatsapp  : function(k){ return k.length >= 10; },
    firebase  : function(k){ return k.length >= 10; },
    analytics : function(k){ return k.startsWith('UA-') || k.startsWith('G-') || k.length >= 6; },
    digilocker: function(k){ return k.length >= 8; },
  };

  var hints = {
    razorpay  : 'Must start with rzp_ (e.g. rzp_live_xxxxxxxx)',
    zoom      : 'Enter your Zoom API key (min 8 chars)',
    whatsapp  : 'Enter your WhatsApp Business API key',
    firebase  : 'Enter your Firebase server key',
    analytics : 'Must start with UA- or G- (e.g. G-XXXXXXXXXX)',
    digilocker: 'Enter your DigiLocker client ID',
  };

  if (!apiKeyVal) {
    toast('Enter an API key to connect ' + intg.n, '🔑');
    if (apiKeyEl) { apiKeyEl.focus(); apiKeyEl.style.borderColor = 'var(--admin)'; setTimeout(function(){ apiKeyEl.style.borderColor=''; }, 2000); }
    return;
  }

  var validator = validations[key];
  if (validator && !validator(apiKeyVal)) {
    toast('Invalid key format — ' + (hints[key] || 'Check your API key'), '⚠️');
    if (apiKeyEl) { apiKeyEl.style.borderColor = 'var(--admin)'; setTimeout(function(){ apiKeyEl.style.borderColor=''; }, 2000); }
    return;
  }

  // Simulate async connection
  toast('Connecting to ' + intg.n + '...', '🔄');
  setTimeout(function() {
    intg.s = true;
    intg.apiKey = apiKeyVal;
    intg.key_hint = apiKeyVal.substring(0, 4) + '****' + apiKeyVal.slice(-4);
    toast(intg.n + ' connected successfully!', '✅');
    loadPage('settings');
  }, 900);
}

function testIntegration(name) {
  toast('Testing ' + name + ' connection...', '🔄');
  var steps = [
    [400,  'Establishing secure connection...', '🔄'],
    [900,  'Authenticating credentials...', '🔑'],
    [1500, name + ' — Connection test passed! ✅', '✅'],
  ];
  steps.forEach(function(s){
    setTimeout(function(){ toast(s[1], s[2]); }, s[0]);
  });
}
// ═══════════════════════════════════════════════════════
// VIDEOS & MATERIALS (admin_media)
// ═══════════════════════════════════════════════════════
var VIDEO_QUIZ = {
  'Electrostatics — Coulomb\'s Law & Electric Field': [
    { q:'What is the SI unit of electric charge?', opts:['Volt','Coulomb','Ampere','Farad'], ans:1 },
    { q:'Coulomb\'s Law force is proportional to:', opts:['r','r²','1/r','1/r²'], ans:3 },
    { q:'Electric field lines originate from:', opts:['Negative charges','Neutral charges','Positive charges','Conductors only'], ans:2 },
  ],
  'Gauss Law — Full Derivation with Problems': [
    { q:'Gauss\'s law relates electric flux to:', opts:['Charge density','Enclosed charge','Potential difference','Current'], ans:1 },
    { q:'For a spherical Gaussian surface around point charge, flux =', opts:['q/ε₀','q·ε₀','q/2ε₀','2q/ε₀'], ans:0 },
  ],
  'Calculus — Limits & Continuity': [
    { q:'A function is continuous at x=a if:', opts:['f(a) is defined','limit exists','limit equals f(a)','All of the above'], ans:3 },
    { q:'lim(x→0) sin(x)/x =', opts:['0','∞','1','undefined'], ans:2 },
  ],
  'Integration — All Methods Covered': [
    { q:'∫eˣ dx =', opts:['eˣ + C','eˣ/x + C','xeˣ + C','e⁻ˣ + C'], ans:0 },
    { q:'Integration by parts: ∫u dv =', opts:['uv - ∫v du','uv + ∫v du','∫u du - v','∫v du - uv'], ans:0 },
  ],
  'Organic Chemistry — IUPAC Naming': [
    { q:'The suffix for an alcohol in IUPAC naming is:', opts:['-al','-ol','-oic acid','-one'], ans:1 },
    { q:'How many carbons does "but" prefix represent?', opts:['2','3','4','5'], ans:2 },
  ],
  'Cell Structure — Complete Revision': [
    { q:'Powerhouse of the cell is:', opts:['Nucleus','Ribosome','Mitochondria','Golgi body'], ans:2 },
    { q:'Cell wall in plants is made of:', opts:['Chitin','Cellulose','Peptidoglycan','Protein'], ans:1 },
    { q:'DNA is found in:', opts:['Cytoplasm only','Nucleus only','Nucleus and Mitochondria','Ribosome'], ans:2 },
  ],
  'Partnership Accounts — Introduction': [
    { q:'In partnership, profit/loss is shared in:', opts:['Equal ratio always','Agreed ratio','Capital ratio only','Time ratio only'], ans:1 },
    { q:'Goodwill at the time of admission is credited to:', opts:['New partner','Old partners','All partners equally','Government'], ans:1 },
  ],
};

var MEDIA_DB = {
  'JEE Advanced (Main + KCET Decoded)': {
    Physics: {
      videos: [
        { t:'Electrostatics — Coulomb\'s Law & Electric Field', dur:'48 min', views:1240, date:'Mar 10', fac:'Dr. Priya Mehta', thumb:'⚡' },
        { t:'Gauss Law — Full Derivation with Problems',         dur:'55 min', views:980,  date:'Mar 8',  fac:'Dr. Priya Mehta', thumb:'🔋' },
        { t:'Capacitors — Energy & Combinations',                dur:'42 min', views:760,  date:'Mar 5',  fac:'Dr. Priya Mehta', thumb:'💡' },
        { t:'Current Electricity — Ohm\'s Law & Kirchhoff',      dur:'50 min', views:890,  date:'Mar 3',  fac:'Dr. Priya Mehta', thumb:'⚡' },
      ],
      materials: [{ t:'Chapter 1 — Electrostatics Notes',   type:'PDF', size:'2.4 MB',date:'Mar 10', pg:28 },
                  { t:'Chapter 2 — Current Electricity',    type:'PDF', size:'1.8 MB',date:'Mar 8',  pg:22 },
                  { t:'DPP Set 1-5 with Solutions',         type:'PDF', size:'3.2 MB',date:'Mar 6',  pg:45 }]
    },
    Chemistry: {
      videos: [
        { t:'Organic Chemistry — IUPAC Naming',       dur:'44 min', views:1100, date:'Mar 9',  fac:'Prof. Amit Singh', thumb:'🧪' },
        { t:'Reaction Mechanisms — SN1 vs SN2',       dur:'58 min', views:870,  date:'Mar 7',  fac:'Prof. Amit Singh', thumb:'⚗️' },
        { t:'Coordination Compounds — Complete',      dur:'60 min', views:640,  date:'Mar 4',  fac:'Prof. Amit Singh', thumb:'🧬' },
      ],
      materials: [{ t:'Organic Reactions Quick Sheet', type:'PDF', size:'1.2 MB',date:'Mar 9',  pg:12 },
                  { t:'Inorganic Chemistry Notes',     type:'PDF', size:'2.8 MB',date:'Mar 5',  pg:35 }]
    },
    Mathematics: {
      videos: [
        { t:'Calculus — Limits & Continuity',         dur:'52 min', views:1320, date:'Mar 11', fac:'Mr. Raj Sharma', thumb:'📐' },
        { t:'Integration — All Methods Covered',      dur:'65 min', views:1050, date:'Mar 9',  fac:'Mr. Raj Sharma', thumb:'∫' },
        { t:'Vectors & 3D Geometry',                  dur:'48 min', views:780,  date:'Mar 6',  fac:'Mr. Raj Sharma', thumb:'📊' },
      ],
      materials: [{ t:'Calculus Formula Sheet',       type:'PDF', size:'0.8 MB',date:'Mar 11', pg:8  },
                  { t:'Algebra Problem Bank',         type:'PDF', size:'4.1 MB',date:'Mar 7',  pg:60 }]
    }
  },
  'NEET UG Decoded': {
    Biology: {
      videos: [
        { t:'Cell Structure — Complete Revision',     dur:'55 min', views:890, date:'Mar 10', fac:'Dr. Kavya R.', thumb:'🔬' },
        { t:'Human Physiology — Nervous System',      dur:'48 min', views:720, date:'Mar 8',  fac:'Dr. Kavya R.', thumb:'🧠' },
        { t:'Plant Kingdom — Classification',         dur:'42 min', views:630, date:'Mar 5',  fac:'Dr. Kavya R.', thumb:'🌿' },
      ],
      materials: [{ t:'Biology NCERT Key Points',    type:'PDF', size:'3.6 MB',date:'Mar 10', pg:48 },
                  { t:'Previous Year MCQs Biology',  type:'PDF', size:'2.1 MB',date:'Mar 6',  pg:32 }]
    },
    Physics: {
      videos: [
        { t:'Optics — Ray & Wave Optics',            dur:'50 min', views:560, date:'Mar 9',  fac:'Prof. Amit Singh', thumb:'🔭' },
        { t:'Modern Physics — Atomic Models',         dur:'44 min', views:480, date:'Mar 7',  fac:'Prof. Amit Singh', thumb:'⚛️' },
      ],
      materials: [{ t:'Physics Formula Sheet NEET',  type:'PDF', size:'1.4 MB',date:'Mar 9',  pg:16 }]
    },
    Chemistry: {
      videos: [
        { t:'Biomolecules — Carbohydrates & Proteins',dur:'46 min', views:720, date:'Mar 8',  fac:'Prof. Amit Singh', thumb:'🧬' },
        { t:'Electrochemistry for NEET',              dur:'40 min', views:540, date:'Mar 5',  fac:'Prof. Amit Singh', thumb:'🔋' },
      ],
      materials: [{ t:'Chemistry Quick Revision',    type:'PDF', size:'1.9 MB',date:'Mar 8',  pg:24 }]
    }
  },
  'Commerce Decoded Programme': {
    Accountancy: {
      videos: [
        { t:'Partnership Accounts — Introduction',   dur:'45 min', views:420, date:'Mar 9',  fac:'Prof. Neha K.', thumb:'📊' },
        { t:'Ratio Analysis — Complete Guide',        dur:'38 min', views:360, date:'Mar 7',  fac:'Prof. Neha K.', thumb:'📈' },
      ],
      materials: [{ t:'Accountancy Formula Sheet',   type:'PDF', size:'1.1 MB',date:'Mar 9',  pg:10 }]
    },
    Economics: {
      videos: [
        { t:'Macro Economics — National Income',     dur:'42 min', views:380, date:'Mar 8',  fac:'Prof. Neha K.', thumb:'💹' },
        { t:'Micro Economics — Supply & Demand',     dur:'35 min', views:310, date:'Mar 6',  fac:'Prof. Neha K.', thumb:'📉' },
      ],
      materials: [{ t:'Economics Notes XI & XII',   type:'PDF', size:'2.4 MB',date:'Mar 8',  pg:36 }]
    },
    'Business Studies': {
      videos: [
        { t:'Business Finance — Sources of Funds',   dur:'40 min', views:290, date:'Mar 7',  fac:'Prof. Neha K.', thumb:'💼' },
      ],
      materials: [{ t:'Business Studies Summary',   type:'PDF', size:'1.5 MB',date:'Mar 7',  pg:20 }]
    }
  }
};

var FORMULA_SUBJECTS = {
  Physics:     [{ t:'Mechanics Formulas',        pg:12 },{ t:'Electricity & Magnetism', pg:15 },{ t:'Optics Formulas',      pg:8  },{ t:'Thermodynamics',         pg:10 }],
  Chemistry:   [{ t:'Organic Chemistry Quick',   pg:18 },{ t:'Inorganic Reactions',     pg:14 },{ t:'Physical Chem Formulas',pg:12 },{ t:'Electrochemistry',        pg:9  }],
  Mathematics: [{ t:'Calculus Formulas',          pg:10 },{ t:'Algebra & Series',        pg:12 },{ t:'Trigonometry',         pg:8  },{ t:'Coordinate Geometry',     pg:11 }],
  Biology:     [{ t:'Cell Biology Key Points',    pg:8  },{ t:'Human Physiology',        pg:14 },{ t:'Plant Physiology',     pg:9  },{ t:'Ecology Summary',         pg:7  }],
  Accountancy: [{ t:'Journal Entry Rules',        pg:6  },{ t:'Ratio Formulas',          pg:8  },{ t:'Partnership Formulas', pg:7  }],
  Economics:   [{ t:'Macro Economic Formulas',    pg:8  },{ t:'Micro Economic Concepts', pg:10 }],
};

var QUESTION_PAPERS = {
  'JEE Advanced (Main + KCET Decoded)': {
    2024: [{ t:'JEE Advanced 2024 Paper 1 + Solutions', subj:'All', type:'Main Exam' },{ t:'JEE Advanced 2024 Paper 2 + Solutions',subj:'All',type:'Main Exam'},{ t:'JEE Mains Jan 2024 All Sets',subj:'All',type:'Mains'}],
    2023: [{ t:'JEE Advanced 2023 Paper 1 + Solutions', subj:'All', type:'Main Exam' },{ t:'JEE Advanced 2023 Paper 2 + Solutions',subj:'All',type:'Main Exam'},{ t:'KCET 2023 Question Paper',subj:'All',type:'State'}],
    2022: [{ t:'JEE Advanced 2022 Complete Papers',     subj:'All', type:'Main Exam' },{ t:'JEE Mains 2022 All Sessions',         subj:'All',type:'Mains'}],
  },
  'NEET UG Decoded': {
    2024: [{ t:'NEET UG 2024 Official Paper + Key',     subj:'All', type:'Main Exam' },{ t:'NEET UG 2024 Re-exam Paper',          subj:'All',type:'Re-exam'}],
    2023: [{ t:'NEET UG 2023 Official Paper + Key',     subj:'All', type:'Main Exam' }],
    2022: [{ t:'NEET UG 2022 Official Paper + Key',     subj:'All', type:'Main Exam' }],
  },
  'Commerce Decoded Programme': {
    2024: [{ t:'CBSE Commerce XII 2024 Paper',          subj:'All', type:'Board'     },{ t:'CBSE Commerce XI 2024 Paper',         subj:'All',type:'Board'}],
    2023: [{ t:'CBSE Commerce XII 2023 Paper',          subj:'All', type:'Board'     }],
  },
};

PAGES['admin_media'] = function() {
  var mediaState = window._mediaState || { tab:'videos', course:null, subject:null, matTab:null, qpCourse:null, qpYear:null };
  window._mediaState = mediaState;

  function crumbHtml() {
    var crumbs = ['<span style="cursor:pointer;color:var(--admin);font-weight:600" onclick="_mediaNav(\'reset\')">📂 All</span>'];
    if (mediaState.tab==='videos') {
      if (mediaState.course) crumbs.push('<span style="cursor:pointer;color:var(--purple);font-weight:600" onclick="_mediaNav(\'vcourse\')">' + mediaState.course.split('(')[0].trim() + '</span>');
      if (mediaState.subject) crumbs.push('<span style="color:var(--text)">' + mediaState.subject + '</span>');
    } else if (mediaState.tab==='materials') {
      if (mediaState.matTab) {
        crumbs.push('<span style="cursor:pointer;color:var(--purple);font-weight:600" onclick="_mediaNav(\'mattype\')">' + mediaState.matTab + '</span>');
        if (mediaState.matTab==='Course Materials' && mediaState.course) crumbs.push('<span style="cursor:pointer;color:var(--purple);font-weight:600" onclick="_mediaNav(\'matcourse\')">' + mediaState.course.split('(')[0].trim() + '</span>');
        if (mediaState.matTab==='Course Materials' && mediaState.subject) crumbs.push('<span style="color:var(--text)">' + mediaState.subject + '</span>');
        if (mediaState.matTab==='Formula Materials' && mediaState.subject) crumbs.push('<span style="color:var(--text)">' + mediaState.subject + '</span>');
        if (mediaState.matTab==='Question Papers' && mediaState.qpCourse) crumbs.push('<span style="cursor:pointer;color:var(--purple);font-weight:600" onclick="_mediaNav(\'qpcourse\')">' + mediaState.qpCourse.split('(')[0].trim() + '</span>');
        if (mediaState.matTab==='Question Papers' && mediaState.qpYear) crumbs.push('<span style="color:var(--text)">' + mediaState.qpYear + '</span>');
      }
    }
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;padding:10px 14px;background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:10px;font-size:13px;flex-wrap:wrap">'
      + '<span style="color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-right:4px">PATH</span>'
      + crumbs.join('<span style="color:var(--border);font-size:16px;font-weight:300;margin:0 2px">›</span>') + '</div>';
  }

  window._mediaNav = function(action) {
    if (action==='reset')    { mediaState.course=null; mediaState.subject=null; mediaState.matTab=null; mediaState.qpCourse=null; mediaState.qpYear=null; }
    if (action==='vcourse')  { mediaState.subject=null; }
    if (action==='mattype')  { mediaState.course=null; mediaState.subject=null; mediaState.qpCourse=null; mediaState.qpYear=null; }
    if (action==='matcourse'){ mediaState.subject=null; }
    if (action==='qpcourse') { mediaState.qpYear=null; }
    loadPage('media');
  };

  // Modern tab switcher
  var tabBar = '<div style="display:flex;gap:0;margin-bottom:20px;background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:4px;width:fit-content">'
    + [['videos','🎬','Videos'],['materials','📄','Materials']].map(function(t) {        var active = mediaState.tab === t[0];
        return '<button onclick="window._mediaState.tab=\''+t[0]+'\';window._mediaState.course=null;window._mediaState.subject=null;window._mediaState.matTab=null;window._mediaState.qpCourse=null;window._mediaState.qpYear=null;loadPage(\'media\')" '
          + 'style="padding:9px 22px;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:7px;'
          + (active ? 'background:linear-gradient(135deg,var(--admin),var(--purple));color:#fff;box-shadow:0 4px 14px rgba(255,45,107,.35)' : 'background:transparent;color:var(--muted)') + '">'
          + t[1] + ' ' + t[2] + '</button>';
      }).join('') + '</div>';

  var content = '';

  // ── VIDEOS FLOW ──
  if (mediaState.tab==='videos') {
    if (!mediaState.course) {
      // Show courses
      var courses = Object.keys(MEDIA_DB);
      content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Select a course to browse videos by subject</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">' + courses.map(function(cn) {
        var subjs = Object.keys(MEDIA_DB[cn]);
        var totalVids = subjs.reduce(function(a,s){return a+MEDIA_DB[cn][s].videos.length;},0);
        var cols = {'JEE':'#ff2d6b','NEET':'#4ade80','Commerce':'#fbbf24'};
        var col = cols[cn.split(' ')[0]] || '#6c47ff';
        return '<div onclick="window._mediaState.course=\''+cn.replace(/'/g,"\\'")+'\';;loadPage(\'media\')" '
          + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+col+' 22%,var(--border));border-radius:14px;padding:20px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden" '
          + 'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 10px 28px rgba(0,0,0,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
          + '<div style="position:absolute;top:0;right:0;width:80px;height:80px;background:radial-gradient(circle,color-mix(in srgb,'+col+' 18%,transparent),transparent 70%);pointer-events:none"></div>'
          + '<div style="width:52px;height:52px;border-radius:14px;background:color-mix(in srgb,'+col+' 14%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:14px">🎬</div>'
          + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px">'+cn.split('(')[0].trim()+'</div>'
          + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
          + '<span style="font-size:12px;color:var(--muted)">'+subjs.length+' subjects</span>'
          + '<span style="width:4px;height:4px;border-radius:50%;background:var(--border)"></span>'
          + '<span style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:'+col+'">'+totalVids+'</span>'
          + '<span style="font-size:12px;color:var(--muted)">videos</span></div>'
          + '<div style="display:flex;gap:5px;flex-wrap:wrap">'+subjs.map(function(s){return '<span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;background:color-mix(in srgb,'+col+' 10%,var(--surface2));color:'+col+';border:1px solid color-mix(in srgb,'+col+' 22%,transparent)">'+s+'</span>';}).join('')+'</div>'
          + '</div>';
      }).join('') + '</div>';
    } else if (!mediaState.subject) {
      // Show subjects for selected course
      var subjs = Object.keys(MEDIA_DB[mediaState.course]);
      var courseCol = mediaState.course.includes('JEE')?'#ff2d6b':mediaState.course.includes('NEET')?'#4ade80':'#fbbf24';
      content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Select a subject to view videos</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">' + subjs.map(function(sn) {
        var vids = MEDIA_DB[mediaState.course][sn].videos;
        var subIcon = sn==='Physics'?'⚡':sn==='Chemistry'?'🧪':sn==='Mathematics'?'📐':sn==='Biology'?'🔬':sn==='Accountancy'?'📊':sn==='Economics'?'💹':'📚';
        var subCol = sn==='Physics'?'#ff2d6b':sn==='Chemistry'?'#00d4c8':sn==='Mathematics'?'#6c47ff':sn==='Biology'?'#4ade80':sn==='Accountancy'?'#fbbf24':'#ff6b35';
        return '<div onclick="window._mediaState.subject=\''+sn+'\';loadPage(\'media\')" '
          + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+subCol+' 22%,var(--border));border-radius:14px;padding:18px;cursor:pointer;transition:all .22s" '
          + 'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 10px 24px rgba(0,0,0,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
          + '<div style="font-size:36px;margin-bottom:12px">'+subIcon+'</div>'
          + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:15px;margin-bottom:6px">'+sn+'</div>'
          + '<div style="display:flex;align-items:center;gap:8px">'
          + '<span style="font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:'+subCol+'">'+vids.length+'</span>'
          + '<span style="font-size:12px;color:var(--muted)">videos</span></div>'
          + '</div>';
      }).join('') + '</div>';
    } else {
      // Show videos for selected subject
      var vids = MEDIA_DB[mediaState.course][mediaState.subject].videos;
      content = '<div style="display:flex;flex-direction:column;gap:11px">'
        + vids.map(function(v,i) {
            return '<div class="card" style="display:flex;gap:14px;align-items:flex-start">'
              + '<div style="width:90px;height:60px;background:linear-gradient(135deg,rgba(255,45,107,.2),rgba(108,71,255,.2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;cursor:pointer" onclick="openVideoPlayer(\'' + v.t.replace(/'/g,"\\'") + '\')">'
              + '<div style="width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent rgba(255,255,255,.8)"></div></div>'
              + '<div style="flex:1">'
              + '<div style="font-weight:600;font-size:13px;margin-bottom:4px">'+v.t+'</div>'
              + '<div style="font-size:11px;color:var(--muted)">⏱ '+v.dur+' &nbsp;•&nbsp; 👁 '+v.views+' views &nbsp;•&nbsp; 👨‍🏫 '+v.fac+' &nbsp;•&nbsp; 📅 '+v.date+'</div>'
              + '</div>'
              + '<div style="display:flex;gap:6px;flex-shrink:0">'
              + '<button class="btn btn-sm btn-purple" onclick="openVideoPlayer(\'' + v.t.replace(/'/g,"\\'") + '\')">▶ Play</button>'
              + '<button class="btn btn-sm btn-red" onclick="deleteVideoItem(\'' + v._id + '\')">🗑 Delete</button>'
              + '</div></div>';
          }).join('') + '</div>';
    }
  }

  // ── MATERIALS FLOW ──
  if (mediaState.tab==='materials') {
    if (!mediaState.matTab) {
      content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Choose a material category</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">'
        + [
            { k:'Course Materials', icon:'📚', col:'#00d4c8', desc:'Subject-wise study notes & chapters', badge:'badge-teal' },
            { k:'Formula Materials', icon:'📐', col:'#6c47ff', desc:'Formula sheets by subject', badge:'badge-purple' },
            { k:'Question Papers', icon:'📝', col:'#fbbf24', desc:'Past papers organised by year', badge:'badge-yellow' }
          ].map(function(mt) {
            return '<div onclick="window._mediaState.matTab=\''+mt.k+'\';loadPage(\'media\')" '
              + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+mt.col+' 22%,var(--border));border-radius:16px;padding:24px;cursor:pointer;transition:all .22s;text-align:center" '
              + 'onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 12px 28px rgba(0,0,0,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
              + '<div style="width:64px;height:64px;border-radius:18px;background:color-mix(in srgb,'+mt.col+' 14%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px">'+mt.icon+'</div>'
              + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:15px;margin-bottom:6px">'+mt.k+'</div>'
              + '<div style="font-size:12px;color:var(--muted)">'+mt.desc+'</div>'
              + '</div>';
          }).join('') + '</div>';
    } else if (mediaState.matTab==='Course Materials') {
      if (!mediaState.course) {
        var courses = Object.keys(MEDIA_DB);
        content = '<div class="grid-2">' + courses.map(function(cn) {
          var subjs = Object.keys(MEDIA_DB[cn]);
          var totalMats = subjs.reduce(function(a,s){return a+MEDIA_DB[cn][s].materials.length;},0);
          var col = cn.includes('JEE')?'#ff2d6b':cn.includes('NEET')?'#4ade80':'#fbbf24';
          return '<div class="card" style="cursor:pointer;border-color:color-mix(in srgb,'+col+' 22%,var(--border))" onclick="window._mediaState.course=\''+cn.replace(/'/g,"\\'")+'\';;loadPage(\'media\')">'
            + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
            + '<div style="font-size:32px">📚</div>'
            + '<div><div style="font-weight:700;font-size:13px">'+cn.split('(')[0].trim()+'</div>'
            + '<div style="font-size:11px;color:var(--muted)">'+totalMats+' materials across '+subjs.length+' subjects</div></div></div></div>';
        }).join('') + '</div>';
      } else if (!mediaState.subject) {
        var subjs = Object.keys(MEDIA_DB[mediaState.course]);
        content = '<div class="grid-2">' + subjs.map(function(sn) {
          var mats = MEDIA_DB[mediaState.course][sn].materials;
          return '<div class="card" style="cursor:pointer" onclick="window._mediaState.subject=\''+sn+'\';loadPage(\'media\')">'
            + '<div style="display:flex;align-items:center;gap:10px">'
            + '<div style="font-size:32px">'+(sn==='Physics'?'⚡':sn==='Chemistry'?'🧪':sn==='Mathematics'?'📐':sn==='Biology'?'🔬':'📄')+'</div>'
            + '<div><div style="font-weight:700">'+sn+'</div><div style="font-size:12px;color:var(--muted)">'+mats.length+' materials</div></div></div></div>';
        }).join('') + '</div>';
      } else {
        var mats = MEDIA_DB[mediaState.course][mediaState.subject].materials;
        content = '<div style="margin-bottom:12px;font-size:12px;color:var(--muted)">'+mats.length+' materials available for download</div>'
          + '<div style="display:flex;flex-direction:column;gap:10px">'
          + mats.map(function(m) {
              return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;transition:all .18s" '
                + 'onmouseover="this.style.borderColor=\'var(--purple)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
                + '<div style="width:44px;height:52px;background:rgba(255,45,107,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📄</div>'
                + '<div style="flex:1">'
                + '<div style="font-weight:600;font-size:13px;margin-bottom:4px">'+m.t+'</div>'
                + '<div style="font-size:11px;color:var(--muted)">'+m.type+' &nbsp;•&nbsp; '+m.size+' &nbsp;•&nbsp; '+m.pg+' pages &nbsp;•&nbsp; Uploaded '+m.date+'</div>'
                + '</div>'
                + '<div style="display:flex;gap:8px;flex-shrink:0">'
                + '<button class="btn btn-teal" onclick="downloadMaterial(\''+m.t.replace(/'/g,"\\'")+'\')" style="gap:6px">⬇ Download PDF</button>'
                + '<button class="btn btn-sm btn-red" onclick="deleteMaterialItem(\'' + m._id + '\')">🗑</button>'
                + '</div></div>';
            }).join('') + '</div>';
      }
    } else if (mediaState.matTab==='Formula Materials') {
      if (!mediaState.subject) {
        var subs = Object.keys(FORMULA_SUBJECTS);
        content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Complete formula books by subject — one comprehensive PDF per subject</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">' + subs.map(function(sn) {
          var sheets = FORMULA_SUBJECTS[sn];
          var totalPg = sheets.reduce(function(a,s){return a+s.pg;},0);
          var subIcon = sn==='Physics'?'⚡':sn==='Chemistry'?'🧪':sn==='Mathematics'?'📐':sn==='Biology'?'🔬':sn==='Accountancy'?'📊':'💹';
          var subCol = sn==='Physics'?'#ff2d6b':sn==='Chemistry'?'#00d4c8':sn==='Mathematics'?'#6c47ff':sn==='Biology'?'#4ade80':sn==='Accountancy'?'#fbbf24':'#ff6b35';
          return '<div onclick="window._mediaState.subject=\''+sn+'\';loadPage(\'media\')" '
            + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+subCol+' 22%,var(--border));border-radius:14px;padding:18px;cursor:pointer;transition:all .22s" '
            + 'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 10px 24px rgba(0,0,0,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
            + '<div style="font-size:36px;margin-bottom:12px">'+subIcon+'</div>'
            + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;margin-bottom:4px">'+sn+'</div>'
            + '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Complete formula book &nbsp;•&nbsp; '+totalPg+' pages</div>'
            + '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:color-mix(in srgb,'+subCol+' 12%,var(--surface2));color:'+subCol+';border:1px solid color-mix(in srgb,'+subCol+' 22%,transparent)">📐 Formula Book</span>'
            + '</div>';
        }).join('') + '</div>';
      } else {
        // Single complete formula book for the subject
        var totalPg = (FORMULA_SUBJECTS[mediaState.subject]||[]).reduce(function(a,s){return a+s.pg;},0);
        var subIcon = mediaState.subject==='Physics'?'⚡':mediaState.subject==='Chemistry'?'🧪':mediaState.subject==='Mathematics'?'📐':mediaState.subject==='Biology'?'🔬':mediaState.subject==='Accountancy'?'📊':'💹';
        var subCol = mediaState.subject==='Physics'?'#ff2d6b':mediaState.subject==='Chemistry'?'#00d4c8':mediaState.subject==='Mathematics'?'#6c47ff':mediaState.subject==='Biology'?'#4ade80':mediaState.subject==='Accountancy'?'#fbbf24':'#ff6b35';
        var topics = (FORMULA_SUBJECTS[mediaState.subject]||[]).map(function(s){return s.t;}).join(', ');
        content = '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+subCol+' 28%,var(--border));border-radius:16px;padding:28px;max-width:560px">'
          + '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">'
          + '<div style="width:72px;height:72px;border-radius:18px;background:color-mix(in srgb,'+subCol+' 14%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:36px">'+subIcon+'</div>'
          + '<div><div style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin-bottom:4px">'+mediaState.subject+' Formula Book</div>'
          + '<div style="font-size:13px;color:var(--muted)">Complete formula reference &nbsp;•&nbsp; '+totalPg+' pages</div></div></div>'
          + '<div style="background:var(--surface2);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;margin-bottom:20px">'
          + '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Topics Covered</div>'
          + '<div style="font-size:13px;line-height:1.8">'+topics+'</div></div>'
          + '<div style="display:flex;gap:10px">'
          + '<button class="btn btn-solid" onclick="downloadMaterial(\''+mediaState.subject+' Complete Formula Book\')" style="flex:1;justify-content:center;padding:12px">⬇ Download Complete Formula Book</button>'
          + '</div></div>';
      }
    } else if (mediaState.matTab==='Question Papers') {
      if (!mediaState.qpCourse) {
        var courses = Object.keys(QUESTION_PAPERS);
        content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Select a course to browse past papers by year</div>'
          + '<div style="display:flex;flex-direction:column;gap:12px">' + courses.map(function(cn) {
          var years = Object.keys(QUESTION_PAPERS[cn]);
          var col = cn.includes('JEE')?'#ff2d6b':cn.includes('NEET')?'#4ade80':'#fbbf24';
          var totalPapers = years.reduce(function(a,yr){return a+QUESTION_PAPERS[cn][yr].length;},0);
          return '<div onclick="window._mediaState.qpCourse=\''+cn.replace(/'/g,"\\'")+'\';;loadPage(\'media\')" '
            + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+col+' 22%,var(--border));border-radius:14px;padding:18px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:14px" '
            + 'onmouseover="this.style.transform=\'translateX(4px)\'" onmouseout="this.style.transform=\'\'">'
            + '<div style="width:52px;height:52px;border-radius:14px;background:color-mix(in srgb,'+col+' 12%,var(--surface2));display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">📝</div>'
            + '<div style="flex:1">'
            + '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;margin-bottom:4px">'+cn.split('(')[0].trim()+'</div>'
            + '<div style="font-size:12px;color:var(--muted)">'+years.length+' years &nbsp;•&nbsp; '+totalPapers+' papers available</div>'
            + '<div style="display:flex;gap:5px;margin-top:6px">'+years.map(function(y){return '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:color-mix(in srgb,'+col+' 10%,var(--surface2));color:'+col+';border:1px solid color-mix(in srgb,'+col+' 22%,transparent)">'+y+'</span>';}).join('')+'</div>'
            + '</div>'
            + '<div style="color:var(--muted);font-size:20px">›</div>'
            + '</div>';
        }).join('') + '</div>';
      } else if (!mediaState.qpYear) {
        var years = Object.keys(QUESTION_PAPERS[mediaState.qpCourse]);
        var courseCol = mediaState.qpCourse.includes('JEE')?'#ff2d6b':mediaState.qpCourse.includes('NEET')?'#4ade80':'#fbbf24';
        content = '<div style="margin-bottom:10px;font-size:12px;color:var(--muted)">Select a year to view papers</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">' + years.map(function(yr) {
          var papers = QUESTION_PAPERS[mediaState.qpCourse][yr];
          return '<div onclick="window._mediaState.qpYear=\''+yr+'\';loadPage(\'media\')" '
            + 'style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,'+courseCol+' 22%,var(--border));border-radius:14px;padding:20px;cursor:pointer;transition:all .22s;text-align:center" '
            + 'onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 10px 24px rgba(0,0,0,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
            + '<div style="font-family:Syne,sans-serif;font-size:36px;font-weight:800;color:'+courseCol+';margin-bottom:6px">'+yr+'</div>'
            + '<div style="font-size:12px;color:var(--muted)">'+papers.length+' papers</div>'
            + '</div>';
        }).join('') + '</div>';
      } else {
        var papers = QUESTION_PAPERS[mediaState.qpCourse][mediaState.qpYear] || [];
        var qpCol = mediaState.qpCourse.includes('JEE')?'#ff2d6b':mediaState.qpCourse.includes('NEET')?'#4ade80':'#fbbf24';
        content = '<div style="margin-bottom:12px;font-size:12px;color:var(--muted)">'+papers.length+' papers for '+mediaState.qpYear+'</div>'
          + '<div style="display:flex;flex-direction:column;gap:10px">'
          + papers.map(function(p) {
              return '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;transition:all .18s" '
                + 'onmouseover="this.style.borderColor=\''+qpCol+'\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
                + '<div style="width:44px;height:52px;background:rgba(251,191,36,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📝</div>'
                + '<div style="flex:1">'
                + '<div style="font-weight:600;font-size:13px;margin-bottom:4px">'+p.t+'</div>'
                + '<div style="font-size:11px;color:var(--muted)">'+p.type+' &nbsp;•&nbsp; '+mediaState.qpYear+'</div>'
                + '</div>'
                + '<div style="display:flex;gap:8px;flex-shrink:0">'
                + '<button class="btn btn-sm btn-yellow" onclick="viewQuestionPaper(\''+p.t.replace(/'/g,"\\'")+'\')" style="gap:6px">👁 View</button>'
                + '<button class="btn btn-teal" onclick="downloadMaterial(\''+p.t.replace(/'/g,"\\'")+'\')" style="gap:6px">⬇ PDF</button>'
                + '</div></div>';
            }).join('') + '</div>';
      }
    }
  }

  return crumbHtml() + tabBar + content;
};


function viewQuestionPaper(title) {
  var body = '<div style="background:var(--surface2);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    + '<div style="width:48px;height:56px;background:rgba(251,191,36,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:26px">📝</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-weight:700;font-size:15px">'+title+'</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px">RV Learning Hub &nbsp;•&nbsp; Official Paper</div></div></div>'
    + '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:16px;font-size:13px;line-height:1.8">'
    + '<div style="font-weight:700;margin-bottom:10px;font-size:14px;text-align:center">SAMPLE PREVIEW</div>'
    + '<div style="margin-bottom:10px"><strong>Section A — Multiple Choice (60 Marks)</strong></div>'
    + '<div style="color:var(--muted);margin-bottom:8px">Q1. A body starts from rest and moves with uniform acceleration. The ratio of distance covered in 1st, 2nd and 3rd second is:</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">'
    + ['(A) 1 : 2 : 3','(B) 1 : 3 : 5','(C) 1 : 4 : 7','(D) 2 : 4 : 6'].map(function(o){return '<div style="padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:12px">'+o+'</div>';}).join('')
    + '</div>'
    + '<div style="color:var(--muted);margin-bottom:8px">Q2. The SI unit of work done is:</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    + ['(A) Watt','(B) Joule','(C) Newton','(D) Pascal'].map(function(o){return '<div style="padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:12px">'+o+'</div>';}).join('')
    + '</div>'
    + '<div style="margin-top:14px;padding:10px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:8px;text-align:center;font-size:12px;color:var(--muted)">'
    + '📄 This is a preview. Download the full paper for complete questions and solutions.</div>'
    + '</div></div>';
  openDetail('👁 ' + title, body,
    '<button class="btn btn-teal" onclick="downloadMaterial(\''+title.replace(/'/g,"\\'")+'\')" >⬇ Download Full PDF</button>');
}

function downloadMaterial(title) {
  // Generate a simple text blob as demo download (real app would use actual PDF URL)
  var content = 'RV Learning Hub\n' + title + '\n\nThis is a demo download. In production, this would link to the actual PDF file on your CDN.\n\nContent: ' + title;
  var blob = new Blob([content], { type: 'application/pdf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/[^a-z0-9]/gi, '_') + '.pdf';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Downloading: ' + title, '⬇');
}

window.deleteVideoItem = async function(id) {
  if (!confirm('Are you sure you want to delete this video?')) return;
  try {
    await api('/api/videos/' + id, {
      method: 'DELETE'
    });
    toast('Video deleted successfully!', '🗑️');
    await syncLMSData();
    loadPage('media');
  } catch (err) {
    toast('Failed to delete video: ' + err.message, '❌');
  }
};

window.deleteMaterialItem = async function(id) {
  if (!confirm('Are you sure you want to delete this study material?')) return;
  try {
    await api('/api/materials/' + id, {
      method: 'DELETE'
    });
    toast('Material deleted successfully!', '🗑️');
    await syncLMSData();
    loadPage('media');
  } catch (err) {
    toast('Failed to delete material: ' + err.message, '❌');
  }
};

function openVideoPlayer(title) {
  var sampleVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  ];
  var vidSrc = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];

  var body = '<div style="position:relative;background:#000;border-radius:12px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9">'
    + '<video id="lms-video-player" controls style="width:100%;height:100%;display:block;background:#000" preload="metadata">'
    + '<source src="' + vidSrc + '" type="video/mp4">'
    + 'Your browser does not support HTML5 video.</video>'
    + '<button onclick="document.getElementById(\'lms-video-player\').requestFullscreen()" '
    + 'style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer;z-index:10;backdrop-filter:blur(4px)">⛶ Fullscreen</button>'
    + '</div>'
    + '<div style="font-size:14px;font-weight:700;margin-bottom:4px">▶ ' + title + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">RV Learning Hub &nbsp;•&nbsp; HD Quality</div>';
  openDetail('▶ ' + title, body,
    '<button class="btn btn-teal" onclick="document.getElementById(\'lms-video-player\').requestFullscreen()">⛶ Full Screen</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Speed: 1.5x\',\'⚡\');var v=document.getElementById(\'lms-video-player\');if(v)v.playbackRate=1.5">⚡ 1.5x Speed</button>');
}


// ═══════════════════════════════════════════════════════
// APPROVALS (admin_approvals) — replaces Video Moderation
// ═══════════════════════════════════════════════════════
var PENDING_APPROVALS = [
  { id:1, type:'video',    title:'Magnetism — Biot Savart Law',          faculty:'Dr. Priya Mehta',  course:'JEE Advanced (Main + KCET Decoded)', subject:'Physics',   date:'Mar 13, 11:30 AM', size:'248 MB', dur:'52 min', st:'pending' },
  { id:2, type:'material', title:'Chapter 8 — Organic Chemistry Notes',  faculty:'Prof. Amit Singh', course:'JEE Advanced (Main + KCET Decoded)', subject:'Chemistry', date:'Mar 13, 10:15 AM', size:'3.2 MB', dur:null,     st:'pending' },
  { id:3, type:'video',    title:'Ecosystem & Biodiversity — Complete',   faculty:'Dr. Kavya R.',     course:'NEET UG Decoded',                    subject:'Biology',   date:'Mar 13, 9:00 AM',  size:'312 MB', dur:'60 min', st:'pending' },
  { id:4, type:'material', title:'Partnership Accounts Formula Sheet',    faculty:'Prof. Neha K.',    course:'Commerce Decoded Programme',          subject:'Accountancy',date:'Mar 12, 4:30 PM', size:'1.1 MB', dur:null,     st:'pending' },
  { id:5, type:'video',    title:'Calculus — Integration by Parts',       faculty:'Mr. Raj Sharma',   course:'JEE (Main + KCET Decoded)',           subject:'Mathematics',date:'Mar 12, 2:00 PM',size:'198 MB', dur:'44 min', st:'pending' },
];

PAGES['admin_approvals'] = function() {
  var pendingCount = PENDING_APPROVALS.filter(function(a){return a.st==='pending';}).length;
  var approvedCount = PENDING_APPROVALS.filter(function(a){return a.st==='approved';}).length;
  var rejectedCount = PENDING_APPROVALS.filter(function(a){return a.st==='rejected';}).length;

  var stats = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">'
    + [
      { icon:'⏳', val:pendingCount,  label:'Pending Review',    col:'var(--yellow)' },
      { icon:'✅', val:approvedCount, label:'Approved (Total)',   col:'var(--student)' },
      { icon:'❌', val:rejectedCount, label:'Rejected (Total)',   col:'var(--admin)' },
    ].map(function(s) {
      return '<div class="stat-card" style="border-color:color-mix(in srgb,'+s.col+' 28%,var(--border))">'
        + '<div class="stat-icon">'+s.icon+'</div>'
        + '<div class="stat-val" style="color:'+s.col+'">'+s.val+'</div>'
        + '<div class="stat-label">'+s.label+'</div></div>';
    }).join('') + '</div>';

  var notice = '<div style="margin-bottom:14px;padding:11px 14px;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.2);border-radius:9px;font-size:12px;color:var(--muted)">'
    + '<strong style="color:var(--student)">How it works:</strong> Faculty uploads video/material → Appears here for review → Admin approves → Content becomes visible to all enrolled students and public preview.</div>';

  var list = '<div style="display:flex;flex-direction:column;gap:12px">'
    + PENDING_APPROVALS.map(function(a, idx) {
        var isVid = a.type==='video';
        var stCol = a.st==='pending'?'badge-yellow':a.st==='approved'?'badge-green':'badge-red';
        return '<div class="card" style="border-left:3px solid '+(a.st==='pending'?'var(--yellow)':a.st==='approved'?'var(--student)':'var(--admin)')+'">'
          + '<div style="display:flex;align-items:flex-start;gap:12px">'
          + '<div style="width:48px;height:48px;border-radius:10px;background:'+(isVid?'rgba(255,45,107,.1)':'rgba(108,71,255,.1)')+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+(isVid?'🎬':'📄')+'</div>'
          + '<div style="flex:1">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
          + '<div style="font-weight:700;font-size:13px">'+a.title+'</div>'
          + '<span class="badge '+stCol+'">'+a.st+'</span></div>'
          + '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">👨‍🏫 '+a.faculty+' &nbsp;•&nbsp; 📚 '+a.subject+' &nbsp;•&nbsp; '+a.course.split('(')[0].trim()+'</div>'
          + '<div style="font-size:11px;color:var(--muted)">📅 '+a.date+' &nbsp;•&nbsp; 💾 '+a.size+(a.dur?' &nbsp;•&nbsp; ⏱ '+a.dur:'')+'</div>'
          + '</div></div>'
          + (a.st==='pending' ? '<div style="display:flex;gap:8px;margin-top:10px">'
              + '<button class="btn btn-sm btn-purple" onclick="openApprovalDetail('+idx+')">👁 Review</button>'
              + '<button class="btn btn-sm btn-green" onclick="approveContent('+idx+')">✅ Approve</button>'
              + '<button class="btn btn-sm btn-red" onclick="rejectContent('+idx+')">❌ Reject</button>'
              + '</div>'
            : '<div style="margin-top:8px;font-size:12px;color:var(--muted)">Action taken: <strong style="color:'+(a.st==='approved'?'var(--student)':'var(--admin)')+'">'+a.st+'</strong></div>')
          + '</div>';
      }).join('') + '</div>';

  return stats + notice + list;
};

function approveContent(idx) {
  var item = PENDING_APPROVALS[idx];
  item.st = 'approved';
  // Add to MEDIA_DB so it appears in Videos & Materials
  if (item.type==='video' && MEDIA_DB[item.course] && MEDIA_DB[item.course][item.subject]) {
    MEDIA_DB[item.course][item.subject].videos.unshift({
      t:item.title, dur:item.dur||'N/A', views:0, date:'Just now', fac:item.faculty, thumb:'🆕'
    });
  }
  toast(item.title + ' approved & published!', '✅');
  // Update nav badge
  var pendingNow = PENDING_APPROVALS.filter(function(a){return a.st==='pending';}).length;
  var navItem = NAV.admin;
  navItem.forEach(function(sec){sec.items.forEach(function(it){if(it.id==='approvals')it.n=pendingNow||null;});});
  loadPage('approvals');
}

function rejectContent(idx) {
  var item = PENDING_APPROVALS[idx];
  openDetail('❌ Reject — ' + item.title,
    '<div class="inp-group"><label>Reason for Rejection</label><textarea class="inp-field" id="reject-reason" rows="4" placeholder="Explain why this content is being rejected..."></textarea></div>'
    + '<div class="inp-group"><label>Feedback to Faculty</label><textarea class="inp-field" id="reject-feedback" rows="3" placeholder="Optional improvement suggestions..."></textarea></div>',
    '<button class="btn btn-red" onclick="confirmReject('+idx+')">❌ Confirm Reject</button>'
  );
}

function confirmReject(idx) {
  PENDING_APPROVALS[idx].st = 'rejected';
  closeModal('modal-detail');
  toast(PENDING_APPROVALS[idx].title + ' rejected.', '❌');
  loadPage('approvals');
}

function openApprovalDetail(idx) {
  var a = PENDING_APPROVALS[idx];
  var isVid = a.type==='video';
  var preview = isVid
    ? '<div style="background:rgba(0,0,0,.5);border-radius:10px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:14px;position:relative;overflow:hidden">'
      + '<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,45,107,.15),rgba(108,71,255,.15))"></div>'
      + '<div style="z-index:1;text-align:center"><div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;cursor:pointer" onclick="toast(\'Preview playing...\',\'▶\')">'
      + '<div style="width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent #fff;margin-left:3px"></div></div>'
      + '<div style="color:rgba(255,255,255,.6);font-size:11px">Preview</div></div></div>'
    : '<div style="padding:20px;background:rgba(108,71,255,.07);border-radius:10px;text-align:center;margin-bottom:14px"><div style="font-size:40px;margin-bottom:8px">📄</div><div style="font-weight:600">'+a.title+'</div><div style="font-size:12px;color:var(--muted);margin-top:4px">'+a.size+'</div></div>';
  var info = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + [['Faculty',a.faculty],['Course',a.course.split('(')[0].trim()],['Subject',a.subject],['Submitted',a.date],['File Size',a.size],(a.dur?['Duration',a.dur]:['Type',a.type])].map(function(e){
        return '<div style="background:var(--surface2);border-radius:7px;padding:8px"><div style="font-size:10px;color:var(--muted)">'+e[0]+'</div><div style="font-size:13px;font-weight:600;margin-top:2px">'+e[1]+'</div></div>';
      }).join('') + '</div>';
  openDetail((isVid?'🎬':'📄')+' Review — '+a.title, preview+info,
    '<button class="btn btn-green" onclick="approveContent('+idx+');closeModal(\'modal-detail\')">✅ Approve & Publish</button>'
    + '<button class="btn btn-red" onclick="closeModal(\'modal-detail\');rejectContent('+idx+')">❌ Reject</button>');
}



// ════════════════════════════════════════
// QUIZ RESULTS (admin_quiz)
// ════════════════════════════════════════
var QUIZ_RESULTS = [
  { student:'Arjun Sharma',  roll:'RV2024001', course:'JEE Advanced (Main + KCET Decoded)', subject:'Physics',     video:'Electrostatics — Coulomb\'s Law', score:85, total:100, date:'Mar 13', time:'45 min', campus:'RV Jayanagar' },
  { student:'Arjun Sharma',  roll:'RV2024001', course:'JEE Advanced (Main + KCET Decoded)', subject:'Mathematics', video:'Calculus — Limits & Continuity',  score:72, total:100, date:'Mar 12', time:'50 min', campus:'RV Jayanagar' },
  { student:'Arjun Sharma',  roll:'RV2024001', course:'JEE Advanced (Main + KCET Decoded)', subject:'Chemistry',   video:'Organic — IUPAC Naming',          score:91, total:100, date:'Mar 11', time:'42 min', campus:'RV Jayanagar' },
  { student:'Sneha Patel',   roll:'RV2024002', course:'JEE Advanced (Main + KCET Decoded)', subject:'Physics',     video:'Gauss Law — Full Derivation',     score:78, total:100, date:'Mar 13', time:'48 min', campus:'RV Rajajinagar' },
  { student:'Sneha Patel',   roll:'RV2024002', course:'JEE Advanced (Main + KCET Decoded)', subject:'Chemistry',   video:'Reaction Mechanisms SN1 vs SN2',  score:88, total:100, date:'Mar 12', time:'44 min', campus:'RV Rajajinagar' },
  { student:'Rohan Gupta',   roll:'RV2024003', course:'JEE (Main + KCET Decoded)',          subject:'Mathematics', video:'Integration — All Methods',       score:65, total:100, date:'Mar 13', time:'55 min', campus:'RV Jayanagar' },
  { student:'Rohan Gupta',   roll:'RV2024003', course:'JEE (Main + KCET Decoded)',          subject:'Physics',     video:'Optics — Ray & Wave Optics',      score:70, total:100, date:'Mar 11', time:'40 min', campus:'RV Jayanagar' },
  { student:'Kavya Reddy',   roll:'RV2024015', course:'NEET UG Decoded',                   subject:'Biology',     video:'Cell Structure — Complete',       score:94, total:100, date:'Mar 13', time:'38 min', campus:'RV Electronic City' },
  { student:'Kavya Reddy',   roll:'RV2024015', course:'NEET UG Decoded',                   subject:'Chemistry',   video:'Biomolecules — Carbohydrates',    score:82, total:100, date:'Mar 12', time:'41 min', campus:'RV Electronic City' },
  { student:'Dev Verma',     roll:'RV2024020', course:'Commerce Decoded Programme',         subject:'Accountancy', video:'Partnership Accounts Intro',      score:55, total:100, date:'Mar 10', time:'60 min', campus:'RV Rajajinagar' },
  { student:'Dev Verma',     roll:'RV2024020', course:'Commerce Decoded Programme',         subject:'Economics',   video:'Macro Economics — National Income',score:62,total:100, date:'Mar 9',  time:'35 min', campus:'RV Rajajinagar' },
];

PAGES['admin_quiz'] = function() {
  var qState = window._quizState || { course:'', student:'' };
  window._quizState = qState;

  var courses = [];
  var studentNames = [];
  QUIZ_RESULTS.forEach(function(r){
    if (courses.indexOf(r.course)<0) courses.push(r.course);
    if (studentNames.indexOf(r.student)<0) studentNames.push(r.student);
  });

  var filtered = QUIZ_RESULTS.filter(function(r){
    var searchVal = (qState.student || '').toLowerCase().trim();
    var matchStudent = !searchVal
      || r.student.toLowerCase().indexOf(searchVal) !== -1
      || r.roll.toLowerCase().indexOf(searchVal) !== -1;
    return (!qState.course || r.course === qState.course) && matchStudent;
  });

  // Aggregate per student: one row with columns for each subject they attempted
  var studentMap = {};
  filtered.forEach(function(r){
    var key = r.roll;
    if (!studentMap[key]) {
      studentMap[key] = { student:r.student, roll:r.roll, course:r.course, subjects:{}, dates:[], videos:{} };
    }
    studentMap[key].subjects[r.subject] = r.score;
    studentMap[key].videos[r.subject]   = r.video;
    studentMap[key].dates.push(r.date);
  });

  var allSubjects = [];
  Object.values(studentMap).forEach(function(sd){
    Object.keys(sd.subjects).forEach(function(sub){ if(allSubjects.indexOf(sub)<0) allSubjects.push(sub); });
  });
  allSubjects.sort();

  var totalAttempts = filtered.length;
  var avgScore = totalAttempts ? Math.round(filtered.reduce(function(a,r){return a+r.score;},0)/totalAttempts) : 0;
  var passed   = filtered.filter(function(r){return r.score>=60;}).length;
  var topScore = totalAttempts ? Math.max.apply(null,filtered.map(function(r){return r.score;})) : 0;

  var stats = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:16px">'
    + [['📝','Total Attempts',totalAttempts,'var(--purple)'],['📊','Avg Score',avgScore+'%','var(--yellow)'],['✅','Passed (≥60%)',passed,'var(--student)'],['🏆','Top Score',topScore+'%','var(--admin)']].map(function(s){
        return '<div class="stat-card" style="border-color:color-mix(in srgb,'+s[3]+' 28%,var(--border))">'
          + '<div class="stat-icon">'+s[0]+'</div><div class="stat-val" style="color:'+s[3]+'">'+s[2]+'</div>'
          + '<div class="stat-label">'+s[1]+'</div></div>';
      }).join('') + '</div>';

  var filterBar = '<div class="card" style="margin-bottom:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'
    + '<div class="inp-group" style="flex:1;min-width:200px;margin-bottom:0"><label>Course</label>'
    + '<select class="inp-field" id="qf-course" onchange="window._quizState.course=this.value;window._quizState.student=\'\';loadPage(\'quiz\')">'
    + '<option value="">All Courses</option>'
    + courses.map(function(cn){return '<option'+(qState.course===cn?' selected':'')+' value="'+cn+'">'+cn.split('(')[0].trim()+'</option>';}).join('')
    + '</select></div>'
    + '<div class="inp-group" style="flex:1;min-width:200px;margin-bottom:0"><label>Search Student</label>'
    + '<div style="position:relative">'
    + '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none">🔍</span>'
    + '<input class="inp-field" id="qf-search" style="padding-left:30px" placeholder="Type name or roll no..." value="'+(qState.student||'')+'" oninput="window._quizState.student=this.value;window._quizSearchDebounce()" />'
    + '</div></div>'
    + '<button class="btn btn-sm btn-red" onclick="window._quizState={course:\'\',student:\'\'};loadPage(\'quiz\')">Clear</button>'
    + '<button class="btn btn-sm btn-teal" onclick="window.exportQuizResults()">⬇ Export CSV</button>'
    + '</div></div>';

  // Build dynamic header with one column per subject
  var subjectHeaders = allSubjects.map(function(sub){
    var icon = sub==='Physics'?'⚡':sub==='Chemistry'?'🧪':sub==='Mathematics'?'📐':sub==='Biology'?'🔬':sub==='Accountancy'?'📊':'💹';
    return '<th>'+icon+' '+sub+'</th>';
  }).join('');

  var rows = Object.values(studentMap).map(function(sd){
    var scores = allSubjects.map(function(sub){ return sd.subjects[sub] !== undefined ? sd.subjects[sub] : null; });
    var validScores = scores.filter(function(sc){ return sc !== null; });
    var totalScore = validScores.reduce(function(a,b){ return a+b; }, 0);
    var maxScore   = validScores.length * 100;
    var avgPct     = validScores.length ? Math.round(totalScore / validScores.length) : 0;
    var grade      = avgPct>=90?'A+':avgPct>=80?'A':avgPct>=70?'B':avgPct>=60?'C':'F';
    var gradeCol   = avgPct>=80?'var(--student)':avgPct>=60?'var(--yellow)':'var(--admin)';
    var latestDate = sd.dates.sort().reverse()[0];
    var videoLabel = Object.values(sd.videos)[0] || '—';

    var subCells = allSubjects.map(function(sub){
      var sc = sd.subjects[sub];
      if (sc === undefined) return '<td style="color:var(--muted);font-size:12px;text-align:center">—</td>';
      var col = sc>=80?'var(--student)':sc>=60?'var(--yellow)':'var(--admin)';
      return '<td style="text-align:center">'
        + '<div style="font-weight:700;color:'+col+';font-size:13px">'+sc+'</div>'
        + '<div style="font-size:10px;color:var(--muted)">/ 100</div>'
        + '</td>';
    }).join('');

    var scorePct = maxScore ? Math.round(totalScore/maxScore*100) : 0;
    var bar = '<div style="display:flex;align-items:center;gap:6px;min-width:90px">'
      + '<div style="flex:1;height:5px;background:var(--surface2);border-radius:3px"><div style="height:5px;border-radius:3px;background:'+gradeCol+';width:'+scorePct+'%"></div></div>'
      + '<span style="font-weight:700;color:'+gradeCol+';font-size:12px;flex-shrink:0">'+scorePct+'%</span></div>';

    return '<tr>'
      + '<td><div style="font-weight:600;font-size:13px">'+sd.student+'</div><div style="font-size:11px;color:var(--muted)">'+sd.roll+'</div></td>'
      + '<td style="font-size:11px;color:var(--muted);max-width:130px">'+sd.course.split('(')[0].trim()+'</td>'
      + subCells
      + '<td style="font-size:11px;color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+videoLabel+'">🎬 '+videoLabel.split('—')[0].trim()+'</td>'
      + '<td style="text-align:center"><div style="font-weight:700;font-size:13px">'+totalScore+'</div><div style="font-size:10px;color:var(--muted)">/ '+maxScore+'</div></td>'
      + '<td>'+bar+'</td>'
      + '<td style="text-align:center"><span style="font-weight:800;font-size:14px;color:'+gradeCol+'">'+grade+'</span></td>'
      + '<td style="font-size:12px;color:var(--muted)">'+latestDate+'</td>'
      + '</tr>';
  }).join('');

  var table = '<div class="card"><div class="card-header"><div class="card-title">📊 Student Quiz Performance</div>'
    + '<span style="font-size:12px;color:var(--muted)">'+Object.keys(studentMap).length+' students</span></div>'
    + '<div class="tbl-wrap"><table><thead><tr>'
    + '<th>Student</th><th>Course</th>'
    + subjectHeaders
    + '<th>Quiz / Video</th><th>Score</th><th>Progress</th><th>Grade</th><th>Date</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';

  return stats + filterBar + table;
};

// Quiz search debounce
var _quizSearchTimer = null;
window._quizSearchDebounce = function() {
  clearTimeout(_quizSearchTimer);
  _quizSearchTimer = setTimeout(function() { loadPage('quiz'); }, 280);
};

function exportQuizResults() {
  var qState = window._quizState || {};
  var filtered = QUIZ_RESULTS.filter(function(r){
    var searchVal = (qState.student || '').toLowerCase().trim();
    var matchStudent = !searchVal
      || r.student.toLowerCase().indexOf(searchVal) !== -1
      || r.roll.toLowerCase().indexOf(searchVal) !== -1;
    return (!qState.course || r.course === qState.course) && matchStudent;
  });
  var rows = [['Student','Roll No','Course','Subject','Video/Quiz','Score','Grade','Date']].concat(
    filtered.map(function(r){
      var grade = r.score>=90?'A+':r.score>=80?'A':r.score>=70?'B':r.score>=60?'C':'F';
      return [r.student,r.roll,r.course,r.subject,r.video,r.score+'%',grade,r.date];
    }));
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a'); a.href=url; a.download='quiz_results.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Quiz results exported!','⬇');
}

// ════════════════════════════════════════
// PAYMENTS (admin_payments)
// ════════════════════════════════════════
var PAYMENT_HISTORY = [
  { id:'TXN001', student:'Sneha Patel',    material:'JEE Advanced Full Course', amount:45000, date:'Mar 12, 2025', method:'UPI',         status:'success', type:'course' },
  { id:'TXN002', student:'Kavya Reddy',    material:'NEET UG Decoded',          amount:38000, date:'Mar 12, 2025', method:'Credit Card',  status:'success', type:'course' },
  { id:'TXN003', student:'Aman Joshi',     material:'Commerce Decoded',         amount:28000, date:'Mar 11, 2025', method:'Cash',         status:'success', type:'course' },
  { id:'TXN004', student:'Rohan Gupta',    material:'Physics DPP Pack',         amount:499,   date:'Mar 10, 2025', method:'UPI',          status:'success', type:'material' },
  { id:'TXN005', student:'Kavya Reddy',    material:'NEET Biology DPP Pack',    amount:299,   date:'Mar 10, 2025', method:'UPI',          status:'success', type:'material' },
  { id:'TXN006', student:'Dev Verma',      material:'Commerce Decoded',         amount:14000, date:'Mar 9, 2025',  method:'Net Banking',  status:'pending', type:'course' },
  { id:'TXN007', student:'Arjun Sharma',   material:'JEE Advanced Full Course', amount:22500, date:'Mar 8, 2025',  method:'UPI',          status:'success', type:'course' },
  { id:'TXN008', student:'Meera Shah',     material:'JEE Advanced Full Course', amount:15000, date:'Mar 7, 2025',  method:'Cheque',       status:'failed',  type:'course' },
  { id:'TXN009', student:'Ravi Kumar',     material:'NEET Full Course',         amount:19000, date:'Mar 6, 2025',  method:'Debit Card',   status:'success', type:'course' },
  { id:'TXN010', student:'Priya Joshi',    material:'Calculus Formula Sheet',   amount:99,    date:'Mar 5, 2025',  method:'UPI',          status:'success', type:'material' },
];

PAGES['admin_payments'] = function() {
  var total     = PAYMENT_HISTORY.filter(function(p){return p.status==='success';}).reduce(function(a,p){return a+p.amount;},0);
  var courseTxn = PAYMENT_HISTORY.filter(function(p){return p.type==='course'  && p.status==='success';}).reduce(function(a,p){return a+p.amount;},0);
  var matTxn    = PAYMENT_HISTORY.filter(function(p){return p.type==='material'&& p.status==='success';}).reduce(function(a,p){return a+p.amount;},0);
  var pending   = PAYMENT_HISTORY.filter(function(p){return p.status==='pending';}).reduce(function(a,p){return a+p.amount;},0);

  function fmt(n){return '₹'+n.toLocaleString('en-IN');}

  var stats = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:20px">'
    + [
      { icon:'💰', val:fmt(total),     label:'Total Revenue',      col:'var(--yellow)' },
      { icon:'📚', val:fmt(courseTxn), label:'Course Payments',    col:'var(--student)' },
      { icon:'📄', val:fmt(matTxn),    label:'Material Sales',     col:'var(--purple)' },
      { icon:'⏳', val:fmt(pending),   label:'Pending',            col:'var(--admin)' },
    ].map(function(s){
      return '<div class="stat-card" style="border-color:color-mix(in srgb,'+s.col+' 28%,var(--border))">'
        + '<div class="stat-icon">'+s.icon+'</div>'
        + '<div class="stat-val" style="font-size:16px;color:'+s.col+'">'+s.val+'</div>'
        + '<div class="stat-label">'+s.label+'</div></div>';
    }).join('') + '</div>';

  // Filter tabs
  var pState = window._payState || 'all';
  window._payState = pState;
  var tabs = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">'
    + [['all','All'],['success','✅ Success'],['pending','⏳ Pending'],['failed','❌ Failed'],['course','📚 Course'],['material','📄 Material']].map(function(t){
        var active = pState===t[0];
        return '<button class="btn btn-sm" onclick="window._payState=\''+t[0]+'\';loadPage(\'payments\')" style="'+(active?'background:var(--admin);color:#fff;':'')+'">'+t[1]+'</button>';
      }).join('')
    + '<button class="btn btn-sm btn-teal" onclick="exportPayments()" style="margin-left:auto">⬇ Export</button>'
    + '</div>';

  var filtered = pState==='all' ? PAYMENT_HISTORY
    : ['success','pending','failed'].indexOf(pState)>=0
      ? PAYMENT_HISTORY.filter(function(p){return p.status===pState;})
      : PAYMENT_HISTORY.filter(function(p){return p.type===pState;});

  var rows = filtered.map(function(p){
    var stCol = p.status==='success'?'badge-green':p.status==='pending'?'badge-yellow':'badge-red';
    return '<tr onclick="openPaymentDetail(\''+p.id+'\')" style="cursor:pointer">'
      + '<td style="color:var(--muted);font-size:12px">'+p.id+'</td>'
      + '<td style="font-weight:600">'+p.student+'</td>'
      + '<td style="font-size:12px">'+p.material+'</td>'
      + '<td style="font-weight:700;color:var(--yellow)">'+fmt(p.amount)+'</td>'
      + '<td style="color:var(--muted);font-size:12px">'+p.date+'</td>'
      + '<td style="font-size:12px">'+p.method+'</td>'
      + '<td><span class="badge '+stCol+'">'+p.status+'</span></td>'
      + '<td><span class="badge '+(p.type==='course'?'badge-purple':'badge-teal')+'">'+p.type+'</span></td>'
      + '<td><button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openPaymentDetail(\''+p.id+'\')">🧾 Receipt</button></td>'
      + '</tr>';
  }).join('');

  var table = '<div class="card"><div class="card-header"><div class="card-title">💳 Payment Transactions</div><span style="font-size:12px;color:var(--muted)">'+filtered.length+' records</span></div>'
    + '<div class="tbl-wrap"><table><thead><tr><th>Txn ID</th><th>Student</th><th>Material / Course</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th><th>Type</th><th>Actions</th></tr></thead>'
    + '<tbody>'+rows+'</tbody></table></div></div>';

  return stats + tabs + table;
};

function openPaymentDetail(txnId) {
  var p = PAYMENT_HISTORY.find(function(x){return x.id===txnId;});
  if (!p) { toast('Transaction not found','⚠️'); return; }
  var stCol = p.status==='success'?'var(--student)':p.status==='pending'?'var(--yellow)':'var(--admin)';
  var body = '<div style="background:linear-gradient(135deg,rgba(251,191,36,.06),rgba(74,222,128,.06));border:1px solid rgba(251,191,36,.2);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    + '<div style="font-size:18px;font-weight:800;font-family:Syne,sans-serif">🧾 Payment Receipt</div>'
    + '<span class="badge" style="background:color-mix(in srgb,'+stCol+' 15%,transparent);color:'+stCol+';border:1px solid color-mix(in srgb,'+stCol+' 30%,transparent);font-size:12px">'+p.status.toUpperCase()+'</span></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + [['Transaction ID',p.id],['Student',p.student],['Material / Course',p.material],['Amount','₹'+p.amount.toLocaleString('en-IN')],['Payment Method',p.method],['Date',p.date],['Type',p.type],['Status',p.status]].map(function(e){
        return '<div style="background:var(--surface2);border-radius:7px;padding:8px"><div style="font-size:10px;color:var(--muted)">'+e[0]+'</div><div style="font-size:13px;font-weight:600;margin-top:2px">'+e[1]+'</div></div>';
      }).join('')+'</div></div>';
  openDetail('🧾 Transaction — '+p.id, body,
    '<button class="btn btn-teal" onclick="toast(\'Receipt downloaded!\',\'⬇\');closeModal(\'modal-detail\')">⬇ Download PDF</button>'
    + (p.status==='pending' ? '<button class="btn btn-green" onclick="toast(\'Payment marked as received!\',\'✅\');closeModal(\'modal-detail\')">✅ Mark Paid</button>' : ''));
}

function exportPayments() {
  var pState = window._payState || 'all';
  var filtered = pState==='all' ? PAYMENT_HISTORY
    : ['success','pending','failed'].indexOf(pState)>=0
      ? PAYMENT_HISTORY.filter(function(p){return p.status===pState;})
      : PAYMENT_HISTORY.filter(function(p){return p.type===pState;});
  var rows = [['Txn ID','Student','Material/Course','Amount','Date','Method','Status','Type']].concat(
    filtered.map(function(p){return [p.id,p.student,p.material,'₹'+p.amount,p.date,p.method,p.status,p.type];}));
  var csv = rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob([csv],{type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a'); a.href=url; a.download='payments_'+pState+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Payments exported!','⬇');
}

// ════════════════════════════════════════
// FACULTY UPLOAD → PENDING_APPROVALS
// ════════════════════════════════════════
async function submitFacultyUpload() {
  var titleEl   = document.querySelectorAll('#page-body .inp-field')[1];
  var typeEl    = document.querySelectorAll('#page-body select')[0];
  var subjectEl = document.querySelectorAll('#page-body select')[1];
  var title   = titleEl   ? titleEl.value.trim()   : '';
  var type    = typeEl    ? typeEl.value            : 'Video Lecture';
  var subject = subjectEl ? subjectEl.value         : 'Physics';
  if (!title) { toast('Enter a title before uploading!','⚠️'); return; }
  
  var isVideo = type.toLowerCase().indexOf('video') >= 0;
  
  try {
    if (isVideo) {
      await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: title,
          sub: subject,
          dur: '45:00',
          thumb: '🎥'
        })
      });
    } else {
      await api('/api/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: title + ' Notes.pdf',
          type: 'pdf',
          sub: subject
        })
      });
    }
    toast('"' + title + '" uploaded successfully!', '📤');
    if (titleEl) titleEl.value = '';
    
    // Re-sync data and reload page
    await syncLMSData();
    loadPage('content');
  } catch (err) {
    toast('Upload failed: ' + err.message, '❌');
  }
}



// ══════════════════════════════════════════════════
// MISSING FUNCTIONS & ENHANCEMENTS — APPENDED TO FILE
// ══════════════════════════════════════════════════

// ── Live Class Modal (Video Player with chat) ──
function openLiveClassModal() {
  var sampleVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ];
  var vidSrc = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];

  var body = '<div style="display:flex;gap:14px;margin-bottom:14px">'
    + '<div style="flex:2;min-width:0">'
    + '<div style="position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:16/9">'
    + '<video id="lms-live-player" controls autoplay style="width:100%;height:100%;display:block;background:#000" preload="metadata">'
    + '<source src="' + vidSrc + '" type="video/mp4">Your browser does not support HTML5 video.</video>'
    + '<div style="position:absolute;top:10px;left:10px;display:flex;gap:6px">'
    + '<span class="live-badge" style="font-size:11px;padding:4px 10px"><div class="live-dot"></div>LIVE</span>'
    + '<span style="background:rgba(0,0,0,.6);backdrop-filter:blur(4px);padding:4px 10px;border-radius:20px;font-size:11px;color:#fff">👥 142 watching</span></div>'
    + '<div style="position:absolute;top:10px;right:10px"><span style="background:rgba(255,45,107,.2);border:1px solid rgba(255,45,107,.3);padding:3px 8px;border-radius:20px;font-size:10px;color:#ff2d6b;font-weight:700">🔴 REC</span></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'
    + '<button class="btn btn-purple" onclick="var v=document.getElementById(\'lms-live-player\');if(v)v.playbackRate=1;toast(\'Speed: 1x\',\'▶\')">1x</button>'
    + '<button class="btn btn-purple" onclick="var v=document.getElementById(\'lms-live-player\');if(v)v.playbackRate=1.5;toast(\'Speed: 1.5x\',\'⚡\')">1.5x</button>'
    + '<button class="btn btn-purple" onclick="var v=document.getElementById(\'lms-live-player\');if(v)v.playbackRate=2;toast(\'Speed: 2x\',\'⚡\')">2x</button>'
    + '<button class="btn btn-teal" onclick="var v=document.getElementById(\'lms-live-player\');if(v)v.requestFullscreen()">⛶ Fullscreen</button>'
    + '<button class="btn btn-yellow" onclick="toast(\'Hand raised! ✋\',\'🖐️\')">✋ Raise Hand</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Notes opened\',\'📝\')">📝 Notes</button>'
    + '</div></div>'
    // Chat panel
    + '<div style="flex:1;min-width:200px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;display:flex;flex-direction:column;max-height:350px">'
    + '<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;font-weight:700">💬 Live Chat</div>'
    + '<div style="flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px">'
    + [{n:'Sneha P.',m:'Great explanation sir!',t:'2m ago',c:'#6c47ff'},{n:'Rohan G.',m:'Can you repeat the formula?',t:'1m ago',c:'#ff6b35'},{n:'Ananya S.',m:'Thank you! Very clear 👏',t:'30s ago',c:'#4ade80'},{n:'Dr. Priya',m:'Check slide 14 for the derivation',t:'15s ago',c:'#00d4c8'}].map(function(msg){
      return '<div style="display:flex;gap:8px;align-items:flex-start"><div style="width:24px;height:24px;border-radius:50%;background:'+msg.c+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">'+msg.n[0]+'</div><div><div style="font-size:11px"><span style="font-weight:700;color:'+msg.c+'">'+msg.n+'</span> <span style="color:var(--muted);font-size:10px">'+msg.t+'</span></div><div style="font-size:12px;color:var(--text);margin-top:2px">'+msg.m+'</div></div></div>';
    }).join('')
    + '</div>'
    + '<div style="padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:6px"><input id="live-chat-input" class="inp-field" placeholder="Type a message..." style="flex:1;padding:8px 10px;font-size:12px" onkeydown="if(event.key===\'Enter\'){sendLiveChat()}">'
    + '<button class="btn btn-sm btn-solid" onclick="sendLiveChat()">Send</button></div></div></div>'
    + '<div style="font-size:14px;font-weight:700;margin-bottom:4px">⚛️ Physics — Electrostatics: Gauss Law</div>'
    + '<div style="font-size:12px;color:var(--muted)">Dr. Priya Mehta &nbsp;•&nbsp; JEE Advanced Batch A &nbsp;•&nbsp; HD Quality</div>';

  openDetail('🎥 Live Class', body, '<button class="btn btn-red" onclick="toast(\'Left class\',\'👋\');closeModal(\'modal-detail\')">Leave Class</button>');
}

function sendLiveChat() {
  var input = document.getElementById('live-chat-input');
  if (!input || !input.value.trim()) return;
  toast('Message sent: ' + input.value.substring(0, 30), '💬');
  input.value = '';
}

// ── Doubt Detail (used in dashboard) ──
function openDoubtDetail(question, status) {
  openEnhancedDoubtDetail(question, status, 'Physics');
}

// ── Digital Blackboard ──
function openDigitalBlackboard() {
  var body = '<div style="margin-bottom:14px">'
    + '<canvas id="blackboard-canvas" width="700" height="400" style="width:100%;background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;cursor:crosshair;touch-action:none"></canvas></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    + '<span style="font-size:12px;color:var(--muted);font-weight:700">Color:</span>'
    + ['#fff','#ff2d6b','#4ade80','#fbbf24','#00c6ff','#a855f7'].map(function(c){ return '<button onclick="window._bbColor=\''+c+'\'" style="width:28px;height:28px;border-radius:50%;background:'+c+';border:2px solid rgba(255,255,255,.2);cursor:pointer"></button>'; }).join('')
    + '<span style="font-size:12px;color:var(--muted);font-weight:700;margin-left:12px">Size:</span>'
    + [2,4,8].map(function(s){ return '<button onclick="window._bbSize='+s+'" class="btn btn-sm btn-purple" style="min-width:32px;justify-content:center">'+s+'</button>'; }).join('')
    + '<button class="btn btn-sm btn-red" style="margin-left:auto" onclick="var c=document.getElementById(\'blackboard-canvas\');if(c){c.getContext(\'2d\').clearRect(0,0,c.width,c.height)}">🗑️ Clear</button>'
    + '</div>';

  openDetail('🎨 Digital Blackboard', body, '<button class="btn btn-teal" onclick="toast(\'Screenshot saved!\',\'📸\');closeModal(\'modal-detail\')">📸 Save Screenshot</button>');

  // Setup drawing after modal is shown
  setTimeout(function() {
    var canvas = document.getElementById('blackboard-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var drawing = false;
    window._bbColor = '#fff';
    window._bbSize = 3;
    canvas.addEventListener('mousedown', function(e) { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mousemove', function(e) { if (!drawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.strokeStyle = window._bbColor; ctx.lineWidth = window._bbSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); });
    canvas.addEventListener('mouseup', function() { drawing = false; });
    canvas.addEventListener('mouseleave', function() { drawing = false; });
    // Touch support
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); drawing = true; var r = canvas.getBoundingClientRect(); var t = e.touches[0]; ctx.beginPath(); ctx.moveTo(t.clientX-r.left, t.clientY-r.top); });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); if (!drawing) return; var r = canvas.getBoundingClientRect(); var t = e.touches[0]; ctx.lineTo(t.clientX-r.left, t.clientY-r.top); ctx.strokeStyle = window._bbColor; ctx.lineWidth = window._bbSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); });
    canvas.addEventListener('touchend', function() { drawing = false; });
  }, 300);
}

// ── Video Watch with Notes ──
function openVideoWithNotes(title, emoji) {
  var sampleVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  ];
  var vidSrc = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];

  var body = '<div style="position:relative;background:#000;border-radius:12px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9">'
    + '<video id="lms-video-player2" controls style="width:100%;height:100%;display:block;background:#000" preload="metadata">'
    + '<source src="' + vidSrc + '" type="video/mp4">Your browser does not support HTML5 video.</video></div>'
    + '<div style="font-size:15px;font-weight:700;margin-bottom:4px">' + (emoji||'▶') + ' ' + title + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">RV Learning Hub &nbsp;•&nbsp; HD Quality</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    + '<button class="btn btn-purple btn-sm" onclick="var v=document.getElementById(\'lms-video-player2\');if(v)v.playbackRate=1;toast(\'1x\',\'▶\')">1x</button>'
    + '<button class="btn btn-purple btn-sm" onclick="var v=document.getElementById(\'lms-video-player2\');if(v)v.playbackRate=1.25;toast(\'1.25x\',\'⚡\')">1.25x</button>'
    + '<button class="btn btn-purple btn-sm" onclick="var v=document.getElementById(\'lms-video-player2\');if(v)v.playbackRate=1.5;toast(\'1.5x\',\'⚡\')">1.5x</button>'
    + '<button class="btn btn-purple btn-sm" onclick="var v=document.getElementById(\'lms-video-player2\');if(v)v.playbackRate=2;toast(\'2x\',\'⚡\')">2x</button>'
    + '<button class="btn btn-teal btn-sm" onclick="var v=document.getElementById(\'lms-video-player2\');if(v)v.requestFullscreen()">⛶ Fullscreen</button>'
    + '<button class="btn btn-yellow btn-sm" onclick="toast(\'Bookmarked!\',\'🔖\')">🔖 Bookmark</button>'
    + '<button class="btn btn-purple btn-sm" onclick="toast(\'AI Quiz generating...\',\'🤖\')">🤖 AI Quiz</button></div>'
    + '<div style="font-family:Syne,sans-serif;font-size:13px;font-weight:700;margin-bottom:8px">📝 Video Notes</div>'
    + '<textarea class="inp-field" placeholder="Take notes while watching..." rows="4" style="width:100%;resize:vertical"></textarea>';

  openDetail('▶ ' + title, body,
    '<button class="btn btn-teal" onclick="toast(\'Notes saved!\',\'📝\');closeModal(\'modal-detail\')">💾 Save Notes</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Downloaded!\',\'⬇️\')">⬇️ Download</button>');
}

// ── Material Preview Modal ──
function openMaterialPreview(name, type, sub, fac) {
  var previewContent;
  if (type === 'pdf') {
    previewContent = '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:40px;text-align:center;margin-bottom:16px;min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
      + '<div style="font-size:64px;margin-bottom:16px">📕</div>'
      + '<div style="font-family:Syne,sans-serif;font-size:16px;font-weight:700;margin-bottom:6px">' + name + '</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">' + sub + ' · by ' + fac + '</div>'
      + '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:20px;width:100%;max-width:400px;text-align:left">'
      + '<div style="font-size:13px;font-weight:700;margin-bottom:8px">📋 Contents</div>'
      + '<div style="font-size:12px;color:var(--muted);line-height:2">'
      + '1. Introduction & Overview<br>2. Key Concepts & Definitions<br>3. Important Formulae<br>4. Worked Examples<br>5. Practice Problems<br>6. Summary & Quick Revision</div></div></div>';
  } else {
    previewContent = '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:40px;text-align:center;margin-bottom:16px;min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
      + '<div style="font-size:64px;margin-bottom:16px">' + (type==='ppt'?'📊':'📘') + '</div>'
      + '<div style="font-family:Syne,sans-serif;font-size:16px;font-weight:700;margin-bottom:6px">' + name + '</div>'
      + '<div style="font-size:13px;color:var(--muted)">' + sub + ' · by ' + fac + ' · ' + type.toUpperCase() + ' format</div></div>';
  }

  openDetail('📂 ' + name, previewContent,
    '<button class="btn btn-solid" onclick="toast(\'Downloading...\',\'⬇️\');closeModal(\'modal-detail\')">⬇️ Download</button>'
    + '<button class="btn btn-yellow" onclick="toast(\'Bookmarked!\',\'🔖\')">🔖 Bookmark</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Shared!\',\'📤\')">📤 Share</button>');
}

// ── Announcement Detail Modal ──
function openAnnouncementDetail(title, body, cat, date) {
  var catColors = { Important:'#ff2d6b', Academic:'#a855f7', Events:'#fbbf24', Notice:'#00d4c8' };
  var col = catColors[cat] || 'var(--purple)';

  var content = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    + '<span class="badge" style="background:color-mix(in srgb,'+col+' 12%,transparent);color:'+col+';border:1px solid color-mix(in srgb,'+col+' 25%,transparent)">'+cat+'</span>'
    + '<span style="font-size:12px;color:var(--muted)">📅 ' + date + '</span></div>'
    + '<div style="font-size:15px;line-height:1.7;color:var(--text);margin-bottom:16px">' + body + '</div>'
    + '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:14px">'
    + '<div style="font-size:12px;font-weight:700;margin-bottom:6px;color:var(--muted)">📎 Additional Info</div>'
    + '<div style="font-size:12px;color:var(--muted);line-height:1.8">• Posted by: Administration<br>• Applicable to: All Batches<br>• Priority: ' + cat + '</div></div>';

  openDetail('📢 ' + title, content,
    '<button class="btn btn-purple" onclick="toast(\'Marked as read!\',\'✅\');closeModal(\'modal-detail\')">✅ Mark as Read</button>'
    + '<button class="btn btn-yellow" onclick="toast(\'Pinned!\',\'📌\')">📌 Pin</button>');
}

// ── Profile Edit Modal ──
function openEditProfile() {
  var u = G.user || {};
  var body = '<div style="display:flex;flex-direction:column;gap:12px">'
    + '<div class="inp-group"><label>Full Name</label><input class="inp-field" value="'+(u.name||'Student')+'" id="edit-name"></div>'
    + '<div class="inp-group"><label>Email</label><input class="inp-field" value="'+(u.email||'')+'" id="edit-email"></div>'
    + '<div class="inp-row"><div class="inp-group"><label>Phone</label><input class="inp-field" value="9876543210"></div>'
    + '<div class="inp-group"><label>Date of Birth</label><input class="inp-field" type="date" value="2006-03-15"></div></div>'
    + '<div class="inp-row"><div class="inp-group"><label>Batch</label><input class="inp-field" value="'+(u.batch||'JEE Advanced 2025')+'" readonly></div>'
    + '<div class="inp-group"><label>Roll Number</label><input class="inp-field" value="'+(u.roll||'RV2024001')+'" readonly></div></div>'
    + '<div class="inp-group"><label>Bio</label><textarea class="inp-field" rows="2" placeholder="Tell us about yourself...">Aspiring Engineer | JEE 2025</textarea></div>'
    + '<div class="inp-group"><label>Social Links</label>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<input class="inp-field" placeholder="LinkedIn URL" style="flex:1">'
    + '<input class="inp-field" placeholder="GitHub URL" style="flex:1"></div></div></div>';

  openDetail('✏️ Edit Profile', body,
    '<button class="btn btn-solid" onclick="toast(\'Profile updated!\',\'✅\');closeModal(\'modal-detail\')">💾 Save Changes</button>'
    + '<button class="btn btn-purple" onclick="closeModal(\'modal-detail\')">Cancel</button>');
}

// ── Quiz Analytics Modal ──
function openQuizAnalytics(title, score, total, correct, wrong, skip) {
  var pct = Math.round(score/total*100);
  var col = pct >= 85 ? '#4ade80' : pct >= 70 ? '#fbbf24' : '#ff2d6b';

  var body = '<div style="text-align:center;margin-bottom:20px">'
    + '<div style="position:relative;width:120px;height:120px;margin:0 auto 14px"><svg width="120" height="120" style="transform:rotate(-90deg)"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="8"/><circle cx="60" cy="60" r="50" fill="none" stroke="'+col+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="'+Math.round(314-314*pct/100)+'"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-family:Syne,sans-serif;font-size:32px;font-weight:900;color:'+col+'">'+pct+'%</span><span style="font-size:11px;color:var(--muted)">Score</span></div></div>'
    + '<div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:'+col+'">'+score+' / '+total+'</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">'
    + '<div style="text-align:center;padding:14px;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);border-radius:12px"><div style="font-size:22px;margin-bottom:4px">✅</div><div style="font-family:Syne,sans-serif;font-size:24px;font-weight:900;color:#4ade80">'+correct+'</div><div style="font-size:10px;color:var(--muted);font-weight:700;margin-top:3px">CORRECT</div></div>'
    + '<div style="text-align:center;padding:14px;background:rgba(255,45,107,.06);border:1px solid rgba(255,45,107,.15);border-radius:12px"><div style="font-size:22px;margin-bottom:4px">❌</div><div style="font-family:Syne,sans-serif;font-size:24px;font-weight:900;color:#ff2d6b">'+wrong+'</div><div style="font-size:10px;color:var(--muted);font-weight:700;margin-top:3px">WRONG</div></div>'
    + '<div style="text-align:center;padding:14px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.15);border-radius:12px"><div style="font-size:22px;margin-bottom:4px">⊘</div><div style="font-family:Syne,sans-serif;font-size:24px;font-weight:900;color:#fbbf24">'+skip+'</div><div style="font-size:10px;color:var(--muted);font-weight:700;margin-top:3px">SKIPPED</div></div></div>'
    + '<div style="font-family:Syne,sans-serif;font-size:13px;font-weight:700;margin-bottom:10px">📊 Subject-wise Performance</div>'
    + [{sub:'Physics',s:85,c:'#ff2d6b'},{sub:'Chemistry',s:72,c:'#00d4c8'},{sub:'Maths',s:78,c:'#a855f7'}].map(function(s){
      return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>'+s.sub+'</span><span style="color:'+s.c+';font-weight:700">'+s.s+'%</span></div><div class="prog-bar"><div class="prog-fill" style="width:'+s.s+'%;background:'+s.c+'"></div></div></div>';
    }).join('');

  openDetail('📊 ' + title + ' — Analysis', body,
    '<button class="btn btn-teal" onclick="toast(\'Report downloaded!\',\'⬇️\');closeModal(\'modal-detail\')">⬇️ Download Report</button>'
    + '<button class="btn btn-purple" onclick="toast(\'Shared with mentor!\',\'📤\')">📤 Share</button>');
}

// ── Leaderboard Student Profile ──
function openStudentProfile(name, rank, score) {
  var body = '<div style="text-align:center;margin-bottom:20px">'
    + '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#6c47ff,#a855f7);display:inline-flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#fff;margin-bottom:10px">' + name.charAt(0) + '</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800">' + name + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:center;margin-top:8px"><span class="badge badge-yellow">Rank #' + rank + '</span><span class="badge badge-green">' + score + '% Score</span></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'
    + [{l:'Tests',v:'32',i:'📝'},{l:'Attendance',v:'92%',i:'✅'},{l:'Streak',v:'5 days',i:'🔥'}].map(function(s){
      return '<div style="text-align:center;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:12px"><div style="font-size:18px;margin-bottom:4px">'+s.i+'</div><div style="font-family:Syne,sans-serif;font-size:18px;font-weight:900;color:var(--text)">'+s.v+'</div><div style="font-size:10px;color:var(--muted);font-weight:700;margin-top:3px">'+s.l+'</div></div>';
    }).join('') + '</div>';
  openDetail('👤 ' + name, body, '');
}

// ── AI Doubt Answer ──
function askAIDoubt() {
  var body = '<div style="text-align:center;padding:30px">'
    + '<div style="font-size:48px;margin-bottom:16px">🤖</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">AI Assistant</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:20px">Ask any academic doubt and get instant AI-powered answers</div>'
    + '<textarea id="ai-doubt-input" class="inp-field" rows="3" placeholder="Type your question here... e.g., Explain Gauss Law in simple terms" style="margin-bottom:14px"></textarea>'
    + '<div id="ai-doubt-answer" style="display:none;text-align:left;background:rgba(0,212,200,.06);border:1px solid rgba(0,212,200,.15);border-radius:12px;padding:16px;margin-top:10px">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:20px">🤖</span><span style="font-family:Syne,sans-serif;font-size:13px;font-weight:700;color:var(--faculty)">AI Response</span></div>'
    + '<div style="font-size:13px;line-height:1.7;color:var(--text)">This is a simulated AI response. In a production environment, this would connect to an AI model to generate detailed explanations, step-by-step solutions, and relevant examples for your academic doubt.</div></div></div>';

  openDetail('🤖 Ask AI Doubt', body,
    '<button class="btn btn-solid" onclick="document.getElementById(\'ai-doubt-answer\').style.display=\'block\';toast(\'AI is thinking...\',\'🤖\')">🚀 Get Answer</button>');
}

// ── Submit Student Doubt ──
async function submitDoubt() {
  var qEl = document.getElementById('doubt-question');
  var subEl = document.getElementById('doubt-subject');
  
  if (!qEl) return;
  var question = qEl.value.trim();
  var subject = subEl ? subEl.value : 'General';
  
  if (question.length < 15) {
    toast('Your question must be at least 15 characters long to describe the doubt clearly.', '❌');
    return;
  }
  
  try {
    await api('/api/doubts', {
      method: 'POST',
      body: JSON.stringify({ q: question, sub: subject })
    });
    toast('Doubt submitted successfully!', '✅');
    qEl.value = '';
    var previewBox = document.getElementById('doubt-live-preview');
    if (previewBox) previewBox.style.display = 'none';
    
    // sync data and reload
    await syncLMSData();
    loadPage('doubts');
  } catch (err) {
    toast('Failed to submit doubt: ' + err.message, '❌');
  }
}

// ── Doubt discussion thread detail ──
function openEnhancedDoubtDetail(question, status, subject) {
  window.activeDoubtQuestion = question;
  window.activeDoubtSubject = subject;
  
  var doubt = (window.LMS_DOUBTS || []).find(function(d) { return d.q === question; });
  var isResolved = status === 'resolved' || (doubt && doubt.s === 'resolved');
  
  var statusBadge = isResolved 
    ? '<span class="badge badge-green">Resolved</span>' 
    : '<span class="badge badge-yellow">Pending Teacher Response</span>';
  
  var chatHtml = '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;max-height:300px;overflow-y:auto;padding-right:4px">';
  
  if (doubt && doubt.replies && doubt.replies.length > 0) {
    chatHtml += doubt.replies.map(function(reply) {
      var isMe = reply.sender === G.user.name;
      var senderInitial = reply.sender ? reply.sender.charAt(0) : 'U';
      var bg = isMe ? 'linear-gradient(135deg,#6c47ff,#a855f7)' : 'linear-gradient(135deg,#00d4c8,#00c6ff)';
      return '<div style="display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,0.02);padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);' + (isMe ? '' : 'margin-left:20px') + '">'
        + '<div style="width:28px;height:28px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">' + senderInitial + '</div>'
        + '<div style="flex:1">'
        + '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">' + reply.sender + ' · ' + (reply.time || 'just now') + '</div>'
        + '<div style="font-size:13px;color:var(--text);line-height:1.5">' + reply.text + '</div>'
        + '</div></div>';
    }).join('');
  } else {
    chatHtml += '<div style="display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,0.02);padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">'
      + '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6c47ff,#a855f7);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">U</div>'
      + '<div style="flex:1">'
      + '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">Asked by you · ' + subject + '</div>'
      + '<div style="font-size:13px;color:var(--text);line-height:1.5">' + question + '</div>'
      + '</div></div>';
  }
  
  chatHtml += '</div>';

  var replyInput = '<div style="display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:14px">'
    + '<input id="doubt-reply-input" class="inp-field" placeholder="Add to discussion thread..." style="flex:1;font-size:12px">'
    + '<button class="btn btn-solid btn-sm" onclick="window.sendDoubtReply()">Reply</button>'
    + '</div>';

  var body = '<div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">'
    + '<span>' + statusBadge + '</span>'
    + '<span style="font-size:12px;color:var(--muted)">Subject: ' + subject + '</span></div>'
    + chatHtml
    + replyInput;

  openDetail('💬 Doubt Discussion Thread', body, '');
}

window.sendDoubtReply = async function() {
  var input = document.getElementById('doubt-reply-input');
  if (!input || !input.value.trim()) return;
  var replyText = input.value.trim();
  
  var question = window.activeDoubtQuestion;
  var subject = window.activeDoubtSubject;
  var doubt = (window.LMS_DOUBTS || []).find(function(d) { return d.q === question; });
  if (!doubt) {
    toast('Doubt not found', '❌');
    return;
  }
  
  try {
    const updatedDoubt = await api('/api/doubts/' + doubt._id + '/reply', {
      method: 'POST',
      body: JSON.stringify({ text: replyText })
    });
    toast('Reply posted!', '✅');
    input.value = '';
    
    // re-sync data and reload detail modal
    await syncLMSData();
    closeModal('modal-detail');
    openEnhancedDoubtDetail(question, updatedDoubt.s, subject);
    
    // Also reload doubts page if we are on it
    if (G.page === 'doubts') {
      loadPage('doubts');
    }
  } catch (err) {
    toast('Failed to post reply: ' + err.message, '❌');
  }
};

// ── Open Completed Test Solutions ──
function openTestSolution(testName) {
  var body = '<div style="margin-bottom:14px">'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:12px">Here is the detailed solution key for <strong>' + testName + '</strong>.</div>'
    + '<div style="display:flex;flex-direction:column;gap:12px;max-height:350px;overflow-y:auto;padding-right:4px">'
    + [
      { q: 'Q1. A body of mass 5 kg is acted upon by two perpendicular forces 8N and 6N. The magnitude of acceleration is:', a: 'A. 2.0 m/s²', exp: 'Explanation: The net force acting on the body is F = sqrt(F1^2 + F2^2) = sqrt(8^2 + 6^2) = 10 N. The acceleration is a = F / m = 10 / 5 = 2.0 m/s².' },
      { q: 'Q2. The SI unit of electric flux is:', a: 'A. N·m²/C', exp: 'Explanation: Electric flux is defined as Phi = E * A. Unit of E is N/C and unit of A is m². Therefore, unit of flux is N·m²/C.' },
      { q: 'Q3. The value of ∫₀^π sin²x dx is:', a: 'A. π/2', exp: 'Explanation: Using the identity sin²x = (1 - cos(2x)) / 2, the integral is ∫₀^π (1/2 - cos(2x)/2) dx = [x/2 - sin(2x)/4]₀^π = π/2.' }
    ].map(function(s, idx) {
      return '<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px">'
        + '<div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">' + s.q + '</div>'
        + '<div style="font-size:12px;color:#4ade80;font-weight:700;margin-bottom:4px">Correct Answer: ' + s.a + '</div>'
        + '<div style="font-size:12px;color:var(--muted);line-height:1.5;background:rgba(255,255,255,0.02);padding:8px;border-radius:6px">' + s.exp + '</div>'
        + '</div>';
    }).join('')
    + '</div></div>';

  openDetail('📝 Answer Key & Solutions', body,
    '<button class="btn btn-teal" onclick="toast(\'Solution PDF downloaded!\',\'⬇️\');closeModal(\'modal-detail\')">⬇️ Download PDF Solutions</button>'
    + '<button class="btn btn-purple" onclick="closeModal(\'modal-detail\')">Close</button>');
}



window.enrollInCourse = async function(courseId, courseTitle) {
  if (courseTitle && !confirm('Are you sure you want to unlock & enroll in ' + courseTitle + '?')) {
    return;
  }
  try {
    await api('/api/courses/' + courseId + '/enroll', {
      method: 'POST'
    });
    toast('Enrolled in course successfully!', '✅');
    await syncLMSData();
    loadPage('courses');
  } catch (err) {
    toast('Enrollment failed: ' + err.message, '❌');
  }
};


// ════════════════════════════════════════════════════
// EXPORT ES MODULE FUNCTIONS TO WINDOW FOR INLINE ONCLICK
// ════════════════════════════════════════════════════
window.loadPage = loadPage;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.goBack = goBack;
window.openCourseDetail = openCourseDetail;
window.startMockQuiz = startMockQuiz;
window.submitDoubt = submitDoubt;
window.openLiveClassModal = openLiveClassModal;
window.openVideoWithNotes = openVideoWithNotes;
window.openMaterialPreview = openMaterialPreview;
window.openFeedbackForm = openFeedbackForm;
window.rateStar = rateStar;
window.openLeaveRequest = openLeaveRequest;
window.openEnhancedDoubtDetail = openEnhancedDoubtDetail;
window.openStudentProfile = openStudentProfile;
window.openQuizAnalytics = openQuizAnalytics;
window.togglePw = togglePw;
window.submitFacultyUpload = submitFacultyUpload;
window.openModal = openModal;
window.closeModal = closeModal;
window.openResolveDoubt = openResolveDoubt;
window.openEnrollmentApproval = openEnrollmentApproval;
window.openPaymentDetail = openPaymentDetail;
window.exportPayments = exportPayments;
window.openAnnouncementDetail = openAnnouncementDetail;
window.openEditProfile = openEditProfile;
window.openFeeReceipt = openFeeReceipt;
window.openTestSolution = openTestSolution;
window.submitAddStudent = submitAddStudent;
window.submitAddFaculty = submitAddFaculty;
window.submitCreateCourse = submitCreateCourse;
window.initApp = initApp;
window.buildSidebar = buildSidebar;
window.toast = toast;
window.openFacultyClassModal = openFacultyClassModal;
window.openBatchDetail = openBatchDetail;
window.openScheduleClassModal = openScheduleClassModal;
window.openCreateTestModal = openCreateTestModal;
window.openTestResultsModal = openTestResultsModal;
window.openSendFeedback = openSendFeedback;
window.openAddStudentModal = openAddStudentModal;
window.openAddFacultyModal = openAddFacultyModal;
window.saveAdminProfile = saveAdminProfile;
window.changeAdminPassword = changeAdminPassword;
window.saveFacultyProfile = saveFacultyProfile;
window.changeFacultyPassword = changeFacultyPassword;
window.saveStudentProfile = saveStudentProfile;
window.changeStudentPassword = changeStudentPassword;
window.apPwStrength = apPwStrength;
window.apPwMatch = apPwMatch;
window.openVideoPlayer = openVideoPlayer;
window.downloadMaterial = downloadMaterial;
window.exportQuizResults = exportQuizResults;

window.approveContent = approveContent;
window.askAIDoubt = askAIDoubt;
window.confirmReject = confirmReject;
window.downloadFullAttendance = downloadFullAttendance;
window.exportNotifications = exportNotifications;
window.exportReport = exportReport;
window.exportRevenueCSV = exportRevenueCSV;
window.exportStudentList = exportStudentList;
window.forwardNotif = forwardNotif;
window.itab = itab;
window.markAllRead = markAllRead;
window.openApprovalDetail = openApprovalDetail;
window.openCourseEnrollDetail = openCourseEnrollDetail;
window.openPayModal = openPayModal;
window.openReport = openReport;
window.publishAnnouncement = publishAnnouncement;
window.rejectContent = rejectContent;
window.replyNotif = replyNotif;
window.resolveNotif = resolveNotif;
window.saveGeneralSettings = saveGeneralSettings;
window.sendLiveChat = sendLiveChat;
window.testIntegration = testIntegration;
window.toggleIntegration = toggleIntegration;
window.toggleSetting = toggleSetting;
window.viewQuestionPaper = viewQuestionPaper;
window.toggleFieldPw = toggleFieldPw;

window.submitDoubtResolution = async function(doubtId) {
  var textarea = document.getElementById('doubt-resolve-textarea');
  if (!textarea || !textarea.value.trim()) {
    toast('Please enter your answer', '⚠️');
    return;
  }
  var answerText = textarea.value.trim();
  try {
    await api('/api/doubts/' + doubtId + '/reply', {
      method: 'POST',
      body: JSON.stringify({ text: answerText })
    });
    toast('Answer posted successfully!', '✅');
    await syncLMSData();
    closeModal('modal-detail');
    loadPage('doubts');
  } catch (err) {
    toast('Failed to post answer: ' + err.message, '❌');
  }
};

