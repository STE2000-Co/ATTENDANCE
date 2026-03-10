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

leaveSnap.forEach(doc=>{
const d = doc.data();
if(d.status === "approved"){
leaveMap[d.userId+"_"+d.date] = true;
}
});

const table = document.getElementById("reportTable");
table.innerHTML="";

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

let status = "ปกติ";

if(leaveMap[userId+"_"+date]){
status = "ลา";
totalLeave++;
}

if(day.checkoutOutside){
status = "ออกนอกพื้นที่";
}

if(day.clockIn){
totalCheckin++;
}

const [y,m,d] = date.split("-");
const formattedDate = `${d}/${m}/${y}`;

rows += `
<tr>
<td>${formattedDate}</td>
<td>${checkIn}</td>
<td>${checkOut}</td>
<td>${day.siteName || "-"}</td>
<td>${status}</td>
</tr>
`;

}

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

document.getElementById("totalStaff").innerText = totalStaff;
document.getElementById("checkedIn").innerText = totalCheckin;
document.getElementById("absent").innerText = totalLeave;

};



/* ================= EXPORT EXCEL ================= */

window.exportExcel = async function(){

try{

const monthInput = document.getElementById("reportMonth").value;

if(!monthInput){
alert("เลือกเดือนก่อน");
return;
}

const [year,month] = monthInput.split("-");

/* โหลด template */

const res = await fetch("templateรายงานการเข้างานประจำเดือน.xlsx");
const buffer = await res.arrayBuffer();
const workbook = XLSX.read(buffer,{type:"array"});

const templateName = workbook.SheetNames[0];
const template = workbook.Sheets[templateName];
/* โหลดข้อมูล */

const attendanceSnap = await getDocs(collection(db,"attendance"));
const leaveSnap = await getDocs(collection(db,"leaveRequests"));

const leaveMap = {};

leaveSnap.forEach(doc=>{
const d = doc.data();
if(d.status === "approved"){
leaveMap[d.userId+"_"+d.date] = true;
}
});

/* สร้างช่วงวันที่ 25 → 24 */

const start = new Date(year,month-2,25);
const end = new Date(year,month-1,24);

const dates = [];

let cur = new Date(start);

while(cur<=end){
dates.push(new Date(cur));
cur.setDate(cur.getDate()+1);
}

for(const docSnap of attendanceSnap.docs){

const userId = docSnap.id;
const data = docSnap.data();
const days = data.days || {};

const userDoc = await getDoc(doc(db,"users",userId));
const name = userDoc.exists() ? userDoc.data().name : userId;
const employeeId = userDoc.exists() ? userDoc.data().employeeId : "-";

/* clone template (แก้ตรงนี้) */
const sheet = structuredClone(template);

let sheetName = name;
let count = 1;

while(workbook.SheetNames.includes(sheetName)){
sheetName = `${name}_${count}`;
count++;
}

workbook.SheetNames.push(sheetName);
workbook.Sheets[sheetName] = sheet;

/* header */

sheet["B2"] = {t:"s",v:employeeId};
sheet["B3"] = {t:"s",v:name};
sheet["B5"] = {t:"s",v:`${month}/${year}`};

let row = 8;

for(const dateObj of dates){

const y = dateObj.getFullYear();
const m = String(dateObj.getMonth()+1).padStart(2,"0");
const d = String(dateObj.getDate()).padStart(2,"0");

const firestoreDate = `${y}-${m}-${d}`;
const excelDate = `${d}/${m}/${y}`;

const day = days[firestoreDate];

let clockIn="-";
let clockOut="-";
let siteIn="-";
let siteOut="-";
let ot="-";
let status="-";

const dayOfWeek = dateObj.getDay();

/* ลา */

if(leaveMap[userId+"_"+firestoreDate]){
status="ลา";
}

/* อาทิตย์ */

else if(dayOfWeek===0){
status="วันหยุด";
}

/* มี attendance */

else if(day){

if(day.clockIn){
clockIn=new Date(day.clockIn.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}

if(day.clockOut){
clockOut=new Date(day.clockOut.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}

siteIn=day.siteName || "-";

siteOut=day.checkoutOutside ? "นอกพื้นที่" : day.siteName || "-";

/* สาย */

let late=false;

if(clockIn!=="-" && clockIn>"08:00"){
late=true;
}

/* OT */

if(clockOut!=="-"){

const [h,m]=clockOut.split(":").map(Number);
const minutes=h*60+m;

let base=1080;

if(dayOfWeek===0){
base=480;
}

const diff=minutes-base;

if(diff>0){

const oh=Math.floor(diff/60);
const om=diff%60;

ot=`${oh}:${String(om).padStart(2,"0")}`;

}

}

/* status */

if(late && ot!=="-") status="สาย,OT";
else if(late) status="สาย";
else if(ot!=="-") status="OT";
else status="ปกติ";

}

/* ใส่ข้อมูล */

sheet[`A${row}`]={t:"s",v:excelDate};
sheet[`B${row}`]={t:"s",v:clockIn};
sheet[`C${row}`]={t:"s",v:clockOut};
sheet[`D${row}`]={t:"s",v:siteIn};
sheet[`E${row}`]={t:"s",v:siteOut};
sheet[`F${row}`]={t:"s",v:ot};
sheet[`G${row}`]={t:"s",v:status};

row++;

}

}

/* ลบ template */

delete workbook.Sheets[templateName];
workbook.SheetNames = workbook.SheetNames.filter(s=>s!==templateName);

/* export */

XLSX.writeFile(workbook,`attendance_${month}_${year}.xlsx`);

}catch(err){

console.error(err);
alert("Export ไม่สำเร็จ");

}

};
