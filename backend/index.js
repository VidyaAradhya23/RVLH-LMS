const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lms_key_123';

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════
// IN-MEMORY DATA STORE (replaces MongoDB)
// ═══════════════════════════════════════════════════
let nextId = 1;
const genId = () => String(nextId++);

const users = [];
const courses = [];
const videos = [];
const liveClasses = [];
const doubts = [];
const materials = [];
const announcements = [];
const fees = [];
const attendance = [];
const leaderboard = [];
const quizResults = [];
const payments = [];

// Seed Data helper
async function seedData() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('student123', salt);
  const facHash = await bcrypt.hash('faculty123', salt);
  const admHash = await bcrypt.hash('admin123', salt);

  // 1. Seed Users
  const studentSeeds = [
    { name: 'Arjun Sharma', email: 'arjun@rvhub.com', phone: '9876543210', batch: 'JEE Advanced (Main + KCET Decoded)', roll: 'RV2024001', streak: 7, avgScore: 85, feeStatus: 'Paid', feeAmount: 45000, feePaid: 22500, feePending: 22500, feeDueDate: 'Mar 31', feeMethod: '—', feeDate: '—', campus: 'RV Jayanagar', gender: 'Male' },
    { name: 'Sneha Patel', email: 'sneha.patel@student.rvhub.com', phone: '9800100002', batch: 'JEE Advanced (Main + KCET Decoded)', roll: 'RV2024002', streak: 1, avgScore: 88, feeStatus: 'Paid', feeAmount: 45000, feePaid: 45000, feePending: 0, feeDueDate: 'Mar 1', feeMethod: 'UPI', feeDate: 'Mar 12', campus: 'RV Rajajinagar', gender: 'Female' },
    { name: 'Rohan Gupta', email: 'rohan.gupta@student.rvhub.com', phone: '9800100003', batch: 'JEE (Main + KCET Decoded)', roll: 'RV2024003', streak: 2, avgScore: 68, feeStatus: 'Due', feeAmount: 30000, feePaid: 15000, feePending: 15000, feeDueDate: 'Mar 20', feeMethod: '—', feeDate: '—', campus: 'RV Jayanagar', gender: 'Male' },
    { name: 'Kavya Reddy', email: 'kavya.reddy@student.rvhub.com', phone: '9800100015', batch: 'NEET UG Decoded', roll: 'RV2024015', streak: 5, avgScore: 88, feeStatus: 'Paid', feeAmount: 38000, feePaid: 38000, feePending: 0, feeDueDate: 'Mar 1', feeMethod: 'Card', feeDate: 'Mar 12', campus: 'RV Electronic City', gender: 'Female' },
    { name: 'Dev Verma', email: 'dev.verma@student.rvhub.com', phone: '9800100020', batch: 'Commerce Decoded Programme', roll: 'RV2024020', streak: 0, avgScore: 58, feeStatus: 'Overdue', feeAmount: 28000, feePaid: 0, feePending: 28000, feeDueDate: 'Mar 1', feeMethod: '—', feeDate: '—', campus: 'RV Rajajinagar', gender: 'Male' },
    { name: 'Ravi Kumar', email: 'ravi.kumar@student.rvhub.com', phone: '9800100012', batch: 'NEET UG Decoded', roll: 'RV2024012', streak: 3, avgScore: 70, feeStatus: 'Overdue', feeAmount: 38000, feePaid: 19000, feePending: 19000, feeDueDate: 'Mar 15', feeMethod: '—', feeDate: '—', campus: 'RV Electronic City', gender: 'Male' },
    { name: 'Meera Shah', email: 'meera.shah@student.rvhub.com', phone: '9800100008', batch: 'JEE Advanced (Main + KCET Decoded)', roll: 'RV2024008', streak: 4, avgScore: 78, feeStatus: 'Overdue', feeAmount: 45000, feePaid: 30000, feePending: 15000, feeDueDate: 'Mar 10', feeMethod: '—', feeDate: '—', campus: 'RV Rajajinagar', gender: 'Female' },
    { name: 'Aman Joshi', email: 'aman.joshi@student.rvhub.com', phone: '9800100010', batch: 'Commerce Decoded Programme', roll: 'RV2024010', streak: 1, avgScore: 75, feeStatus: 'Paid', feeAmount: 28000, feePaid: 28000, feePending: 0, feeDueDate: 'Mar 1', feeMethod: 'Cash', feeDate: 'Mar 11', campus: 'RV Jayanagar', gender: 'Male' }
  ];

  const facultySeeds = [
    { name: 'Dr. Priya Mehta', email: 'priya@rvhub.com', phone: '9876543211', subject: 'Physics', emp: 'RVF001', campus: 'RV Jayanagar', batch: 'JEE Advanced (Main + KCET Decoded)' },
    { name: 'Prof. Amit Singh', email: 'amit.singh@rvhub.com', phone: '9876543213', subject: 'Chemistry', emp: 'RVF002', campus: 'RV Rajajinagar', batch: 'JEE (Main + KCET Decoded)' },
    { name: 'Mr. Raj Sharma', email: 'raj.sharma@rvhub.com', phone: '9876543214', subject: 'Mathematics', emp: 'RVF003', campus: 'RV Electronic City', batch: 'JEE Advanced (Main + KCET Decoded)' },
    { name: 'Dr. Kavya R.', email: 'kavya.r@rvhub.com', phone: '9876543215', subject: 'Biology', emp: 'RVF004', campus: 'RV Jayanagar', batch: 'NEET UG Decoded' },
    { name: 'Prof. Neha K.', email: 'neha.k@rvhub.com', phone: '9876543216', subject: 'Accountancy', emp: 'RVF005', campus: 'RV Rajajinagar', batch: 'Commerce Decoded Programme' }
  ];

  users.push({
    _id: '3',
    name: 'Rahul Verma',
    email: 'admin@rvhub.com',
    phone: '9876543212',
    password: admHash,
    role: 'admin',
    ava: 'A',
    dept: 'Administration',
    emp: 'ADM-001',
    designation: 'System Administrator',
    campus: 'RV Learning Hub HQ',
    st: 'active'
  });

  studentSeeds.forEach((s, i) => {
    users.push({
      _id: 's' + (i + 1),
      name: s.name,
      email: s.email,
      phone: s.phone,
      password: hash,
      role: 'student',
      ava: s.name.charAt(0),
      batch: s.batch,
      roll: s.roll,
      streak: s.streak,
      avgScore: s.avgScore,
      feeStatus: s.feeStatus,
      feeAmount: s.feeAmount,
      feePaid: s.feePaid,
      feePending: s.feePending,
      feeDueDate: s.feeDueDate,
      feeMethod: s.feeMethod,
      feeDate: s.feeDate,
      campus: s.campus,
      gender: s.gender,
      st: 'active'
    });
  });

  facultySeeds.forEach((f, i) => {
    users.push({
      _id: 'f' + (i + 1),
      name: f.name,
      email: f.email,
      phone: f.phone,
      password: facHash,
      role: 'faculty',
      ava: f.name.charAt(0),
      subject: f.subject,
      emp: f.emp,
      campus: f.campus,
      batch: f.batch,
      st: 'active'
    });
  });

  // 2. Seed Courses
  const courseSeeds = [
    { title: 'JEE Advanced (Main + KCET Decoded)', e: '⚛️', cat: 'JEE', dur: '2 Years', fee: 45000, maxSt: 150, enrolledCount: 142, enrolled: false, pub: true, col: '#ff2d6b', fac: 'Dr. Priya Mehta', desc: 'Comprehensive 2-year program covering full JEE Advanced + Mains syllabus with KCET integration.', subjects: ['Physics', 'Chemistry', 'Mathematics'], curriculum: 'Chapter-wise DPPs, weekly tests, mock series, dedicated doubt sessions.' },
    { title: 'JEE (Main + KCET Decoded)', e: '⚛️', cat: 'JEE', dur: '1 Year', fee: 30000, maxSt: 150, enrolledCount: 98, enrolled: false, pub: true, col: '#6c47ff', fac: 'Prof. Amit Singh', desc: 'Focused 1-year JEE Mains preparation with KCET decoded strategy.', subjects: ['Physics', 'Chemistry', 'Mathematics'], curriculum: 'Subject-wise modules, weekly mocks, previous year papers.' },
    { title: 'NEET UG Decoded', e: '🔬', cat: 'NEET', dur: '1 Year', fee: 38000, maxSt: 120, enrolledCount: 72, enrolled: false, pub: true, col: '#4ade80', fac: 'Dr. Kavya R.', desc: 'Complete NEET UG preparation covering Biology, Physics & Chemistry.', subjects: ['Biology', 'Physics', 'Chemistry'], curriculum: 'NCERT-based modules, MCQ practice, full mock tests.' },
    { title: 'Commerce Decoded Programme', e: '💼', cat: 'Commerce', dur: '1 Year', fee: 28000, maxSt: 100, enrolledCount: 56, enrolled: false, pub: true, col: '#fbbf24', fac: 'Prof. Neha K.', desc: 'XI & XII Commerce covering Accountancy, Economics, Business Studies.', subjects: ['Accountancy', 'Economics', 'Business Studies', 'Mathematics'], curriculum: 'Board + competitive exam focus, case studies.' },
    { title: 'NEET Biology Special', e: '🧬', cat: 'NEET', dur: '6 Months', fee: 12000, maxSt: 80, enrolledCount: 0, enrolled: false, pub: false, col: '#00d4c8', fac: 'Dr. Kavya R.', desc: 'Intensive Biology revision for NEET aspirants.', subjects: ['Biology'], curriculum: 'Topic-wise revision, high-yield MCQs, previous year analysis.' }
  ];

  courseSeeds.forEach(c => {
    courses.push({
      _id: genId(),
      ...c
    });
  });

  // 3. Seed Videos
  const videoSeeds = [
    { title: 'Electrostatics — Coulomb\'s Law & Electric Field', dur: '48 min', views: 1240, date: 'Mar 10', fac: 'Dr. Priya Mehta', thumb: '⚡', sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Gauss Law — Full Derivation with Problems', dur: '55 min', views: 980, date: 'Mar 8', fac: 'Dr. Priya Mehta', thumb: '🔋', sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Capacitors — Energy & Combinations', dur: '42 min', views: 760, date: 'Mar 5', fac: 'Dr. Priya Mehta', thumb: '💡', sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Current Electricity — Ohm\'s Law & Kirchhoff', dur: '50 min', views: 890, date: 'Mar 3', fac: 'Dr. Priya Mehta', thumb: '⚡', sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Organic Chemistry — IUPAC Naming', dur: '44 min', views: 1100, date: 'Mar 9', fac: 'Prof. Amit Singh', thumb: '🧪', sub: 'Chemistry', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Reaction Mechanisms — SN1 vs SN2', dur: '58 min', views: 870, date: 'Mar 7', fac: 'Prof. Amit Singh', thumb: '⚗️', sub: 'Chemistry', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Coordination Compounds — Complete', dur: '60 min', views: 640, date: 'Mar 4', fac: 'Prof. Amit Singh', thumb: '🧬', sub: 'Chemistry', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Calculus — Limits & Continuity', dur: '52 min', views: 1320, date: 'Mar 11', fac: 'Mr. Raj Sharma', thumb: '📐', sub: 'Mathematics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Integration — All Methods Covered', dur: '65 min', views: 1050, date: 'Mar 9', fac: 'Mr. Raj Sharma', thumb: '∫', sub: 'Mathematics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Vectors & 3D Geometry', dur: '48 min', views: 780, date: 'Mar 6', fac: 'Mr. Raj Sharma', thumb: '📊', sub: 'Mathematics', course: 'JEE Advanced (Main + KCET Decoded)' },
    { title: 'Cell Structure — Complete Revision', dur: '55 min', views: 890, date: 'Mar 10', fac: 'Dr. Kavya R.', thumb: '🔬', sub: 'Biology', course: 'NEET UG Decoded' },
    { title: 'Human Physiology — Nervous System', dur: '48 min', views: 720, date: 'Mar 8', fac: 'Dr. Kavya R.', thumb: '🧠', sub: 'Biology', course: 'NEET UG Decoded' },
    { title: 'Plant Kingdom — Classification', dur: '42 min', views: 630, date: 'Mar 5', fac: 'Dr. Kavya R.', thumb: '🌿', sub: 'Biology', course: 'NEET UG Decoded' },
    { title: 'Optics — Ray & Wave Optics', dur: '50 min', views: 560, date: 'Mar 9', fac: 'Prof. Amit Singh', thumb: '🔭', sub: 'Physics', course: 'NEET UG Decoded' },
    { title: 'Modern Physics — Atomic Models', dur: '44 min', views: 480, date: 'Mar 7', fac: 'Prof. Amit Singh', thumb: '⚛️', sub: 'Physics', course: 'NEET UG Decoded' },
    { title: 'Biomolecules — Carbohydrates & Proteins', dur: '46 min', views: 720, date: 'Mar 8', fac: 'Prof. Amit Singh', thumb: '🧬', sub: 'Chemistry', course: 'NEET UG Decoded' },
    { title: 'Electrochemistry for NEET', dur: '40 min', views: 540, date: 'Mar 5', fac: 'Prof. Amit Singh', thumb: '🔋', sub: 'Chemistry', course: 'NEET UG Decoded' },
    { title: 'Partnership Accounts — Introduction', dur: '45 min', views: 420, date: 'Mar 9', fac: 'Prof. Neha K.', thumb: '📊', sub: 'Accountancy', course: 'Commerce Decoded Programme' },
    { title: 'Ratio Analysis — Complete Guide', dur: '38 min', views: 360, date: 'Mar 7', fac: 'Prof. Neha K.', thumb: '📈', sub: 'Accountancy', course: 'Commerce Decoded Programme' },
    { title: 'Macro Economics — National Income', dur: '42 min', views: 380, date: 'Mar 8', fac: 'Prof. Neha K.', thumb: '💹', sub: 'Economics', course: 'Commerce Decoded Programme' },
    { title: 'Micro Economics — Supply & Demand', dur: '35 min', views: 310, date: 'Mar 6', fac: 'Prof. Neha K.', thumb: '📉', sub: 'Economics', course: 'Commerce Decoded Programme' },
    { title: 'Business Finance — Sources of Funds', dur: '40 min', views: 290, date: 'Mar 7', fac: 'Prof. Neha K.', thumb: '💼', sub: 'Business Studies', course: 'Commerce Decoded Programme' }
  ];

  videoSeeds.forEach(v => {
    videos.push({
      _id: genId(),
      ...v
    });
  });

  // 4. Seed Materials
  const materialSeeds = [
    { name: 'Chapter 1 — Electrostatics Notes', type: 'PDF', size: '2.4 MB', date: 'Mar 10', pg: 28, sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Chapter 2 — Current Electricity', type: 'PDF', size: '1.8 MB', date: 'Mar 8', pg: 22, sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'DPP Set 1-5 with Solutions', type: 'PDF', size: '3.2 MB', date: 'Mar 6', pg: 45, sub: 'Physics', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Organic Reactions Quick Sheet', type: 'PDF', size: '1.2 MB', date: 'Mar 9', pg: 12, sub: 'Chemistry', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Inorganic Chemistry Notes', type: 'PDF', size: '2.8 MB', date: 'Mar 5', pg: 35, sub: 'Chemistry', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Calculus Formula Sheet', type: 'PDF', size: '0.8 MB', date: 'Mar 11', pg: 8, sub: 'Mathematics', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Algebra Problem Bank', type: 'PDF', size: '4.1 MB', date: 'Mar 7', pg: 60, sub: 'Mathematics', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Course Materials' },
    { name: 'Biology NCERT Key Points', type: 'PDF', size: '3.6 MB', date: 'Mar 10', pg: 48, sub: 'Biology', course: 'NEET UG Decoded', category: 'Course Materials' },
    { name: 'Previous Year MCQs Biology', type: 'PDF', size: '2.1 MB', date: 'Mar 6', pg: 32, sub: 'Biology', course: 'NEET UG Decoded', category: 'Course Materials' },
    { name: 'Physics Formula Sheet NEET', type: 'PDF', size: '1.4 MB', date: 'Mar 9', pg: 16, sub: 'Physics', course: 'NEET UG Decoded', category: 'Course Materials' },
    { name: 'Chemistry Quick Revision', type: 'PDF', size: '1.9 MB', date: 'Mar 8', pg: 24, sub: 'Chemistry', course: 'NEET UG Decoded', category: 'Course Materials' },
    { name: 'Accountancy Formula Sheet', type: 'PDF', size: '1.1 MB', date: 'Mar 9', pg: 10, sub: 'Accountancy', course: 'Commerce Decoded Programme', category: 'Course Materials' },
    { name: 'Economics Notes XI & XII', type: 'PDF', size: '2.4 MB', date: 'Mar 8', pg: 36, sub: 'Economics', course: 'Commerce Decoded Programme', category: 'Course Materials' },
    { name: 'Business Studies Summary', type: 'PDF', size: '1.5 MB', date: 'Mar 7', pg: 20, sub: 'Business Studies', course: 'Commerce Decoded Programme', category: 'Course Materials' },

    // Question Papers
    { name: 'JEE Advanced 2024 Paper 1 + Solutions', type: 'Question Papers', size: '2.5 MB', date: 'Mar 12, 2025', pg: 18, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2024 },
    { name: 'JEE Advanced 2024 Paper 2 + Solutions', type: 'Question Papers', size: '2.7 MB', date: 'Mar 12, 2025', pg: 20, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2024 },
    { name: 'JEE Mains Jan 2024 All Sets', type: 'Question Papers', size: '5.2 MB', date: 'Mar 12, 2025', pg: 64, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2024 },
    { name: 'JEE Advanced 2023 Paper 1 + Solutions', type: 'Question Papers', size: '2.4 MB', date: 'Mar 10, 2024', pg: 18, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2023 },
    { name: 'JEE Advanced 2023 Paper 2 + Solutions', type: 'Question Papers', size: '2.6 MB', date: 'Mar 10, 2024', pg: 20, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2023 },
    { name: 'KCET 2023 Question Paper', type: 'Question Papers', size: '1.8 MB', date: 'May 20, 2023', pg: 16, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2023 },
    { name: 'JEE Advanced 2022 Complete Papers', type: 'Question Papers', size: '4.8 MB', date: 'Mar 8, 2023', pg: 36, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2022 },
    { name: 'JEE Mains 2022 All Sessions', type: 'Question Papers', size: '8.4 MB', date: 'Mar 8, 2023', pg: 120, sub: 'All', course: 'JEE Advanced (Main + KCET Decoded)', category: 'Question Papers', year: 2022 },
    { name: 'NEET UG 2024 Official Paper + Key', type: 'Question Papers', size: '3.1 MB', date: 'May 5, 2024', pg: 24, sub: 'All', course: 'NEET UG Decoded', category: 'Question Papers', year: 2024 },
    { name: 'NEET UG 2024 Re-exam Paper', type: 'Question Papers', size: '3.0 MB', date: 'Jun 23, 2024', pg: 24, sub: 'All', course: 'NEET UG Decoded', category: 'Question Papers', year: 2024 },
    { name: 'NEET UG 2023 Official Paper + Key', type: 'Question Papers', size: '2.9 MB', date: 'May 7, 2023', pg: 24, sub: 'All', course: 'NEET UG Decoded', category: 'Question Papers', year: 2023 },
    { name: 'NEET UG 2022 Official Paper + Key', type: 'Question Papers', size: '2.8 MB', date: 'May 8, 2022', pg: 24, sub: 'All', course: 'NEET UG Decoded', category: 'Question Papers', year: 2022 },
    { name: 'CBSE Commerce XII 2024 Paper', type: 'Question Papers', size: '1.2 MB', date: 'Mar 15, 2024', pg: 12, sub: 'All', course: 'Commerce Decoded Programme', category: 'Question Papers', year: 2024 },
    { name: 'CBSE Commerce XI 2024 Paper', type: 'Question Papers', size: '1.1 MB', date: 'Mar 12, 2024', pg: 10, sub: 'All', course: 'Commerce Decoded Programme', category: 'Question Papers', year: 2024 },
    { name: 'CBSE Commerce XII 2023 Paper', type: 'Question Papers', size: '1.2 MB', date: 'Mar 14, 2023', pg: 12, sub: 'All', course: 'Commerce Decoded Programme', category: 'Question Papers', year: 2023 }
  ];

  materialSeeds.forEach(m => {
    materials.push({
      _id: genId(),
      ...m
    });
  });

  // 5. Seed Live Classes
  liveClasses.push(
    { _id: genId(), time: 'LIVE', date: 'NOW', sub: 'Physics', topic: 'Electrostatics: Gauss Law', fac: 'Dr. Priya Mehta', online: 142, status: 'ongoing' },
    { _id: genId(), time: '11:00 AM', date: 'Today', sub: 'Chemistry', topic: 'Aldehydes & Ketones', fac: 'Prof. Amit Singh', online: 0, status: 'upcoming' },
    { _id: genId(), time: '02:00 PM', date: 'Today', sub: 'Maths', topic: 'Integration by Parts', fac: 'Mr. Raj Sharma', online: 0, status: 'upcoming' }
  );

  // 6. Seed Doubts
  doubts.push(
    { _id: genId(), q: 'What is Gauss Law for non-uniform fields?', s: 'resolved', t: '2 hours ago', sub: 'Physics', student: 'Arjun Sharma', replies: [
      { sender: 'Arjun Sharma', text: 'What is Gauss Law for non-uniform fields?', time: '2 hours ago' },
      { sender: 'Dr. Priya Mehta', text: 'Here is the detailed solution: to compute the Gauss Law for this field, integrate the flux over the closed spherical shell. The flux equals Q_enclosed divided by epsilon_0. I hope this clarifies your doubt!', time: '1 hour ago' }
    ], ai: true },
    { _id: genId(), q: 'Integration by parts — when to apply?', s: 'pending', t: '5 hours ago', sub: 'Maths', student: 'Arjun Sharma', replies: [
      { sender: 'Arjun Sharma', text: 'Integration by parts — when to apply?', time: '5 hours ago' }
    ], ai: false }
  );

  // 7. Seed Announcements
  announcements.push(
    { _id: genId(), title: 'JEE Advanced Mock Test schedule released', body: 'The mock test series starts on March 25. Attendance is mandatory for all enrolled students.', cat: 'Important', date: 'Today, 10:00 AM', urgent: true, target: 'student' },
    { _id: genId(), title: 'Weekly doubt resolution sessions schedule', body: 'Doubt sessions will happen every Wednesday and Friday from 4 PM to 6 PM online.', cat: 'Academic', date: 'Yesterday', urgent: false, target: 'faculty' }
  );

  // 8. Seed Quiz Results
  const quizSeeds = [
    { student: 'Arjun Sharma', roll: 'RV2024001', course: 'JEE Advanced (Main + KCET Decoded)', subject: 'Physics', video: 'Electrostatics — Coulomb\'s Law', score: 85, total: 100, date: 'Mar 13' },
    { student: 'Arjun Sharma', roll: 'RV2024001', course: 'JEE Advanced (Main + KCET Decoded)', subject: 'Mathematics', video: 'Calculus — Limits & Continuity', score: 72, total: 100, date: 'Mar 12' },
    { student: 'Arjun Sharma', roll: 'RV2024001', course: 'JEE Advanced (Main + KCET Decoded)', subject: 'Chemistry', video: 'Organic — IUPAC Naming', score: 91, total: 100, date: 'Mar 11' },
    { student: 'Sneha Patel', roll: 'RV2024002', course: 'JEE Advanced (Main + KCET Decoded)', subject: 'Physics', video: 'Gauss Law — Full Derivation', score: 78, total: 100, date: 'Mar 13' },
    { student: 'Sneha Patel', roll: 'RV2024002', course: 'JEE Advanced (Main + KCET Decoded)', subject: 'Chemistry', video: 'Reaction Mechanisms SN1 vs SN2', score: 88, total: 100, date: 'Mar 12' },
    { student: 'Rohan Gupta', roll: 'RV2024003', course: 'JEE (Main + KCET Decoded)', subject: 'Mathematics', video: 'Integration — All Methods', score: 65, total: 100, date: 'Mar 13' },
    { student: 'Rohan Gupta', roll: 'RV2024003', course: 'JEE (Main + KCET Decoded)', subject: 'Physics', video: 'Optics — Ray & Wave Optics', score: 70, total: 100, date: 'Mar 11' },
    { student: 'Kavya Reddy', roll: 'RV2024015', course: 'NEET UG Decoded', subject: 'Biology', video: 'Cell Structure — Complete', score: 94, total: 100, date: 'Mar 13' },
    { student: 'Kavya Reddy', roll: 'RV2024015', course: 'NEET UG Decoded', subject: 'Chemistry', video: 'Biomolecules — Carbohydrates', score: 82, total: 100, date: 'Mar 12' },
    { student: 'Dev Verma', roll: 'RV2024020', course: 'Commerce Decoded Programme', subject: 'Accountancy', video: 'Partnership Accounts Intro', score: 55, total: 100, date: 'Mar 10' },
    { student: 'Dev Verma', roll: 'RV2024020', course: 'Commerce Decoded Programme', subject: 'Economics', video: 'Macro Economics — National Income', score: 62, total: 100, date: 'Mar 9' }
  ];

  quizSeeds.forEach(q => {
    quizResults.push({
      _id: genId(),
      ...q
    });
  });

  // 9. Seed Payments
  const paymentSeeds = [
    { id: 'TXN001', student: 'Sneha Patel', material: 'JEE Advanced Full Course', amount: 45000, date: 'Mar 12, 2025', method: 'UPI', status: 'success', type: 'course' },
    { id: 'TXN002', student: 'Kavya Reddy', material: 'NEET UG Decoded', amount: 38000, date: 'Mar 12, 2025', method: 'Credit Card', status: 'success', type: 'course' },
    { id: 'TXN003', student: 'Aman Joshi', material: 'Commerce Decoded', amount: 28000, date: 'Mar 11, 2025', method: 'Cash', status: 'success', type: 'course' },
    { id: 'TXN004', student: 'Rohan Gupta', material: 'Physics DPP Pack', amount: 499, date: 'Mar 10, 2025', method: 'UPI', status: 'success', type: 'material' },
    { id: 'TXN005', student: 'Kavya Reddy', material: 'NEET Biology DPP Pack', amount: 299, date: 'Mar 10, 2025', method: 'UPI', status: 'success', type: 'material' },
    { id: 'TXN006', student: 'Dev Verma', material: 'Commerce Decoded', amount: 14000, date: 'Mar 9, 2025', method: 'Net Banking', status: 'pending', type: 'course' },
    { id: 'TXN007', student: 'Arjun Sharma', material: 'JEE Advanced Full Course', amount: 22500, date: 'Mar 8, 2025', method: 'UPI', status: 'success', type: 'course' },
    { id: 'TXN008', student: 'Meera Shah', material: 'JEE Advanced Full Course', amount: 15000, date: 'Mar 7, 2025', method: 'Cheque', status: 'failed', type: 'course' },
    { id: 'TXN009', student: 'Ravi Kumar', material: 'NEET Full Course', amount: 19000, date: 'Mar 6, 2025', method: 'Debit Card', status: 'success', type: 'course' },
    { id: 'TXN010', student: 'Priya Joshi', material: 'Calculus Formula Sheet', amount: 99, date: 'Mar 5, 2025', method: 'UPI', status: 'success', type: 'material' }
  ];

  paymentSeeds.forEach(p => {
    payments.push({
      _id: genId(),
      ...p
    });
  });

  console.log(`✅ Seeded LMS: ${users.length} users, ${courses.length} courses, ${videos.length} videos, ${materials.length} materials.`);
}

seedData();

// ═══════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = users.find(u => u._id === decoded.id);
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = { ...user };
      delete req.user.password;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// ═══════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let emailOrPhone = email.trim().toLowerCase();
    
    // Support shorthand credentials
    if (emailOrPhone === 'arjun' || emailOrPhone === 'student') {
      emailOrPhone = 'arjun@rvhub.com';
    } else if (emailOrPhone === 'priya' || emailOrPhone === 'faculty') {
      emailOrPhone = 'priya@rvhub.com';
    } else if (emailOrPhone === 'admin') {
      emailOrPhone = 'admin@rvhub.com';
    }

    const user = users.find(u => u.email.toLowerCase() === emailOrPhone || u.phone === emailOrPhone);
    if (!user) {
      return res.status(400).json({ message: 'User does not exist' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    const token = generateToken(user._id);
    const profile = { ...user };
    delete profile.password;
    res.json({ token, user: profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
      _id: genId(),
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || 'student',
      ava: name.charAt(0).toUpperCase()
    };
    
    if (newUser.role === 'student') {
      newUser.batch = req.body.batch || 'JEE Advanced (Main + KCET Decoded)';
      newUser.roll = req.body.roll || ('RV2024' + String(users.length).padStart(3, '0'));
      newUser.streak = req.body.streak || 1;
      newUser.avgScore = req.body.avgScore || 0;
      newUser.campus = req.body.campus || 'RV Jayanagar';
      newUser.gender = req.body.gender || 'Male';
      newUser.feeStatus = req.body.feeStatus || 'Paid';
      newUser.feeAmount = req.body.feeAmount || 45000;
      newUser.feePaid = req.body.feePaid || 0;
      newUser.feePending = req.body.feePending || 45000;
      newUser.feeDueDate = req.body.feeDueDate || 'Mar 31';
      newUser.feeMethod = req.body.feeMethod || '—';
      newUser.feeDate = req.body.feeDate || '—';
      newUser.st = 'active';
    } else if (newUser.role === 'faculty') {
      newUser.subject = req.body.subject || 'Physics';
      newUser.emp = req.body.emp || ('RVF' + String(users.length).padStart(3, '0'));
      newUser.campus = req.body.campus || 'RV Jayanagar';
      newUser.batch = req.body.batch || 'JEE Advanced (Main + KCET Decoded)';
      newUser.st = 'active';
    } else {
      newUser.dept = req.body.dept || 'Administration';
      newUser.emp = req.body.emp || ('RVADM' + String(users.length).padStart(3, '0'));
      newUser.campus = req.body.campus || 'RV Learning Hub HQ';
      newUser.st = 'active';
    }

    users.push(newUser);

    const token = generateToken(newUser._id);
    const profile = { ...newUser };
    delete profile.password;
    res.status(201).json({ token, user: profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/profile', protect, (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/profile', protect, async (req, res) => {
  const user = users.find(u => u._id === req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.email !== undefined) user.email = req.body.email;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.gender !== undefined) user.gender = req.body.gender;
  if (req.body.dob !== undefined) user.dob = req.body.dob;
  if (req.body.designation !== undefined) user.designation = req.body.designation;
  if (req.body.dept !== undefined) user.dept = req.body.dept;
  if (req.body.subject !== undefined) user.subject = req.body.subject;
  if (req.body.campus !== undefined) user.campus = req.body.campus;
  if (req.body.joinDate !== undefined) user.joinDate = req.body.joinDate;
  if (req.body.roll !== undefined) user.roll = req.body.roll;
  if (req.body.batch !== undefined) user.batch = req.body.batch;

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
  }

  const profile = { ...user };
  delete profile.password;
  res.json(profile);
});

app.get('/api/auth/users', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  const profiles = users.map(u => {
    const p = { ...u };
    delete p.password;
    return p;
  });
  res.json(profiles);
});

// ═══════════════════════════════════════════════════
// COURSES API
// ═══════════════════════════════════════════════════
app.get('/api/courses', protect, (req, res) => {
  res.json(courses);
});

app.post('/api/courses', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  const { title, e, desc, fac, total, fee, cat, dur, subjects, curriculum } = req.body;
  const newCourse = {
    _id: genId(),
    e: e || '📚',
    title,
    desc: desc || '',
    videos: req.body.videos || 10,
    materials: req.body.materials || 8,
    quizzes: req.body.quizzes || 5,
    enrolled: false,
    col: 'linear-gradient(90deg,#6c47ff,#a855f7)',
    p: 0,
    done: 0,
    total: total || 150,
    maxSt: total || 150,
    fac: fac || 'Dr. Priya Mehta',
    fee: fee !== undefined ? Number(fee) : 30000,
    cat: cat || 'JEE',
    dur: dur || '1 Year',
    subjects: subjects || ['Physics', 'Chemistry', 'Mathematics'],
    curriculum: curriculum || 'Standard curriculum',
    rating: 5.0,
    reviews: 1,
    pub: true
  };
  courses.push(newCourse);
  res.status(201).json(newCourse);
});

app.post('/api/courses/:id/enroll', protect, (req, res) => {
  const course = courses.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  course.enrolled = true;
  res.json(course);
});

// ═══════════════════════════════════════════════════
// VIDEOS API
// ═══════════════════════════════════════════════════
app.get('/api/videos', protect, (req, res) => {
  res.json(videos);
});

app.post('/api/videos', protect, (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { title, sub, dur, thumb } = req.body;
  const newVideo = {
    _id: genId(),
    thumb: thumb || '🎥',
    title,
    sub,
    batch: req.body.batch || 'General',
    dur: dur || '30:00',
    fac: req.user.name,
    col: '#ff6b35',
    views: 0,
    bookmarked: false,
    trending: false
  };
  videos.push(newVideo);
  res.status(201).json(newVideo);
});

app.put('/api/videos/:id/bookmark', protect, (req, res) => {
  const video = videos.find(v => v._id === req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  video.bookmarked = !video.bookmarked;
  res.json(video);
});

// ═══════════════════════════════════════════════════
// LIVE CLASSES API
// ═══════════════════════════════════════════════════
app.get('/api/live', protect, (req, res) => {
  res.json(liveClasses);
});

app.post('/api/live', protect, (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { topic, sub, time, date } = req.body;
  const newLive = {
    _id: genId(),
    time: time || '12:00 PM',
    date: date || 'Today',
    sub: sub || req.user.subject || 'General',
    topic,
    fac: req.user.name,
    online: 0,
    status: 'upcoming'
  };
  liveClasses.push(newLive);
  res.status(201).json(newLive);
});

// ═══════════════════════════════════════════════════
// DOUBTS API
// ═══════════════════════════════════════════════════
app.get('/api/doubts', protect, (req, res) => {
  res.json(doubts);
});

app.post('/api/doubts', protect, (req, res) => {
  const { q, sub } = req.body;
  const newDoubt = {
    _id: genId(),
    q,
    s: 'pending',
    t: 'Just now',
    sub: sub || 'General',
    student: req.user.name,
    replies: [
      { sender: req.user.name, text: q, time: 'Just now' }
    ],
    ai: false
  };
  doubts.unshift(newDoubt);
  res.status(201).json(newDoubt);
});

app.post('/api/doubts/:id/reply', protect, (req, res) => {
  const doubt = doubts.find(d => d._id === req.params.id);
  if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
  
  const reply = {
    sender: req.user.name,
    text: req.body.text,
    time: 'Just now'
  };
  doubt.replies.push(reply);
  
  if (req.user.role === 'faculty') {
    doubt.s = 'resolved';
  }
  
  res.status(201).json(doubt);
});

app.put('/api/doubts/:id/resolve', protect, (req, res) => {
  const doubt = doubts.find(d => d._id === req.params.id);
  if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
  doubt.s = 'resolved';
  res.json(doubt);
});

// ═══════════════════════════════════════════════════
// MATERIALS API
// ═══════════════════════════════════════════════════
app.get('/api/materials', protect, (req, res) => {
  res.json(materials);
});

app.post('/api/materials', protect, (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { name, type, sub } = req.body;
  const newMat = {
    _id: genId(),
    name,
    type: type || 'pdf',
    sub,
    fac: req.user.name,
    size: '1.5 MB',
    date: 'Just now'
  };
  materials.unshift(newMat);
  res.status(201).json(newMat);
});

// ═══════════════════════════════════════════════════
// ANNOUNCEMENTS API
// ═══════════════════════════════════════════════════
app.get('/api/announcements', protect, (req, res) => {
  res.json(announcements);
});

app.post('/api/announcements', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  const { title, body, cat, urgent, target, draft } = req.body;
  const newAnn = {
    _id: genId(),
    title,
    body,
    cat: cat || 'Notice',
    date: 'Just now',
    urgent: !!urgent,
    target: target || 'all',
    draft: !!draft
  };
  announcements.unshift(newAnn);
  res.status(201).json(newAnn);
});

app.put('/api/announcements/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  const ann = announcements.find(a => a._id === req.params.id);
  if (!ann) return res.status(404).json({ message: 'Announcement not found' });
  
  const { title, body, cat, urgent, target, draft } = req.body;
  if (title !== undefined) ann.title = title;
  if (body !== undefined) ann.body = body;
  if (cat !== undefined) ann.cat = cat;
  if (urgent !== undefined) ann.urgent = !!urgent;
  if (target !== undefined) ann.target = target;
  if (draft !== undefined) ann.draft = !!draft;
  
  res.json(ann);
});

// ═══════════════════════════════════════════════════
// FEES API
// ═══════════════════════════════════════════════════
app.get('/api/fees', protect, (req, res) => {
  res.json(fees);
});

app.put('/api/fees/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  const fee = fees.find(f => f._id === req.params.id);
  if (!fee) return res.status(404).json({ message: 'Fee record not found' });
  fee.status = req.body.status || 'Paid';
  res.json(fee);
});

// ═══════════════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════════════
app.get('/api/attendance', protect, (req, res) => {
  res.json(attendance);
});

app.post('/api/attendance', protect, (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { date, status, sub, topic } = req.body;
  const newAtt = {
    _id: genId(),
    date: date || '2026-06-24',
    status: status || 'Present',
    sub: sub || 'Physics',
    topic: topic || 'General'
  };
  attendance.unshift(newAtt);
  res.status(201).json(newAtt);
});

// ═══════════════════════════════════════════════════
// LEADERBOARD API
// ═══════════════════════════════════════════════════
app.get('/api/leaderboard', protect, (req, res) => {
  res.json(leaderboard);
});

// ═══════════════════════════════════════════════════
// NEW CRUD APIs (User Management, Courses, Media, Quiz, Payments)
// ═══════════════════════════════════════════════════

// User CRUD
app.put('/api/auth/users/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const user = users.find(u => u._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.email !== undefined) user.email = req.body.email;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.gender !== undefined) user.gender = req.body.gender;
  if (req.body.dob !== undefined) user.dob = req.body.dob;
  if (req.body.designation !== undefined) user.designation = req.body.designation;
  if (req.body.dept !== undefined) user.dept = req.body.dept;
  if (req.body.subject !== undefined) user.subject = req.body.subject;
  if (req.body.campus !== undefined) user.campus = req.body.campus;
  if (req.body.joinDate !== undefined) user.joinDate = req.body.joinDate;
  if (req.body.roll !== undefined) user.roll = req.body.roll;
  if (req.body.batch !== undefined) user.batch = req.body.batch;
  if (req.body.feeStatus !== undefined) user.feeStatus = req.body.feeStatus;
  if (req.body.feeAmount !== undefined) user.feeAmount = Number(req.body.feeAmount);
  if (req.body.feePaid !== undefined) user.feePaid = Number(req.body.feePaid);
  if (req.body.feePending !== undefined) user.feePending = Number(req.body.feePending);

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
  }

  const profile = { ...user };
  delete profile.password;
  res.json(profile);
});

app.put('/api/auth/users/:id/status', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const user = users.find(u => u._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (req.body.st !== undefined) {
    user.st = req.body.st;
  } else {
    user.st = user.st === 'active' ? 'warning' : 'active';
  }
  res.json(user);
});

app.delete('/api/auth/users/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const idx = users.findIndex(u => u._id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'User not found' });
  users.splice(idx, 1);
  res.json({ message: 'User deleted successfully' });
});

// Course CRUD Updates
app.put('/api/courses/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const course = courses.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  if (req.body.title !== undefined) course.title = req.body.title;
  if (req.body.desc !== undefined) course.desc = req.body.desc;
  if (req.body.dur !== undefined) course.dur = req.body.dur;
  if (req.body.fee !== undefined) course.fee = Number(req.body.fee);
  if (req.body.maxSt !== undefined) course.maxSt = Number(req.body.maxSt);
  if (req.body.fac !== undefined) course.fac = req.body.fac;
  if (req.body.subjects !== undefined) course.subjects = req.body.subjects;
  if (req.body.curriculum !== undefined) course.curriculum = req.body.curriculum;
  if (req.body.pub !== undefined) course.pub = req.body.pub;
  if (req.body.e !== undefined) course.e = req.body.e;

  res.json(course);
});

app.put('/api/courses/:id/status', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const course = courses.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  course.pub = !course.pub;
  res.json(course);
});

app.delete('/api/courses/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const idx = courses.findIndex(c => c._id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Course not found' });
  courses.splice(idx, 1);
  res.json({ message: 'Course deleted successfully' });
});

// Media Edit / Update
app.put('/api/videos/:id', protect, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const video = videos.find(v => v._id === req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  const { title, sub, dur, batch } = req.body;
  if (title !== undefined) video.title = title;
  if (sub !== undefined) video.sub = sub;
  if (dur !== undefined) video.dur = dur;
  if (batch !== undefined) video.batch = batch;
  res.json(video);
});

app.put('/api/materials/:id', protect, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const material = materials.find(m => m._id === req.params.id);
  if (!material) return res.status(404).json({ message: 'Material not found' });
  const { title, name, type, sub, size, batch } = req.body;
  if (name !== undefined) material.name = name;
  else if (title !== undefined) material.name = title;
  if (type !== undefined) material.type = type;
  if (sub !== undefined) material.sub = sub;
  if (size !== undefined) material.size = size;
  if (batch !== undefined) material.batch = batch;
  res.json(material);
});

// Media Deletion
app.delete('/api/videos/:id', protect, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const idx = videos.findIndex(v => v._id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Video not found' });
  videos.splice(idx, 1);
  res.json({ message: 'Video deleted' });
});

app.delete('/api/materials/:id', protect, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const idx = materials.findIndex(m => m._id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Material not found' });
  materials.splice(idx, 1);
  res.json({ message: 'Material deleted' });
});

// Quiz Results
app.get('/api/quiz-results', protect, (req, res) => {
  res.json(quizResults);
});

app.post('/api/quiz-results', protect, (req, res) => {
  const { student, roll, course, subject, video, score, total, date } = req.body;
  const newQ = {
    _id: genId(),
    student: student || req.user.name,
    roll: roll || req.user.roll || 'RV2024001',
    course: course || req.user.batch || 'JEE Advanced (Main + KCET Decoded)',
    subject,
    video,
    score: Number(score),
    total: Number(total || 100),
    date: date || 'Just now'
  };
  quizResults.unshift(newQ);
  res.status(201).json(newQ);
});

// Payments
app.get('/api/payments', protect, (req, res) => {
  res.json(payments);
});

app.post('/api/payments', protect, (req, res) => {
  const { roll, amount, method, type, date, item, notes } = req.body;
  
  // Find student to update their fee balances
  const student = users.find(u => u.roll === roll && u.role === 'student');
  if (student) {
    const payAmt = Number(amount);
    student.feePaid = (student.feePaid || 0) + payAmt;
    student.feePending = Math.max(0, (student.feeAmount || 45000) - student.feePaid);
    student.feeStatus = student.feePending === 0 ? 'Paid' : 'Due';
    student.feeMethod = method;
    student.feeDate = date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const newP = {
    _id: genId(),
    id: 'TXN' + String(payments.length + 1).padStart(3, '0'),
    student: student ? student.name : 'Unknown Student',
    material: item || 'LMS Materials',
    amount: Number(amount),
    date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    method,
    status: 'success',
    type: type || 'course',
    notes
  };

  payments.unshift(newP);
  res.status(201).json(newP);
});

// Root Route
app.get('/', (req, res) => {
  res.send('🎓 RV Learning Hub LMS API Server Running');
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🎓 LMS Server listening on port ${PORT}`);
  });
}

module.exports = app;

