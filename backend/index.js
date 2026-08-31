const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dns = require('dns');

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lms_key_123';
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════
// SEPARATE MONGOOSE SCHEMAS FOR ADMIN, TEACHER, STUDENT
// ═══════════════════════════════════════════════════

// 1. STUDENTS COLLECTION (students)
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, default: 'student' },
  ava: String,
  batch: String,
  roll: { type: String, unique: true },
  streak: { type: Number, default: 1 },
  avgScore: { type: Number, default: 0 },
  feeStatus: { type: String, default: 'Paid' },
  feeAmount: { type: Number, default: 45000 },
  feePaid: { type: Number, default: 0 },
  feePending: { type: Number, default: 45000 },
  feeDueDate: String,
  feeMethod: String,
  feeDate: String,
  campus: String,
  gender: String,
  dob: String,
  st: { type: String, default: 'active' }
}, { timestamps: true, collection: 'students' });

// 2. TEACHERS COLLECTION (teachers)
const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, default: 'faculty' },
  ava: String,
  subject: String,
  emp: { type: String, unique: true },
  designation: { type: String, default: 'Senior Faculty' },
  dept: { type: String, default: 'Academics' },
  campus: String,
  batch: String,
  joinDate: String,
  dob: String,
  st: { type: String, default: 'active' }
}, { timestamps: true, collection: 'teachers' });

// 3. ADMINS COLLECTION (admins)
const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  ava: String,
  dept: { type: String, default: 'Administration' },
  emp: { type: String, unique: true },
  designation: { type: String, default: 'System Administrator' },
  campus: { type: String, default: 'RV Learning Hub HQ' },
  st: { type: String, default: 'active' }
}, { timestamps: true, collection: 'admins' });

// 4. ACADEMIC & LMS COLLECTIONS
const CourseSchema = new mongoose.Schema({
  e: String, title: String, desc: String, videos: Number, materials: Number,
  quizzes: Number, enrolled: { type: Boolean, default: false },
  col: String, p: Number, done: Number, total: Number, maxSt: Number,
  fac: String, fee: Number, cat: String, dur: String,
  subjects: [String], curriculum: String, rating: Number, reviews: Number,
  pub: { type: Boolean, default: true }
}, { timestamps: true, collection: 'courses' });

const VideoSchema = new mongoose.Schema({
  thumb: String, title: String, sub: String, batch: String,
  dur: String, fac: String, col: String, views: { type: Number, default: 0 },
  bookmarked: { type: Boolean, default: false }, trending: { type: Boolean, default: false },
  course: String, date: String
}, { timestamps: true, collection: 'videos' });

const LiveClassSchema = new mongoose.Schema({
  time: String, date: String, sub: String, topic: String,
  fac: String, online: { type: Number, default: 0 },
  status: { type: String, default: 'upcoming' }, videoUrl: String
}, { timestamps: true, collection: 'liveclasses' });

const ChatMessageSchema = new mongoose.Schema({
  liveClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass', required: true },
  sender: { type: String, required: true },
  senderRole: { type: String, default: 'student' },
  message: { type: String, required: true },
  color: { type: String, default: '#4ade80' },
  pinned: { type: Boolean, default: false },
  reactions: { type: Array, default: [] },
  type: { type: String, default: 'chat' }, // 'chat' or 'question'
  answered: { type: Boolean, default: false },
  answer: { type: String, default: '' },
  answeredBy: { type: String, default: '' },
  votes: { type: Number, default: 0 }
}, { timestamps: true, collection: 'chatmessages' });


const DoubtSchema = new mongoose.Schema({
  q: String, s: { type: String, default: 'pending' }, t: String,
  sub: String, student: String,
  replies: [{ sender: String, text: String, time: String }],
  ai: { type: Boolean, default: false }
}, { timestamps: true, collection: 'doubts' });

const MaterialSchema = new mongoose.Schema({
  name: String, type: String, size: String, date: String, pg: Number,
  sub: String, fac: String, course: String, category: String, year: Number,
  bookmarked: { type: Boolean, default: false }, batch: String, views: { type: Number, default: 0 }
}, { timestamps: true, collection: 'materials' });

const AnnouncementSchema = new mongoose.Schema({
  title: String, body: String, cat: String, date: String,
  urgent: { type: Boolean, default: false }, target: String, draft: { type: Boolean, default: false }
}, { timestamps: true, collection: 'announcements' });

const FeeSchema = new mongoose.Schema({
  student: String, roll: String, status: String, amount: Number,
  paid: Number, pending: Number, dueDate: String, method: String, date: String
}, { timestamps: true, collection: 'fees' });

const AttendanceSchema = new mongoose.Schema({
  date: String, status: String, sub: String, topic: String, student: String
}, { timestamps: true, collection: 'attendance' });

const LeaderboardSchema = new mongoose.Schema({
  name: String, roll: String, batch: String, score: Number, rank: Number
}, { timestamps: true, collection: 'leaderboard' });

const QuizResultSchema = new mongoose.Schema({
  student: String, roll: String, course: String, subject: String,
  video: String, score: Number, total: Number, date: String
}, { timestamps: true, collection: 'quizresults' });

const TestSchema = new mongoose.Schema({
  n: { type: String, required: true },
  type: { type: String, default: 'DPP' },
  subject: { type: String, default: 'Physics' },
  qs: { type: Number, default: 20 },
  duration: { type: String, default: '60 min' },
  marksCorrect: { type: String, default: '+4' },
  marksWrong: { type: String, default: '-1' },
  batch: { type: String, default: 'JEE Advanced A' },
  startDate: String,
  endDate: String,
  deadline: { type: String, default: 'Mar 25' },
  att: { type: Number, default: 0 },
  pub: { type: Boolean, default: true },
  fac: String
}, { timestamps: true, collection: 'tests' });

const ApprovalSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'material', 'test'], default: 'material' },
  title: { type: String, required: true },
  faculty: { type: String, required: true },
  course: { type: String, default: 'JEE Advanced (Main + KCET Decoded)' },
  subject: { type: String, default: 'Physics' },
  batch: { type: String, default: 'All Batches' },
  date: { type: String, default: 'Just now' },
  size: { type: String, default: '2.4 MB' },
  dur: String,
  st: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason: String
}, { timestamps: true, collection: 'approvals' });

const NotificationSchema = new mongoose.Schema({
  recipientRole: { type: String, enum: ['all', 'student', 'faculty', 'admin'], default: 'all' },
  recipientName: String,
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  icon: { type: String, default: '🔔' },
  link: String,
  read: { type: Boolean, default: false },
  date: { type: String, default: 'Just now' }
}, { timestamps: true, collection: 'notifications' });

const PaymentSchema = new mongoose.Schema({
  id: String, student: String, material: String,
  amount: Number, date: String, method: String,
  status: { type: String, default: 'success' }, type: String, notes: String
}, { timestamps: true, collection: 'payments' });

// Indexes for descending date ordering (newest first)
StudentSchema.index({ createdAt: -1 });
TeacherSchema.index({ createdAt: -1 });
AdminSchema.index({ createdAt: -1 });
CourseSchema.index({ createdAt: -1 });
VideoSchema.index({ createdAt: -1 });
LiveClassSchema.index({ createdAt: -1 });
ChatMessageSchema.index({ createdAt: -1 });
DoubtSchema.index({ createdAt: -1 });
MaterialSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ createdAt: -1 });
FeeSchema.index({ createdAt: -1 });
AttendanceSchema.index({ createdAt: -1 });
TestSchema.index({ createdAt: -1 });
ApprovalSchema.index({ createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
PaymentSchema.index({ createdAt: -1 });

const Student      = mongoose.model('Student', StudentSchema);
const Teacher      = mongoose.model('Teacher', TeacherSchema);
const Admin        = mongoose.model('Admin', AdminSchema);
const Course       = mongoose.model('Course', CourseSchema);
const Video        = mongoose.model('Video', VideoSchema);
const LiveClass    = mongoose.model('LiveClass', LiveClassSchema);
const Doubt        = mongoose.model('Doubt', DoubtSchema);
const Material     = mongoose.model('Material', MaterialSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);
const Fee          = mongoose.model('Fee', FeeSchema);
const Attendance   = mongoose.model('Attendance', AttendanceSchema);
const Leaderboard  = mongoose.model('Leaderboard', LeaderboardSchema);
const QuizResult   = mongoose.model('QuizResult', QuizResultSchema);
const Test         = mongoose.model('Test', TestSchema);
const Approval     = mongoose.model('Approval', ApprovalSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Payment      = mongoose.model('Payment', PaymentSchema);
const ChatMessage  = mongoose.model('ChatMessage', ChatMessageSchema);

// ═══════════════════════════════════════════════════
// REAL-TIME EVENT STREAMING (SSE & BROADCAST)
// ═══════════════════════════════════════════════════
let sseClients = [];

function broadcastRealtimeEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch(e) {}
  });
}

async function sendNotification({ recipientRole, recipientName, title, message, type, icon, link }) {
  try {
    const notif = await Notification.create({
      recipientRole: recipientRole || 'all',
      recipientName: recipientName || null,
      title,
      message,
      type: type || 'info',
      icon: icon || '🔔',
      link: link || null,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
    broadcastRealtimeEvent('NOTIFICATION', notif);
    return notif;
  } catch (e) {
    console.error('Notification creation error:', e);
  }
}

// Helper to find any user across all 3 collections
async function findUserAnywhere(query) {
  let user = await Student.findOne(query);
  if (user) return { user, model: Student, role: 'student' };
  user = await Teacher.findOne(query);
  if (user) return { user, model: Teacher, role: 'faculty' };
  user = await Admin.findOne(query);
  if (user) return { user, model: Admin, role: 'admin' };
  return null;
}

async function findUserById(id) {
  let user = await Student.findById(id);
  if (user) return { user, model: Student, role: 'student' };
  user = await Teacher.findById(id);
  if (user) return { user, model: Teacher, role: 'faculty' };
  user = await Admin.findById(id);
  if (user) return { user, model: Admin, role: 'admin' };
  return null;
}

// ═══════════════════════════════════════════════════
// SEED DATA (Populates separate collections if empty)
// ═══════════════════════════════════════════════════
async function seedData() {
  const studentCount = await Student.countDocuments();
  const teacherCount = await Teacher.countDocuments();
  const adminCount = await Admin.countDocuments();

  if (studentCount > 0 || teacherCount > 0 || adminCount > 0) return;

  const salt        = await bcrypt.genSalt(10);
  const studentHash = await bcrypt.hash('student123', salt);
  const facultyHash = await bcrypt.hash('faculty123', salt);
  const adminHash   = await bcrypt.hash('admin123', salt);

  // 1. ADMINS COLLECTION
  await Admin.create({
    name: 'Rahul Verma', email: 'admin@rvhub.com', phone: '9876543212',
    password: adminHash, role: 'admin', ava: 'A',
    dept: 'Administration', emp: 'ADM-001',
    designation: 'System Administrator', campus: 'RV Learning Hub HQ', st: 'active'
  });

  // 2. TEACHERS COLLECTION
  const teacherSeeds = [
    { name:'Dr. Priya Mehta', email:'priya@rvhub.com', phone:'9876543211', subject:'Physics', emp:'RVF001', designation:'Senior Physics Faculty', dept:'Academics', campus:'RV Jayanagar', batch:'JEE Advanced (Main + KCET Decoded)', joinDate:'2022-06-01' },
    { name:'Prof. Amit Singh', email:'amit.singh@rvhub.com', phone:'9876543213', subject:'Chemistry', emp:'RVF002', designation:'Senior Chemistry Faculty', dept:'Academics', campus:'RV Rajajinagar', batch:'JEE (Main + KCET Decoded)', joinDate:'2022-08-15' },
    { name:'Mr. Raj Sharma', email:'raj.sharma@rvhub.com', phone:'9876543214', subject:'Mathematics', emp:'RVF003', designation:'Senior Math Faculty', dept:'Academics', campus:'RV Electronic City', batch:'JEE Advanced (Main + KCET Decoded)', joinDate:'2023-01-10' },
    { name:'Dr. Kavya R.', email:'kavya.r@rvhub.com', phone:'9876543215', subject:'Biology', emp:'RVF004', designation:'Senior Biology Faculty', dept:'Academics', campus:'RV Jayanagar', batch:'NEET UG Decoded', joinDate:'2023-03-01' },
    { name:'Prof. Neha K.', email:'neha.k@rvhub.com', phone:'9876543216', subject:'Accountancy', emp:'RVF005', designation:'Commerce Faculty', dept:'Academics', campus:'RV Rajajinagar', batch:'Commerce Decoded Programme', joinDate:'2023-07-20' }
  ];
  for (const t of teacherSeeds) {
    await Teacher.create({ ...t, password: facultyHash, role: 'faculty', ava: t.name.charAt(0), st: 'active' });
  }

  // 3. STUDENTS COLLECTION
  const studentSeeds = [
    { name:'Arjun Sharma', email:'arjun@rvhub.com', phone:'9876543210', batch:'JEE Advanced (Main + KCET Decoded)', roll:'RV2024001', streak:7, avgScore:85, feeStatus:'Paid', feeAmount:45000, feePaid:22500, feePending:22500, feeDueDate:'Mar 31', feeMethod:'—', feeDate:'—', campus:'RV Jayanagar', gender:'Male' },
    { name:'Sneha Patel', email:'sneha.patel@student.rvhub.com', phone:'9800100002', batch:'JEE Advanced (Main + KCET Decoded)', roll:'RV2024002', streak:1, avgScore:88, feeStatus:'Paid', feeAmount:45000, feePaid:45000, feePending:0, feeDueDate:'Mar 1', feeMethod:'UPI', feeDate:'Mar 12', campus:'RV Rajajinagar', gender:'Female' },
    { name:'Rohan Gupta', email:'rohan.gupta@student.rvhub.com', phone:'9800100003', batch:'JEE (Main + KCET Decoded)', roll:'RV2024003', streak:2, avgScore:68, feeStatus:'Due', feeAmount:30000, feePaid:15000, feePending:15000, feeDueDate:'Mar 20', feeMethod:'—', feeDate:'—', campus:'RV Jayanagar', gender:'Male' },
    { name:'Kavya Reddy', email:'kavya.reddy@student.rvhub.com', phone:'9800100015', batch:'NEET UG Decoded', roll:'RV2024015', streak:5, avgScore:88, feeStatus:'Paid', feeAmount:38000, feePaid:38000, feePending:0, feeDueDate:'Mar 1', feeMethod:'Card', feeDate:'Mar 12', campus:'RV Electronic City', gender:'Female' },
    { name:'Dev Verma', email:'dev.verma@student.rvhub.com', phone:'9800100020', batch:'Commerce Decoded Programme', roll:'RV2024020', streak:0, avgScore:58, feeStatus:'Overdue', feeAmount:28000, feePaid:0, feePending:28000, feeDueDate:'Mar 1', feeMethod:'—', feeDate:'—', campus:'RV Rajajinagar', gender:'Male' },
    { name:'Ravi Kumar', email:'ravi.kumar@student.rvhub.com', phone:'9800100012', batch:'NEET UG Decoded', roll:'RV2024012', streak:3, avgScore:70, feeStatus:'Overdue', feeAmount:38000, feePaid:19000, feePending:19000, feeDueDate:'Mar 15', feeMethod:'—', feeDate:'—', campus:'RV Electronic City', gender:'Male' },
    { name:'Meera Shah', email:'meera.shah@student.rvhub.com', phone:'9800100008', batch:'JEE Advanced (Main + KCET Decoded)', roll:'RV2024008', streak:4, avgScore:78, feeStatus:'Overdue', feeAmount:45000, feePaid:30000, feePending:15000, feeDueDate:'Mar 10', feeMethod:'—', feeDate:'—', campus:'RV Rajajinagar', gender:'Female' },
    { name:'Aman Joshi', email:'aman.joshi@student.rvhub.com', phone:'9800100010', batch:'Commerce Decoded Programme', roll:'RV2024010', streak:1, avgScore:75, feeStatus:'Paid', feeAmount:28000, feePaid:28000, feePending:0, feeDueDate:'Mar 1', feeMethod:'Cash', feeDate:'Mar 11', campus:'RV Jayanagar', gender:'Male' }
  ];
  for (const s of studentSeeds) {
    await Student.create({ ...s, password: studentHash, role: 'student', ava: s.name.charAt(0), st: 'active' });
  }

  // 4. COURSES COLLECTION
  await Course.insertMany([
    { e:'⚛️', title:'JEE Advanced (Main + KCET Decoded)', desc:'Comprehensive JEE preparation', videos:22, materials:18, quizzes:15, col:'linear-gradient(90deg,#6c47ff,#a855f7)', p:65, done:42, total:65, maxSt:150, fac:'Dr. Priya Mehta', fee:45000, cat:'JEE', dur:'1 Year', subjects:['Physics','Chemistry','Mathematics'], rating:4.9, reviews:124, pub:true },
    { e:'🧪', title:'JEE (Main + KCET Decoded)', desc:'JEE Main focused course', videos:18, materials:14, quizzes:12, col:'linear-gradient(90deg,#ff6b35,#ff2d6b)', p:45, done:28, total:62, maxSt:150, fac:'Prof. Amit Singh', fee:30000, cat:'JEE', dur:'1 Year', subjects:['Physics','Chemistry','Mathematics'], rating:4.8, reviews:98, pub:true },
    { e:'🧬', title:'NEET UG Decoded', desc:'Complete NEET preparation', videos:20, materials:16, quizzes:14, col:'linear-gradient(90deg,#4ade80,#00c6ff)', p:72, done:50, total:70, maxSt:120, fac:'Dr. Kavya R.', fee:38000, cat:'NEET', dur:'1 Year', subjects:['Physics','Chemistry','Biology'], rating:4.9, reviews:112, pub:true },
    { e:'📊', title:'Commerce Decoded Programme', desc:'XI & XII Commerce full prep', videos:15, materials:12, quizzes:10, col:'linear-gradient(90deg,#fbbf24,#f97316)', p:55, done:35, total:64, maxSt:100, fac:'Prof. Neha K.', fee:28000, cat:'Commerce', dur:'1 Year', subjects:['Accountancy','Economics','Business Studies'], rating:4.7, reviews:78, pub:true },
    { e:'📐', title:'Foundation (Grade 8-10)', desc:'School foundation batch', videos:12, materials:10, quizzes:8, col:'linear-gradient(90deg,#00c6ff,#6c47ff)', p:30, done:18, total:60, maxSt:120, fac:'Mr. Raj Sharma', fee:20000, cat:'Foundation', dur:'1 Year', subjects:['Mathematics','Science','English'], rating:4.6, reviews:56, pub:true }
  ]);

  // 5. VIDEOS COLLECTION
  await Video.insertMany([
    { thumb:'⚡', title:'Electrostatics — Gauss Law Part 1', dur:'48 min', views:1243, date:'Mar 12', fac:'Dr. Priya Mehta', sub:'Physics', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'🔋', title:'Current Electricity — Kirchhoff Law', dur:'52 min', views:987, date:'Mar 10', fac:'Dr. Priya Mehta', sub:'Physics', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'🧲', title:'Magnetic Effects of Current', dur:'45 min', views:876, date:'Mar 8', fac:'Dr. Priya Mehta', sub:'Physics', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'⚗️', title:'Aldehydes & Ketones', dur:'41 min', views:654, date:'Mar 11', fac:'Prof. Amit Singh', sub:'Chemistry', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'🔬', title:'p-Block Elements', dur:'55 min', views:721, date:'Mar 9', fac:'Prof. Amit Singh', sub:'Chemistry', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'∫', title:'Integration by Parts', dur:'38 min', views:543, date:'Mar 7', fac:'Mr. Raj Sharma', sub:'Mathematics', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'📐', title:'Coordinate Geometry — Ellipse', dur:'44 min', views:612, date:'Mar 6', fac:'Mr. Raj Sharma', sub:'Mathematics', course:'JEE Advanced (Main + KCET Decoded)' },
    { thumb:'🌿', title:'Plant Kingdom — Classification', dur:'42 min', views:630, date:'Mar 5', fac:'Dr. Kavya R.', sub:'Biology', course:'NEET UG Decoded' },
    { thumb:'🔭', title:'Optics — Ray & Wave Optics', dur:'50 min', views:560, date:'Mar 9', fac:'Prof. Amit Singh', sub:'Physics', course:'NEET UG Decoded' },
    { thumb:'⚛️', title:'Modern Physics — Atomic Models', dur:'44 min', views:480, date:'Mar 7', fac:'Prof. Amit Singh', sub:'Physics', course:'NEET UG Decoded' },
    { thumb:'🧬', title:'Biomolecules — Carbohydrates & Proteins', dur:'46 min', views:720, date:'Mar 8', fac:'Prof. Amit Singh', sub:'Chemistry', course:'NEET UG Decoded' },
    { thumb:'📊', title:'Partnership Accounts — Introduction', dur:'45 min', views:420, date:'Mar 9', fac:'Prof. Neha K.', sub:'Accountancy', course:'Commerce Decoded Programme' },
    { thumb:'📈', title:'Ratio Analysis — Complete Guide', dur:'38 min', views:360, date:'Mar 7', fac:'Prof. Neha K.', sub:'Accountancy', course:'Commerce Decoded Programme' },
    { thumb:'💹', title:'Macro Economics — National Income', dur:'42 min', views:380, date:'Mar 8', fac:'Prof. Neha K.', sub:'Economics', course:'Commerce Decoded Programme' },
    { thumb:'💼', title:'Business Finance — Sources of Funds', dur:'40 min', views:290, date:'Mar 7', fac:'Prof. Neha K.', sub:'Business Studies', course:'Commerce Decoded Programme' }
  ]);

  // 6. LIVE CLASSES COLLECTION
  await LiveClass.insertMany([
    { time:'LIVE', date:'NOW', sub:'Physics', topic:'Electrostatics: Gauss Law', fac:'Dr. Priya Mehta', online:142, status:'ongoing', videoUrl:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { time:'11:00 AM', date:'Today', sub:'Chemistry', topic:'Aldehydes & Ketones', fac:'Prof. Amit Singh', online:0, status:'upcoming', videoUrl:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { time:'02:00 PM', date:'Today', sub:'Maths', topic:'Integration by Parts', fac:'Mr. Raj Sharma', online:0, status:'upcoming', videoUrl:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
  ]);

  // 7. DOUBTS COLLECTION
  await Doubt.insertMany([
    { q:'What is Gauss Law for non-uniform fields?', s:'resolved', t:'2 hours ago', sub:'Physics', student:'Arjun Sharma', replies:[{ sender:'Dr. Priya Mehta', text:'Gauss Law applies to any closed surface regardless of field uniformity.', time:'1 hour ago' }] },
    { q:'How to solve integration by substitution?', s:'pending', t:'3 hours ago', sub:'Maths', student:'Rohan Gupta', replies:[] },
    { q:'Difference between SN1 and SN2 reactions?', s:'resolved', t:'Yesterday', sub:'Chemistry', student:'Sneha Patel', replies:[{ sender:'Prof. Amit Singh', text:'SN1 is unimolecular; SN2 is bimolecular.', time:'Yesterday' }] },
    { q:'How does Krebs cycle produce ATP?', s:'pending', t:'Yesterday', sub:'Biology', student:'Kavya Reddy', replies:[] }
  ]);

  // 8. MATERIALS COLLECTION
  await Material.insertMany([
    { name:'Chapter 1 — Electrostatics Notes', type:'PDF', size:'2.4 MB', date:'Mar 10', pg:28, sub:'Physics', fac:'Dr. Priya Mehta', course:'JEE Advanced (Main + KCET Decoded)', category:'Course Materials' },
    { name:'DPP Set 1-5 with Solutions', type:'PDF', size:'3.2 MB', date:'Mar 6', pg:45, sub:'Physics', fac:'Dr. Priya Mehta', course:'JEE Advanced (Main + KCET Decoded)', category:'Course Materials' },
    { name:'Organic Reactions Quick Sheet', type:'PDF', size:'1.2 MB', date:'Mar 9', pg:12, sub:'Chemistry', fac:'Prof. Amit Singh', course:'JEE Advanced (Main + KCET Decoded)', category:'Course Materials' },
    { name:'Calculus Formula Sheet', type:'PDF', size:'0.8 MB', date:'Mar 11', pg:8, sub:'Mathematics', fac:'Mr. Raj Sharma', course:'JEE Advanced (Main + KCET Decoded)', category:'Course Materials' },
    { name:'Biology NCERT Key Points', type:'PDF', size:'3.6 MB', date:'Mar 10', pg:48, sub:'Biology', fac:'Dr. Kavya R.', course:'NEET UG Decoded', category:'Course Materials' },
    { name:'JEE Advanced 2024 Paper 1 + Solutions', type:'PDF', size:'2.5 MB', date:'Mar 12, 2025', pg:18, sub:'All', fac:'Dr. Priya Mehta', course:'JEE Advanced (Main + KCET Decoded)', category:'Question Papers', year:2024 }
  ]);

  // 9. ANNOUNCEMENTS COLLECTION
  await Announcement.insertMany([
    { title:'JEE Advanced 2025 Mock Test 1', body:'Full syllabus mock test scheduled for March 25.', cat:'Exam', date:'Mar 12', urgent:true, target:'all', draft:false },
    { title:'Fee Payment Reminder', body:'Last date for fee payment is March 31.', cat:'Fee', date:'Mar 10', urgent:false, target:'students', draft:false },
    { title:'Parent-Teacher Meeting', body:'PTM scheduled on March 28, 10 AM – 2 PM.', cat:'Event', date:'Mar 9', urgent:false, target:'all', draft:false }
  ]);

  // 10. LEADERBOARD COLLECTION
  await Leaderboard.insertMany([
    { name:'Arjun Sharma', roll:'RV2024001', batch:'JEE Advanced', score:94, rank:1 },
    { name:'Sneha Patel', roll:'RV2024002', batch:'JEE Advanced', score:91, rank:2 },
    { name:'Kavya Reddy', roll:'RV2024015', batch:'NEET UG', score:89, rank:3 },
    { name:'Meera Shah', roll:'RV2024008', batch:'JEE Advanced', score:87, rank:4 }
  ]);

  // 11. PAYMENTS COLLECTION
  await Payment.insertMany([
    { id:'TXN001', student:'Sneha Patel', material:'JEE Advanced Full Course', amount:45000, date:'Mar 12, 2025', method:'UPI', status:'success', type:'course' },
    { id:'TXN007', student:'Arjun Sharma', material:'JEE Advanced Full Course', amount:22500, date:'Mar 8, 2025', method:'UPI', status:'success', type:'course' }
  ]);

  console.log('✅ MongoDB separate collections seeded.');
}

// ═══════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await findUserById(decoded.id);
      if (!result || !result.user) return res.status(401).json({ message: 'User not found' });
      req.user = result.user.toObject();
      delete req.user.password;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
};

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// ═══════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let emailOrPhone = email.trim().toLowerCase();
    if (emailOrPhone === 'arjun' || emailOrPhone === 'student') emailOrPhone = 'arjun@rvhub.com';
    else if (emailOrPhone === 'priya' || emailOrPhone === 'faculty') emailOrPhone = 'priya@rvhub.com';
    else if (emailOrPhone === 'admin') emailOrPhone = 'admin@rvhub.com';

    const result = await findUserAnywhere({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
    if (!result || !result.user) return res.status(400).json({ message: 'User does not exist' });

    const user = result.user;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = generateToken(user._id);
    const profile = user.toObject();
    delete profile.password;
    res.json({ token, user: profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    const existing = await findUserAnywhere({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'student';

    let created;
    if (userRole === 'student') {
      const studentCount = await Student.countDocuments();
      created = await Student.create({
        name, email, phone, password: hashedPassword,
        role: 'student', ava: name.charAt(0).toUpperCase(),
        batch: req.body.batch || 'JEE Advanced (Main + KCET Decoded)',
        roll: req.body.roll || ('RV2024' + String(studentCount + 1).padStart(3, '0')),
        streak: req.body.streak || 1, avgScore: req.body.avgScore || 0,
        campus: req.body.campus || 'RV Jayanagar', gender: req.body.gender || 'Male',
        feeStatus: req.body.feeStatus || 'Paid', feeAmount: req.body.feeAmount || 45000,
        feePaid: req.body.feePaid || 0, feePending: req.body.feePending || 45000,
        feeDueDate: req.body.feeDueDate || 'Mar 31',
        feeMethod: req.body.feeMethod || '—', feeDate: req.body.feeDate || '—', st: 'active'
      });
    } else if (userRole === 'faculty') {
      const teacherCount = await Teacher.countDocuments();
      created = await Teacher.create({
        name, email, phone, password: hashedPassword,
        role: 'faculty', ava: name.charAt(0).toUpperCase(),
        subject: req.body.subject || 'Physics',
        emp: req.body.emp || ('RVF' + String(teacherCount + 1).padStart(3, '0')),
        campus: req.body.campus || 'RV Jayanagar',
        batch: req.body.batch || 'JEE Advanced (Main + KCET Decoded)', st: 'active'
      });
    } else {
      const adminCount = await Admin.countDocuments();
      created = await Admin.create({
        name, email, phone, password: hashedPassword,
        role: 'admin', ava: name.charAt(0).toUpperCase(),
        dept: req.body.dept || 'Administration',
        emp: req.body.emp || ('RVADM' + String(adminCount + 1).padStart(3, '0')),
        campus: req.body.campus || 'RV Learning Hub HQ', st: 'active'
      });
    }

    const token = generateToken(created._id);
    const profile = created.toObject();
    delete profile.password;
    res.status(201).json({ token, user: profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/profile', protect, (req, res) => res.json(req.user));

app.put('/api/auth/profile', protect, async (req, res) => {
  try {
    const result = await findUserById(req.user._id);
    if (!result || !result.user) return res.status(404).json({ message: 'User not found' });

    const fields = ['name','email','phone','gender','dob','designation','dept','subject','campus','joinDate','roll','batch'];
    fields.forEach(f => { if (req.body[f] !== undefined) result.user[f] = req.body[f]; });

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      result.user.password = await bcrypt.hash(req.body.password, salt);
    }
    await result.user.save();
    const profile = result.user.toObject();
    delete profile.password;
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/users', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const [students, teachers, admins] = await Promise.all([
    Student.find().select('-password').sort({ createdAt: -1 }),
    Teacher.find().select('-password').sort({ createdAt: -1 }),
    Admin.find().select('-password').sort({ createdAt: -1 })
  ]);
  res.json([...students, ...teachers, ...admins]);
});

// Dedicated endpoints for specific role data
app.get('/api/students', protect, async (req, res) => {
  res.json(await Student.find().select('-password').sort({ createdAt: -1 }));
});

app.get('/api/teachers', protect, async (req, res) => {
  res.json(await Teacher.find().select('-password').sort({ createdAt: -1 }));
});

app.get('/api/admins', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  res.json(await Admin.find().select('-password').sort({ createdAt: -1 }));
});

app.put('/api/auth/users/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const result = await findUserById(req.params.id);
    if (!result || !result.user) return res.status(404).json({ message: 'User not found' });

    const fields = ['name','email','phone','gender','dob','designation','dept','subject','campus','joinDate','roll','batch','feeStatus','feeAmount','feePaid','feePending'];
    fields.forEach(f => { if (req.body[f] !== undefined) result.user[f] = req.body[f]; });

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      result.user.password = await bcrypt.hash(req.body.password, salt);
    }
    await result.user.save();
    const profile = result.user.toObject();
    delete profile.password;
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/auth/users/:id/status', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const result = await findUserById(req.params.id);
  if (!result || !result.user) return res.status(404).json({ message: 'User not found' });
  result.user.st = req.body.st !== undefined ? req.body.st : (result.user.st === 'active' ? 'warning' : 'active');
  await result.user.save();
  res.json(result.user);
});

app.delete('/api/auth/users/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const result = await findUserById(req.params.id);
  if (!result || !result.user) return res.status(404).json({ message: 'User not found' });
  await result.model.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
});

// ═══════════════════════════════════════════════════
// COURSES API
// ═══════════════════════════════════════════════════
app.get('/api/courses', protect, async (req, res) => res.json(await Course.find().sort({ createdAt: -1 })));
app.post('/api/courses', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { title, e, desc, fac, total, fee, cat, dur, subjects, curriculum } = req.body;
  const course = await Course.create({
    e: e || '📚', title, desc: desc || '',
    videos: req.body.videos || 10, materials: req.body.materials || 8, quizzes: req.body.quizzes || 5,
    enrolled: false, col: 'linear-gradient(90deg,#6c47ff,#a855f7)', p: 0, done: 0,
    total: total || 150, maxSt: total || 150, fac: fac || 'Dr. Priya Mehta',
    fee: fee !== undefined ? Number(fee) : 30000, cat: cat || 'JEE', dur: dur || '1 Year',
    subjects: subjects || ['Physics','Chemistry','Mathematics'],
    curriculum: curriculum || 'Standard curriculum', rating: 5.0, reviews: 1, pub: true
  });
  broadcastRealtimeEvent('COURSE_CREATED', course);
  res.status(201).json(course);
});
app.post('/api/courses/:id/enroll', protect, async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { enrolled: true }, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  broadcastRealtimeEvent('COURSE_UPDATED', course);
  res.json(course);
});
app.put('/api/courses/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const fields = ['title','desc','dur','fac','subjects','curriculum','pub','e'];
  const update = {};
  fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  if (req.body.fee !== undefined) update.fee = Number(req.body.fee);
  if (req.body.maxSt !== undefined) update.maxSt = Number(req.body.maxSt);
  const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  broadcastRealtimeEvent('COURSE_UPDATED', course);
  res.json(course);
});
app.put('/api/courses/:id/status', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  course.pub = !course.pub; await course.save();
  broadcastRealtimeEvent('COURSE_UPDATED', course);
  res.json(course);
});
app.delete('/api/courses/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  broadcastRealtimeEvent('COURSE_DELETED', { id: req.params.id });
  res.json({ message: 'Course deleted successfully' });
});


// ═══════════════════════════════════════════════════
// VIDEOS API
// ═══════════════════════════════════════════════════
app.get('/api/videos', protect, async (req, res) => res.json(await Video.find().sort({ createdAt: -1 })));
app.post('/api/videos', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const video = await Video.create({
    thumb: req.body.thumb || '🎥', title: req.body.title, sub: req.body.sub,
    batch: req.body.batch || 'General', dur: req.body.dur || '30:00',
    fac: req.user.name, col: '#ff6b35', views: 0, bookmarked: false, trending: false
  });
  broadcastRealtimeEvent('VIDEO_CREATED', video);
  res.status(201).json(video);
});
app.put('/api/videos/:id/bookmark', protect, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  video.bookmarked = !video.bookmarked; await video.save();
  broadcastRealtimeEvent('VIDEO_UPDATED', video);
  res.json(video);
});
app.put('/api/videos/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const update = {};
  ['title','sub','dur','batch'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!video) return res.status(404).json({ message: 'Video not found' });
  broadcastRealtimeEvent('VIDEO_UPDATED', video);
  res.json(video);
});
app.delete('/api/videos/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const video = await Video.findByIdAndDelete(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  broadcastRealtimeEvent('VIDEO_DELETED', { id: req.params.id });
  res.json({ message: 'Video deleted' });
});

// ═══════════════════════════════════════════════════
// REAL-TIME EVENT STREAM (SSE) & NOTIFICATIONS API
// ═══════════════════════════════════════════════════
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now() + '-' + Math.random();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

app.get('/api/notifications', protect, async (req, res) => {
  try {
    const query = {
      $or: [
        { recipientRole: 'all' },
        { recipientRole: req.user.role },
        { recipientName: req.user.name }
      ]
    };
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(40);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(notif);
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  await Notification.updateMany({
    $or: [
      { recipientRole: 'all' },
      { recipientRole: req.user.role },
      { recipientName: req.user.name }
    ]
  }, { read: true });
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════
// DOUBTS API (WITH REAL-TIME BROADCASTS)
// ═══════════════════════════════════════════════════
app.get('/api/doubts', protect, async (req, res) => res.json(await Doubt.find().sort({ createdAt: -1 })));

app.post('/api/doubts', protect, async (req, res) => {
  const doubt = await Doubt.create({
    q: req.body.q, s: 'pending', t: 'Just now',
    sub: req.body.sub || 'General', student: req.user.name,
    replies: [{ sender: req.user.name, text: req.body.q, time: 'Just now' }], ai: false
  });

  await sendNotification({
    recipientRole: 'faculty',
    title: '❓ New Doubt Asked',
    message: `${req.user.name} asked: "${req.body.q.substring(0, 50)}..."`,
    type: 'doubt',
    icon: '❓',
    link: 'doubts'
  });

  broadcastRealtimeEvent('DOUBT_CREATED', doubt);
  res.status(201).json(doubt);
});

app.post('/api/doubts/:id/reply', protect, async (req, res) => {
  const doubt = await Doubt.findById(req.params.id);
  if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
  doubt.replies.push({ sender: req.user.name, text: req.body.text, time: 'Just now' });
  if (req.user.role === 'faculty') doubt.s = 'resolved';
  await doubt.save();

  await sendNotification({
    recipientName: doubt.student,
    recipientRole: 'student',
    title: '💡 Doubt Answered!',
    message: `${req.user.name} replied to your doubt on ${doubt.sub}: "${req.body.text.substring(0, 50)}..."`,
    type: 'doubt',
    icon: '💡',
    link: 'student_doubts'
  });

  broadcastRealtimeEvent('DOUBT_REPLIED', doubt);
  res.status(201).json(doubt);
});

app.put('/api/doubts/:id/resolve', protect, async (req, res) => {
  const doubt = await Doubt.findByIdAndUpdate(req.params.id, { s: 'resolved' }, { new: true });
  if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
  broadcastRealtimeEvent('DOUBT_RESOLVED', doubt);
  res.json(doubt);
});

// ═══════════════════════════════════════════════════
// MATERIALS & VIDEOS API (WITH REAL-TIME BROADCASTS)
// ═══════════════════════════════════════════════════
app.get('/api/materials', protect, async (req, res) => res.json(await Material.find().sort({ createdAt: -1 })));
app.post('/api/materials', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const mat = await Material.create({
    name: req.body.name, type: req.body.type || 'pdf',
    sub: req.body.sub, fac: req.user.name, size: req.body.size || '1.5 MB',
    batch: req.body.batch || 'All Batches', date: 'Just now'
  });
  broadcastRealtimeEvent('MATERIAL_UPLOADED', mat);
  res.status(201).json(mat);
});

app.put('/api/materials/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const update = {};
  if (req.body.name !== undefined) update.name = req.body.name;
  else if (req.body.title !== undefined) update.name = req.body.title;
  ['type','sub','size','batch'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  const mat = await Material.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!mat) return res.status(404).json({ message: 'Material not found' });
  broadcastRealtimeEvent('MATERIAL_UPDATED', mat);
  res.json(mat);
});

app.delete('/api/materials/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const mat = await Material.findByIdAndDelete(req.params.id);
  if (!mat) return res.status(404).json({ message: 'Material not found' });
  broadcastRealtimeEvent('MATERIAL_DELETED', { id: req.params.id });
  res.json({ message: 'Material deleted' });
});

// ═══════════════════════════════════════════════════
// LIVE CLASSES API (WITH REAL-TIME BROADCASTS)
// ═══════════════════════════════════════════════════
app.get('/api/live', protect, async (req, res) => res.json(await LiveClass.find().sort({ createdAt: -1 })));
app.post('/api/live', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const live = await LiveClass.create({
    time: req.body.time || '12:00 PM', date: req.body.date || 'Today',
    sub: req.body.sub || req.user.subject || 'General',
    topic: req.body.topic, fac: req.user.name, online: 120, status: req.body.status || 'live'
  });

  await sendNotification({
    recipientRole: 'student',
    title: '🔴 Live Class Scheduled',
    message: `${req.user.name} scheduled a Live Class: "${req.body.topic}" on ${live.date} at ${live.time}`,
    type: 'live',
    icon: '🔴',
    link: 'student_live'
  });

  broadcastRealtimeEvent('LIVE_CLASS_UPDATED', live);
  res.status(201).json(live);
});

app.put('/api/live/:id/start', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const live = await LiveClass.findByIdAndUpdate(req.params.id, { status: 'live', online: 147 }, { new: true });
  if (!live) return res.status(404).json({ message: 'Live class not found' });

  await sendNotification({
    recipientRole: 'student',
    title: '🔴 Live Class Started NOW!',
    message: `${live.fac} is now LIVE for "${live.topic}". Click to join the interactive class!`,
    type: 'live',
    icon: '🔴',
    link: 'student_live'
  });

  broadcastRealtimeEvent('LIVE_CLASS_STARTED', live);
  res.json(live);
});

app.put('/api/live/:id/end', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const live = await LiveClass.findByIdAndUpdate(req.params.id, { status: 'ended' }, { new: true });
  if (!live) return res.status(404).json({ message: 'Live class not found' });
  broadcastRealtimeEvent('LIVE_CLASS_ENDED', live);
  res.json(live);
});

app.delete('/api/live/:id', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const live = await LiveClass.findByIdAndDelete(req.params.id);
  if (!live) return res.status(404).json({ message: 'Live class not found' });
  broadcastRealtimeEvent('LIVE_CLASS_DELETED', { id: req.params.id });
  res.json({ message: 'Live class removed' });
});

// ─── LIVE CLASS CHAT API ───
app.get('/api/live/:id/chat', protect, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ liveClassId: req.params.id }).sort({ createdAt: 1 }).lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/live/:id/chat', protect, async (req, res) => {
  try {
    const msg = await ChatMessage.create({
      liveClassId: req.params.id,
      sender: req.user.name,
      senderRole: req.user.role,
      message: req.body.message,
      color: req.body.color || '#4ade80',
      pinned: false,
      reactions: []
    });
    broadcastRealtimeEvent('CHAT_MESSAGE', {
      _id: msg._id,
      liveClassId: req.params.id,
      sender: msg.sender,
      senderRole: msg.senderRole,
      message: msg.message,
      color: msg.color,
      pinned: msg.pinned,
      reactions: msg.reactions,
      createdAt: msg.createdAt
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/live/:id/qa', protect, async (req, res) => {
  try {
    const msg = await ChatMessage.create({
      liveClassId: req.params.id,
      sender: req.user.name,
      senderRole: req.user.role,
      message: req.body.question,
      color: req.body.color || '#4ade80',
      pinned: false,
      reactions: [],
      type: 'question'
    });
    broadcastRealtimeEvent('QA_MESSAGE', {
      _id: msg._id,
      liveClassId: req.params.id,
      sender: msg.sender,
      senderRole: msg.senderRole,
      message: msg.message,
      color: msg.color,
      createdAt: msg.createdAt
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/live/:id/qa/:msgId/answer', protect, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Question not found' });
    msg.answered = true;
    msg.answer = req.body.answer || '';
    msg.answeredBy = req.user.name || 'Faculty';
    await msg.save();

    broadcastRealtimeEvent('QA_ANSWERED', {
      _id: msg._id,
      liveClassId: req.params.id,
      answered: true,
      answer: msg.answer,
      answeredBy: msg.answeredBy
    });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/live/:id/qa/:msgId/vote', protect, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Question not found' });
    msg.votes = (msg.votes || 0) + (req.body.delta || 1);
    await msg.save();

    broadcastRealtimeEvent('QA_VOTED', {
      _id: msg._id,
      liveClassId: req.params.id,
      votes: msg.votes
    });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ═══════════════════════════════════════════════════
// ANNOUNCEMENTS API (WITH REAL-TIME BROADCASTS)
// ═══════════════════════════════════════════════════
app.get('/api/announcements', protect, async (req, res) => res.json(await Announcement.find().sort({ createdAt: -1 })));
app.post('/api/announcements', protect, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ message: 'Unauthorized' });
  const ann = await Announcement.create({
    title: req.body.title, desc: req.body.desc,
    tag: req.body.tag || 'General', date: 'Just now', fac: req.user.name
  });

  await sendNotification({
    recipientRole: 'all',
    title: '📢 ' + ann.title,
    message: ann.desc,
    type: 'announcement',
    icon: '📢',
    link: 'announcements'
  });

  broadcastRealtimeEvent('ANNOUNCEMENT_CREATED', ann);
  res.status(201).json(ann);
});

// ═══════════════════════════════════════════════════
// TESTS & QUIZ RESULTS API (WITH REAL-TIME BROADCASTS)
// ═══════════════════════════════════════════════════
app.get('/api/tests', protect, async (req, res) => res.json(await Test.find().sort({ createdAt: -1 })));
app.post('/api/tests', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const test = await Test.create({
    n: req.body.n, type: req.body.type || 'DPP',
    subject: req.body.subject || 'Physics', qs: req.body.qs || 20,
    duration: req.body.duration || '60 min', marksCorrect: req.body.marksCorrect || '+4',
    marksWrong: req.body.marksWrong || '-1', batch: req.body.batch || 'JEE Advanced A',
    startDate: req.body.startDate, endDate: req.body.endDate,
    deadline: req.body.deadline || 'Mar 25', att: 0, pub: true, fac: req.user.name
  });

  await sendNotification({
    recipientRole: 'student',
    title: '📝 New Test Assigned',
    message: `${req.user.name} published a new test: "${test.n}" (${test.duration})`,
    type: 'test',
    icon: '📝',
    link: 'student_tests'
  });

  broadcastRealtimeEvent('TEST_CREATED', test);
  res.status(201).json(test);
});

app.put('/api/tests/:id', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  broadcastRealtimeEvent('TEST_UPDATED', test);
  res.json(test);
});

app.delete('/api/tests/:id', protect, async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const test = await Test.findByIdAndDelete(req.params.id);
  if (!test) return res.status(404).json({ message: 'Test not found' });
  broadcastRealtimeEvent('TEST_DELETED', { id: req.params.id });
  res.json({ message: 'Test deleted' });
});

app.post('/api/tests/:id/attempt', protect, async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (test) {
    test.att = (test.att || 0) + 1;
    await test.save();
  }
  broadcastRealtimeEvent('TEST_ATTEMPTED', { id: req.params.id, att: test ? test.att : 0 });
  res.json({ success: true, test });
});

app.get('/api/quiz-results', protect, async (req, res) => res.json(await QuizResult.find().sort({ createdAt: -1 })));
app.post('/api/quiz-results', protect, async (req, res) => {
  const qr = await QuizResult.create(req.body);

  await sendNotification({
    recipientRole: 'faculty',
    title: '📊 Quiz Submitted',
    message: `${req.body.student} completed "${req.body.video}" with score ${req.body.score}/${req.body.total}`,
    type: 'test',
    icon: '📊',
    link: 'faculty_tracker'
  });

  broadcastRealtimeEvent('QUIZ_SUBMITTED', qr);
  res.status(201).json(qr);
});

// ═══════════════════════════════════════════════════
// APPROVALS API (CONTENT MODERATION WITH REAL-TIME WORKFLOW)
// ═══════════════════════════════════════════════════
app.get('/api/approvals', protect, async (req, res) => {
  res.json(await Approval.find().sort({ createdAt: -1 }));
});

app.post('/api/approvals', protect, async (req, res) => {
  const { type, title, course, subject, batch, size, dur } = req.body;
  const appItem = await Approval.create({
    type: type || 'material',
    title,
    faculty: req.user.name,
    course: course || 'JEE Advanced (Main + KCET Decoded)',
    subject: subject || 'Physics',
    batch: batch || 'All Batches',
    size: size || '2.4 MB',
    dur: dur || null,
    date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
    st: 'pending'
  });

  await sendNotification({
    recipientRole: 'admin',
    title: '⏳ New Submission for Approval',
    message: `${req.user.name} submitted "${title}" (${subject}) for review`,
    type: 'approval',
    icon: '⏳',
    link: 'approvals'
  });

  broadcastRealtimeEvent('APPROVAL_REQUESTED', appItem);
  res.status(201).json(appItem);
});

app.put('/api/approvals/:id/approve', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const appItem = await Approval.findByIdAndUpdate(req.params.id, { st: 'approved' }, { new: true });
  if (!appItem) return res.status(404).json({ message: 'Approval item not found' });
  
  if (appItem.type === 'video') {
    await Video.create({
      thumb: '🎥',
      title: appItem.title,
      sub: appItem.subject,
      batch: appItem.batch,
      dur: appItem.dur || '45:00',
      fac: appItem.faculty,
      course: appItem.course,
      date: 'Just now'
    });
  } else {
    await Material.create({
      name: appItem.title,
      type: appItem.title.toLowerCase().indexOf('ppt') >= 0 ? 'ppt' : 'pdf',
      sub: appItem.subject,
      fac: appItem.faculty,
      size: appItem.size || '2.4 MB',
      batch: appItem.batch,
      course: appItem.course,
      date: 'Just now'
    });
  }

  await sendNotification({
    recipientName: appItem.faculty,
    recipientRole: 'faculty',
    title: '✅ Content Approved!',
    message: `Admin approved your content: "${appItem.title}". It is now live for all students!`,
    type: 'approval',
    icon: '✅',
    link: 'content'
  });

  await sendNotification({
    recipientRole: 'student',
    title: '📚 New Study Material Live',
    message: `New ${appItem.type} available: "${appItem.title}" by ${appItem.faculty}`,
    type: 'material',
    icon: '📚',
    link: 'materials'
  });

  broadcastRealtimeEvent('APPROVAL_STATUS_CHANGED', { id: req.params.id, status: 'approved', item: appItem });
  res.json({ success: true, item: appItem });
});

app.put('/api/approvals/:id/reject', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const reason = req.body.reason || 'Content did not meet quality standards';
  const appItem = await Approval.findByIdAndUpdate(req.params.id, {
    st: 'rejected',
    reason: reason
  }, { new: true });
  if (!appItem) return res.status(404).json({ message: 'Approval item not found' });

  await sendNotification({
    recipientName: appItem.faculty,
    recipientRole: 'faculty',
    title: '❌ Content Submission Feedback',
    message: `Admin requested changes for "${appItem.title}": "${reason}"`,
    type: 'approval',
    icon: '❌',
    link: 'content'
  });

  broadcastRealtimeEvent('APPROVAL_STATUS_CHANGED', { id: req.params.id, status: 'rejected', item: appItem });
  res.json({ success: true, item: appItem });
});

// ═══════════════════════════════════════════════════
// HIGH-PERFORMANCE UNIFIED BATCH SYNC API
// ═══════════════════════════════════════════════════
app.get('/api/sync', protect, async (req, res) => {
  try {
    const notifQuery = {
      $or: [
        { recipientRole: 'all' },
        { recipientRole: req.user.role },
        { recipientName: req.user.name }
      ]
    };

    const [
      courses, videos, liveClasses, doubts, materials,
      announcements, fees, attendance, leaderboard, tests,
      quizResults, approvals, payments, students, teachers, notifications
    ] = await Promise.all([
      Course.find().sort({ createdAt: -1 }).lean(),
      Video.find().sort({ createdAt: -1 }).lean(),
      LiveClass.find().sort({ createdAt: -1 }).lean(),
      Doubt.find().sort({ createdAt: -1 }).lean(),
      Material.find().sort({ createdAt: -1 }).lean(),
      Announcement.find().sort({ createdAt: -1 }).lean(),
      Fee.find().sort({ createdAt: -1 }).lean(),
      Attendance.find().sort({ createdAt: -1 }).lean(),
      Leaderboard.find().sort({ rank: 1 }).lean(),
      Test.find().sort({ createdAt: -1 }).lean(),
      QuizResult.find().sort({ createdAt: -1 }).lean(),
      Approval.find().sort({ createdAt: -1 }).lean(),
      Payment.find().sort({ createdAt: -1 }).lean(),
      Student.find().select('-password').sort({ createdAt: -1 }).lean(),
      Teacher.find().select('-password').sort({ createdAt: -1 }).lean(),
      Notification.find(notifQuery).sort({ createdAt: -1 }).limit(30).lean()
    ]);

    res.json({
      courses, videos, liveClasses, doubts, materials,
      announcements, fees, attendance, leaderboard, tests,
      quizResults, approvals, payments, students, teachers, notifications
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════
// ROOT & SERVER
// ═══════════════════════════════════════════════════
app.get('/', (req, res) => res.send('🎓 RV Learning Hub LMS API Server Running'));

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedData();
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      app.listen(PORT, () => console.log(`🎓 LMS Server listening on port ${PORT}`));
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
