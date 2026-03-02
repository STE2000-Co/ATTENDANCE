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
  setDoc,
  updateDoc,
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
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= AUTH CHECK ================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
    window.location.href = "index.html";
    return;
  }

  loadSites();
});

/* ================= LOAD SITES ================= */

async function loadSites() {
  const container = document.getElementById("siteList");
  container.innerHTML = "";

  const snapshot = await getDocs(collection(db, "sites"));

const sites = [];

snapshot.forEach(docSnap => {
  sites.push({
    id: docSnap.id,
    ...docSnap.data()
  });
});

sites.sort((a, b) => b.isMain - a.isMain);

sites.forEach(data => {
  container.innerHTML += `
    <div class="site-card">
      <b>${data.id}</b>
      ${data.isMain ? '<span class="gold">MAIN</span>' : ''}
      <div>Lat: ${data.lat}</div>
      <div>Lng: ${data.lng}</div>
      <div>Radius: ${data.radius}</div>
      <div>Status: ${data.active ? 'Active' : 'Inactive'}</div>
    </div>
  `;
});
/* ================= ADD SITE ================= */

window.addSite = async function () {

  const name = document.getElementById("name").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const radius = parseFloat(document.getElementById("radius").value);
  const isMain = document.getElementById("isMain").checked;

  if (
  !name ||
  isNaN(lat) ||
  isNaN(lng) ||
  isNaN(radius)
  ) {
  alert("กรอกข้อมูลให้ครบและถูกต้อง");
  return;
  }

  if (isMain) {
    const snapshot = await getDocs(collection(db, "sites"));
    for (const docSnap of snapshot.docs) {
      if (docSnap.data().isMain) {
        await updateDoc(doc(db, "sites", docSnap.id), {
          isMain: false
        });
      }
    }
  }

  await setDoc(doc(db, "sites", name), {
    lat,
    lng,
    radius,
    active: true,
    isMain
  });
document.getElementById("name").value = "";
document.getElementById("lat").value = "";
document.getElementById("lng").value = "";
document.getElementById("radius").value = "";
document.getElementById("isMain").checked = false;
  loadSites();
};
}
