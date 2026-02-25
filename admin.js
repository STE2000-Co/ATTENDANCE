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
  snap.data().name || user.email;
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
