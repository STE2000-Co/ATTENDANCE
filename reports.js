import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
getFirestore,
collection,
getDocs,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
getAuth,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


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

onAuthStateChanged(auth, async (user)=>{

if(!user){
alert("กรุณาเข้าสู่ระบบก่อน");
window.location.href="index.html";
return;
}

const userSnap = await getDoc(doc(db,"users",user.uid));

if(!userSnap.exists() || userSnap.data().role !== "admin"){
alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
window.location.href="index.html";
return;
}

});


/* ================= LOAD REPORT ================= */

window.loadReport = async function(){

const monthInput = document.getElementById("reportMonth").value;

if(!monthInput){
alert("เลือกเดือน");
return;
}

const [year,month] = monthInput.split("-");

const attendanceSnap = await getDocs(collection(db,"attendance"));
const leaveSnap = await getDocs(collection(db,"leaveRequests"));

const leaveMap = {};

/* เก็บข้อมูลการลาที่อนุมัติแล้ว */

leaveSnap.forEach(doc=>{
const d = doc.data();

if(d.status === "approved"){
leaveMap[d.userId+"_"+d.date] = true;
}
});

const table = document.getElementById("reportTable");
table.innerHTML="";

/* ตัวแปรสรุป */

let totalStaff = 0;
let totalCheckin = 0;
let totalLeave = 0;

for(const docSnap of attendanceSnap.docs){

const userId = docSnap.id;
const data = docSnap.data();
const days = data.days || {};

const userDoc = await getDoc(doc(db,"users",userId));
const name = userDoc.exists() ? userDoc.data().name : userId;

let rows = "";

for(const date in days){

if(!date.startsWith(`${year}-${month}`)) continue;

const day = days[date];

const checkIn = day.clockIn
? new Date(day.clockIn.seconds*1000).toLocaleTimeString()
: "-";

const checkOut = day.clockOut
? new Date(day.clockOut.seconds*1000).toLocaleTimeString()
: "-";

/* เช็คสถานะ */

let status = "ปกติ";

if(leaveMap[userId+"_"+date]){
status = "ลา";
totalLeave++;
}

if(day.checkoutOutside){
status = "ออกนอกพื้นที่";
}

/* นับการเข้างาน */

if(day.clockIn){
totalCheckin++;
}
const [y, m, d] = date.split("-");
const formattedDate = `${d}/${m}/${y}`;
rows += `
<tr>
<td>${date}</td>
<td>${checkIn}</td>
<td>${checkOut}</td>
<td>${day.siteName || "-"}</td>
<td>${status}</td>
</tr>
`;

}

/* ถ้ามีพนักงานในเดือนนี้ */

if(rows){

totalStaff++;

table.innerHTML += `
<tr class="userHeader">
<td colspan="5">${name}</td>
</tr>
${rows}
`;

}

}

/* แสดงสรุปด้านบน */

document.getElementById("totalStaff").innerText = totalStaff;
document.getElementById("checkedIn").innerText = totalCheckin;
document.getElementById("absent").innerText = totalLeave;

window.exportExcel = async function(){

  try{

    // โหลด template
    const response = await fetch("templateรายงานการเข้างานประจำเดือน.xlsx");
    const arrayBuffer = await response.arrayBuffer();

    // อ่านไฟล์ excel
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // ดาวน์โหลดไฟล์
    XLSX.writeFile(workbook, "attendance_report.xlsx");

  }catch(err){
    console.error(err);
    alert("Export ไม่สำเร็จ");
  }

};
};
