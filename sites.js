import { auth, db } from "./firebase.js";

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

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    container.innerHTML += `
      <div class="site-card">
        <b>${docSnap.id}</b>
        ${data.isMain ? '<span class="gold">MAIN</span>' : ''}
        <div>Lat: ${data.lat}</div>
        <div>Lng: ${data.lng}</div>
        <div>Radius: ${data.radius}</div>
        <div>Status: ${data.active ? 'Active' : 'Inactive'}</div>
      </div>
    `;
  });
}

/* ================= ADD SITE ================= */

window.addSite = async function () {

  const name = document.getElementById("name").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const radius = parseFloat(document.getElementById("radius").value);
  const isMain = document.getElementById("isMain").checked;

  if (!name || !lat || !lng || !radius) {
    alert("กรอกข้อมูลให้ครบ");
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

  loadSites();
};
