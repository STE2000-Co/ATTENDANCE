import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = { /* ใช้ config เดิม */ };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserData = null;

window.goBack = function() {
  window.location.href = "index.html";
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const userSnap = await fetchUser(uid);
  currentUserData = userSnap;

  document.getElementById("name").value = userSnap.name || "";
  document.getElementById("empId").value = userSnap.empId || "";
  document.getElementById("dept").value =
    userSnap.departmentTH || userSnap.department || "";
  document.getElementById("position").value =
    userSnap.positionTH || userSnap.position || "";

  loadLeaveHistory(uid);
});

async function fetchUser(uid) {
  const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.data();
}

const leaveTypeSelect = document.getElementById("leaveType");
leaveTypeSelect.addEventListener("change", () => {
  const value = leaveTypeSelect.value;
  const reasonContainer = document.getElementById("reasonContainer");

  if (value === "ลาฉุกเฉิน" || value === "อื่นๆ") {
    reasonContainer.style.display = "block";
  } else {
    reasonContainer.style.display = "none";
  }
});

function calculateDays() {
  const start = new Date(document.getElementById("startDate").value);
  const end = new Date(document.getElementById("endDate").value);

  if (!isNaN(start) && !isNaN(end)) {
    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    if (diff > 0) {
      document.getElementById("daysDisplay").innerText =
        "จำนวนวันลา: " + diff + " วัน";
      return diff;
    }
  }
  document.getElementById("daysDisplay").innerText = "";
  return 0;
}

document.getElementById("startDate").addEventListener("change", calculateDays);
document.getElementById("endDate").addEventListener("change", calculateDays);

window.submitLeave = async function() {
  const leaveType = document.getElementById("leaveType").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const reason = document.getElementById("reason").value;
  const days = calculateDays();

  if (!leaveType || !startDate || !endDate) {
    alert("กรอกข้อมูลให้ครบ");
    return;
  }

  await addDoc(collection(db, "leaveRequests"), {
    userId: auth.currentUser.uid,
    name: currentUserData.name,
    empId: currentUserData.empId,
    department: currentUserData.department,
    departmentTH: currentUserData.departmentTH || "",
    position: currentUserData.position,
    positionTH: currentUserData.positionTH || "",
    leaveType,
    startDate,
    endDate,
    days,
    reason: reason || "",
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("ส่งใบลาเรียบร้อย");
};

function loadLeaveHistory(uid) {
  const q = query(
    collection(db, "leaveRequests"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    const container = document.getElementById("leaveHistory");
    container.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();

      const card = document.createElement("div");
      card.className = "history-card";

      card.innerHTML = `
        <div><strong>${data.leaveType}</strong></div>
        <div>${data.startDate} - ${data.endDate}</div>
        <div>${data.days} วัน</div>
        <div class="status ${data.status}">
          สถานะ: ${translateStatus(data.status)}
        </div>
      `;

      container.appendChild(card);
    });
  });
}

function translateStatus(status) {
  if (status === "pending") return "รออนุมัติ";
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  return status;
}
