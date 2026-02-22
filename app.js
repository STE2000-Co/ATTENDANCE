import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyBIgAvKSmqBGzKWvnb0FgxOPVrDHp8TDaA",
  authDomain: "system-base-8b777.firebaseapp.com",
  projectId: "system-base-8b777",
  storageBucket: "system-base-8b777.firebasestorage.app",
  messagingSenderId: "749702522934",
  appId: "1:749702522934:web:5664ccfd9d04ae88985097"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentState = "checkin";
let currentUserId = null;
let countdownInterval = null;
let confirmCallback = null;

/* ================= DISTANCE ================= */

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a =
    Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ/2) * Math.sin(Δλ/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/* ================= LOAD SITES ================= */

async function loadActiveSites() {
  const snapshot = await getDocs(collection(db, "sites"));
  const sites = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.active) {
      sites.push({
        id: docSnap.id,
        ...data
      });
    }
  });
  return sites;
}

async function detectSite(lat, lng) {
  const sites = await loadActiveSites();
  for (const site of sites) {
    const distance = getDistance(lat, lng, site.lat, site.lng);
    if (distance <= site.radius) return site;
  }
  return null;
}

/* ================= POPUP ================= */

function showPopup(message, isError = false) {
  const overlay = document.getElementById("customPopup");
  const box = overlay.querySelector(".popup-box");

  box.innerHTML = `
    <div class="popup-message" style="white-space:pre-line;">${message}</div>
    <button class="popup-btn" onclick="closePopup()">ตกลง</button>
  `;

  const btn = box.querySelector(".popup-btn");
  btn.style.background = isError
    ? "#dc2626"
    : getComputedStyle(document.documentElement)
        .getPropertyValue('--accent');

  overlay.style.display = "flex";
}

function showConfirm(message, onConfirm) {
  confirmCallback = onConfirm;

  const overlay = document.getElementById("customPopup");
  const box = overlay.querySelector(".popup-box");

  box.innerHTML = `
    <div class="popup-message">${message}</div>
    <div style="display:flex; gap:10px;">
      <button class="popup-btn" style="background:#e5e7eb;color:#111;" onclick="closePopup()">ยกเลิก</button>
      <button class="popup-btn" onclick="confirmAction()">ยืนยัน</button>
    </div>
  `;

  overlay.style.display = "flex";
}

window.confirmAction = async function () {
  closePopup();
  if (confirmCallback) await confirmCallback();
};

window.closePopup = function () {
  document.getElementById("customPopup").style.display = "none";
};

/* ================= LOGIN ================= */

window.login = async function () {
  const loginBtn = document.querySelector(".login-card .primary-btn");

  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showPopup("กรอกข้อมูลให้ครบ", true);
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerText = "Verifying...";

    await signInWithEmailAndPassword(auth, email, password);

  } catch (error) {
    showPopup("เข้าสู่ระบบไม่สำเร็จ", true);
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  }
};

/* ================= AUTH ================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
    return;
  }

  currentUserId = user.uid;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) {
    showPopup("ไม่มีสิทธิ์เข้าใช้งาน", true);
    return;
  }

  const userData = userSnap.data();

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";

  loadEmployeeCard(userData, user.uid);
  startClock();
  await restoreStateFromFirestore(user.uid);
});

/* ================= CARD ================= */

function loadEmployeeCard(data, uid) {
  const empId = data.employeeId || uid;

  document.getElementById("empName").innerText = data.name || "-";
  document.getElementById("empTitle").innerText = data.position || "POSITION";
  document.getElementById("empId").innerText = empId;

  if (window.JsBarcode) {
    JsBarcode("#barcode", empId, {
      format: "CODE128",
      width: 2,
      height: 60,
      lineColor: "#ffffff",
      background: "transparent",
      displayValue: false
    });
  }
}

/* ================= CLOCK ================= */

function startClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById("liveDate").innerText =
      now.toLocaleDateString("th-TH", { dateStyle: "full" });
    document.getElementById("liveTime").innerText =
      now.toLocaleTimeString("th-TH");
  }, 1000);
}

/* ================= FORMAT ================= */

function formatTime(ts) {
  return ts?.toDate().toLocaleTimeString("th-TH") || "-";
}

/* ================= STATE ================= */

function applyTheme(color) {
  document.documentElement.style.setProperty("--accent", color);
}

function setState(state) {
  clearInterval(countdownInterval);
  const btn = document.getElementById("actionBtn");
  currentState = state;

  switch (state) {
    case "checkin":
      applyTheme("#16a34a");
      btn.innerText = "เข้างาน";
      btn.disabled = false;
      break;

    case "countdown":
      applyTheme("#2563eb");
      btn.disabled = true;
      startCountdown();
      break;

    case "checkout":
      applyTheme("#f97316");
      btn.innerText = "เลิกงาน";
      btn.disabled = false;
      break;

    case "finished":
      applyTheme("#4f46e5");
      btn.innerText = "ขอบคุณสำหรับวันนี้";
      btn.disabled = true;
      break;

    case "locked":
      applyTheme("#1f2937");
      btn.innerText = "ปิดรับเข้างาน";
      btn.disabled = true;
      break;
  }
}

function startCountdown() {
  function update() {
    const now = new Date();
    const end = new Date();
    end.setHours(17, 0, 0, 0);
    const diff = end - now;

    if (diff <= 0) {
      setState("checkout");
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById("actionBtn").innerText =
      `เหลือเวลา ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}
