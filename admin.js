import { auth, db } from "./firebase.js";

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
