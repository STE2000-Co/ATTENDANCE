import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

let monthlyData = [];

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  const now = new Date();
  const defaultMonth = now.toISOString().slice(0, 7);
  document.getElementById("monthPicker").value = defaultMonth;

  loadMonthly(defaultMonth);
});

window.refreshData = function () {
  const month = document.getElementById("monthPicker").value;
  if (!month) return;
  loadMonthly(month);
};

/* ================= FORMAT MONTH HEADER ================= */

function formatThaiMonth(monthStr) {
  const [year, month] = monthStr.split("-");
  const date = new Date(year, month - 1);

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long"
  });
}

/* ================= FORMAT DATE (DD/MM/YYYY พ.ศ.) ================= */

function formatThaiDate(dateStr) {
  const date = new Date(dateStr);

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear() + 543;

  return `${day}/${month}/${year}`;
}

/* ================= LOAD MONTHLY ================= */

async function loadMonthly(month) {

  document.getElementById("monthTitle").innerText =
    formatThaiMonth(month);

  const snapshot = await getDocs(collection(db, "attendance"));
  monthlyData = [];

  snapshot.forEach(docSnap => {

    const data = docSnap.data();
    const days = data.days || {};

    const userBlock = {
      name: data.name || "-",
      days: []
    };

    Object.keys(days).forEach(date => {

      if (date.startsWith(month)) {

        const d = days[date];

        userBlock.days.push({
          date,
          clockIn: d.clockIn ? d.clockIn.toDate() : null,
          clockOut: d.clockOut ? d.clockOut.toDate() : null,
          siteName: d.siteName || "-"
        });
      }

    });

    if (userBlock.days.length > 0) {
      userBlock.days.sort((a,b) => new Date(a.date) - new Date(b.date));
      monthlyData.push(userBlock);
    }

  });

  render();
}

/* ================= FORMAT TIME ================= */

function formatTime(date) {
  if (!date) return "-";
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ================= RENDER ================= */

function render() {

  const container = document.getElementById("reportContainer");
  container.innerHTML = "";

  monthlyData.forEach(user => {

    let rows = "";

    user.days.forEach(d => {

      rows += `
        <tr>
          <td class="date-cell" style="white-space:nowrap;">
            ${formatThaiDate(d.date)}
          </td>
          <td class="time-in">${formatTime(d.clockIn)}</td>
          <td class="time-out">${formatTime(d.clockOut)}</td>
          <td class="site-name">${d.siteName}</td>
        </tr>
      `;
    });

    container.innerHTML += `
      <div class="user-card">
        <div class="user-header">
          <div class="user-name">${user.name}</div>
        </div>
        <div class="user-body">
          <table class="attendance-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เวลาเข้า</th>
                <th>เวลาออก</th>
                <th>สถานที่</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

}
