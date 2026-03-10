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

const firebaseConfig = {
  apiKey: "AIzaSyBIgAvKSmqBGzKWvnb0FgxOPVrDHp8TDaA",
  authDomain: "system-base-8b777.firebaseapp.com",
  projectId: "system-base-8b777",
  storageBucket: "system-base-8b777.firebasestorage.app",
  messagingSenderId: "749702522934",
  appId: "1:749702522934:web:5664ccfd9d04ae88985097"
};

/* ================= DEVICE ID ================= */

function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentState = "checkin";
let currentUserId = null;
let countdownInterval = null;
let confirmCallback = null;

function resetLoginButton() {
  const loginBtn = document.querySelector(".login-card .primary-btn");
  if (!loginBtn) return;

  loginBtn.disabled = false;
  loginBtn.innerText = "Login";
}

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

  const loginSection = document.getElementById("loginSection");
  const appSection = document.getElementById("appSection");

  if (!user) {
    loginSection.classList.add("active");
    appSection.classList.remove("active");

    document.body.classList.remove("loading");
    return;
  }

  currentUserId = user.uid;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    showPopup("ไม่มีสิทธิ์เข้าใช้งาน", true);

    resetLoginButton();

    await auth.signOut();
    document.body.classList.remove("loading");
    return;
  }

  const userData = userSnap.data();
  const currentDeviceId = getDeviceId();

  if (userData.role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  if (!userData.deviceId) {
    await updateDoc(userRef, {
      deviceId: currentDeviceId
    });
  } else if (userData.deviceId !== currentDeviceId) {

    showPopup("บัญชีนี้ถูกใช้งานบนอุปกรณ์อื่น", true);

    resetLoginButton();

    await auth.signOut();
    document.body.classList.remove("loading");
    return;
  }

  loginSection.classList.remove("active");
  appSection.classList.add("active");

  document.body.classList.remove("loading");

  loadEmployeeCard(userData, user.uid);
  startClock();
  await restoreStateFromFirestore(user.uid);
});

/* ================= CARD ================= */

function loadEmployeeCard(data, uid) {

  const empId = data.employeeId || uid;

  document.getElementById("empName").innerText =
    data.name || "-";
  document.getElementById("empId").innerText =
    empId  || "-";
  document.getElementById("empPosition").innerText =
    data.position || "-";

  document.getElementById("empDept").innerText =
    data.department || "-";

  document.getElementById("empIssued").innerText =
    data.issueDate || "-";

  if (window.JsBarcode) {
    JsBarcode("#barcode", empId, {
      format: "CODE128",
      width: 3,
      height: 50,
      displayValue: false,
      lineColor: "#ffffff",
      background: "transparent",
      margin: 0,
      marginLeft: 0,
      marginRight: 0
    });
  }
}

/* ================= CLOCK ================= */

function startClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById("liveDate").innerText =
      now.toLocaleDateString("th-TH", { dateStyle: "full" });
  }, 1000);
}

/* ================= TIME FORMAT ================= */

function formatTime(ts) {
  return ts?.toDate().toLocaleTimeString("th-TH") || "-";
}

/* ================= STATE MACHINE ================= */

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

/* ================= RESTORE ================= */

async function getTodaySummary(uid) {
  const today = new Date().toISOString().split("T")[0];
  const snap = await getDoc(doc(db, "attendance", uid));
  if (!snap.exists()) return null;
  return snap.data().days?.[today] || null;
}

async function restoreStateFromFirestore(uid) {
  const now = new Date();
  const hour = now.getHours();
  const todayData = await getTodaySummary(uid);

  if (!todayData) return evaluateNewDay(hour);

  if (todayData.clockIn && !todayData.clockOut) {
    if (hour >= 17) setState("checkout");
    else setState("countdown");
    return;
  }

  if (todayData.clockOut) {
    setState("finished");
    return;
  }

  evaluateNewDay(hour);
}

function evaluateNewDay(hour) {
  if (hour >= 6 && hour < 17) setState("checkin");
  else setState("locked");
}

/* ================= BUTTON ================= */

window.actionHandler = async function () {

  const btn = document.getElementById("actionBtn");

  if (currentState === "checkin") {
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    const result = await processAttendance(true);

    if (!result) return;

    const todayData = await getTodaySummary(currentUserId);

    showPopup(
      `บันทึกเวลาเข้างานสำเร็จ\n\n` +
      `สถานที่: ${todayData?.siteIn || "-"}\n` +
      `เข้างานเวลา: ${formatTime(todayData?.clockIn)}`
    );
    return;
  }

  if (currentState === "checkout") {
    showConfirm("คุณแน่ใจหรือไม่ว่าต้องการเลิกงาน?", async () => {

      btn.disabled = true;
      btn.innerText = "กำลังบันทึก...";

      const result = await processAttendance(false);
      if (!result) return;

      const todayData = await getTodaySummary(currentUserId);

      showPopup(
        `บันทึกเวลาเลิกงานสำเร็จ\n\n` +
        `ไซต์งาน: ${todayData?.siteOut || todayData?.siteIn || "-"}\n` +
        `เลิกงานเวลา: ${formatTime(todayData?.clockOut)}\n` +
        `${todayData?.checkoutOutside ? "(นอกพื้นที่ทำงาน)" : "(ภายในพื้นที่ทำงาน)"}`
      );
    });
  }
};

/* ================= MULTI-SITE ATTENDANCE ================= */

async function processAttendance(isCheckin) {

  let coords;

  try {
    coords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(err)
      );
    });
  } catch {
    showPopup("กรุณาเปิด GPS ก่อนทำรายการ", true);
    setState(currentState);
    return false;
  }

  const lat = coords.latitude;
  const lng = coords.longitude;
  const user = auth.currentUser;
  const today = new Date().toISOString().split("T")[0];
  const attendanceRef = doc(db, "attendance", user.uid);
  const snap = await getDoc(attendanceRef);

  if (isCheckin) {

    const site = await detectSite(lat, lng);
    if (!site) {
      showPopup("คุณไม่ได้อยู่ในไซต์งานที่อนุญาต", true);
      setState(currentState);
      return false;
    }

    const payload = {
      clockIn: serverTimestamp(),
      locationIn: { lat, lng },
      siteIn: site.id,
      siteOut: null,
      clockOut: null,
      locationOut: null,
      checkoutOutside: false
    };

    if (!snap.exists()) {
      await setDoc(attendanceRef, {
        name: (await getDoc(doc(db,"users",user.uid))).data().name,
        days: { [today]: payload }
      });
    } else {
      await updateDoc(attendanceRef, {
        [`days.${today}`]: payload
      });
    }

  } else {

    const todayData = snap.data().days?.[today];
    const siteSnap = await getDoc(doc(db, "sites", todayData.siteIn));
    const site = siteSnap.data();

    const distance = getDistance(lat, lng, site.lat, site.lng);
    const outside = distance > site.radius;

    const detected = await detectSite(lat, lng);

    await updateDoc(attendanceRef, {
      [`days.${today}.clockOut`]: serverTimestamp(),
      [`days.${today}.locationOut`]: { lat, lng },
      [`days.${today}.siteOut`]: detected ? detected.id : todayData.siteIn,
      [`days.${today}.checkoutOutside`]: outside
    });
  }

  await restoreStateFromFirestore(currentUserId);
  return true;
}

// ===== PWA Keyboard Fix (iOS) =====

const loginSection = document.getElementById("loginSection");
const inputs = document.querySelectorAll("#loginSection input");

inputs.forEach(input => {
  input.addEventListener("focus", () => {
    loginSection.style.alignItems = "flex-start";
    loginSection.style.paddingTop = "80px"; 
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      loginSection.style.alignItems = "center";
      loginSection.style.paddingTop = "0px";
    }, 150); // รอ keyboard ปิดก่อนค่อยคืนตำแหน่ง
  });
});
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");

  if (!sessionStorage.getItem("appLoaded")) {
    sessionStorage.setItem("appLoaded", "true");

    setTimeout(() => {
      splash.classList.add("hide");
    }, 2000);
  }
});
window.goLeave = function () {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.25s ease";

  setTimeout(() => {
    window.location.href = "leave.html";
  }, 1000);
};
