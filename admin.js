import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  // ใช้ config เดิมของคุณ
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists() || snap.data().role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("adminName").innerText =
    "Welcome, " + (snap.data().name || user.email);
});

window.logout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

window.goSites = function () {
  window.location.href = "sites.html";
};

window.goReports = function () {
  window.location.href = "reports.html";
};
