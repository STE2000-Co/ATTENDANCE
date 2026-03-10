import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
getFirestore,
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
getAuth,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


/* FIREBASE */

const firebaseConfig = {

apiKey:"AIzaSyBIgAvKSmqBGzKWvnb0FgxOPVrDHp8TDaA",
authDomain:"system-base-8b777.firebaseapp.com",
projectId:"system-base-8b777",
storageBucket:"system-base-8b777.appspot.com",
messagingSenderId:"749702522934",
appId:"1:749702522934:web:5664ccfd9d04ae88985097"

};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let reportData=[];


/* AUTH */

onAuthStateChanged(auth,(user)=>{

if(!user){

alert("กรุณาเข้าสู่ระบบ");
window.location.href="index.html";

}

});


/* DATE RANGE 25 → 24 */

function getPeriod(year,month){

const start=new Date(year,month-2,25);
const end=new Date(year,month-1,24);

const dates=[];

let cur=new Date(start);

while(cur<=end){

dates.push(new Date(cur));
cur.setDate(cur.getDate()+1);

}

return dates;

}


/* FORMAT DATE DD/MM/YYYY */

function formatThaiDate(dateObj){

const d=String(dateObj.getDate()).padStart(2,"0");
const m=String(dateObj.getMonth()+1).padStart(2,"0");
const y=dateObj.getFullYear();

return `${d}/${m}/${y}`;

}


/* LOAD DATA */

async function loadReport(){

const monthInput=document.getElementById("reportMonth").value;

if(!monthInput){

alert("เลือกเดือนก่อน");
return;

}

const [year,month]=monthInput.split("-");

const dates=getPeriod(Number(year),Number(month));

const attendanceSnap=await getDocs(collection(db,"attendance"));
const usersSnap=await getDocs(collection(db,"users"));
const leaveSnap=await getDocs(collection(db,"leaveRequests"));

const users={};

usersSnap.forEach(doc=>{
users[doc.id]=doc.data();
});

const leaveMap={};

leaveSnap.forEach(doc=>{

const d=doc.data();

if(d.status==="approved"){
leaveMap[d.userId+"_"+d.date]=true;
}

});

reportData=[];

const tbody=document.getElementById("reportTableBody");

tbody.innerHTML="";


attendanceSnap.forEach(docSnap=>{

const userId=docSnap.id;
const data=docSnap.data();
const days=data.days||{};
const name=users[userId]?.name||userId;


/* ===== USER HEADER ===== */

const header=document.createElement("tr");
header.className="userHeader";

header.innerHTML=`
<td colspan="6">👤 ${name}</td>
`;

tbody.appendChild(header);


/* ===== SUB HEADER ===== */

const subHeader=document.createElement("tr");

subHeader.className="subHeader";

subHeader.innerHTML=`

<td>วันที่</td>
<td>เข้า</td>
<td>ออก</td>
<td>สถานที่</td>
<td>OT</td>
<td>สถานะ</td>

`;

tbody.appendChild(subHeader);


/* ===== LOOP DATES ===== */

dates.forEach(dateObj=>{

const y=dateObj.getFullYear();
const m=String(dateObj.getMonth()+1).padStart(2,"0");
const d=String(dateObj.getDate()).padStart(2,"0");

const date=`${y}-${m}-${d}`;
const displayDate=formatThaiDate(dateObj);

const day=days[date];

let clockIn="-";
let clockOut="-";
let site="-";
let ot="-";
let status="-";

const dayOfWeek=dateObj.getDay();


if(leaveMap[userId+"_"+date]){

status="ลา";

}

else if(dayOfWeek===0){

status="วันหยุด";

}

else if(day){

if(day.clockIn){

clockIn=new Date(day.clockIn.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

}

if(day.clockOut){

clockOut=new Date(day.clockOut.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

}

site=day.siteName||"-";


let late=false;

if(clockIn!=="-" && clockIn>"08:00"){
late=true;
}

if(clockOut!=="-"){

const [h,m]=clockOut.split(":").map(Number);
const minutes=h*60+m;
const diff=minutes-1080;

if(diff>0){

const oh=Math.floor(diff/60);
const om=diff%60;

ot=`${oh}:${String(om).padStart(2,"0")}`;

}

}

if(late && ot!=="-") status="สาย + OT";
else if(late) status="สาย";
else if(ot!=="-") status="OT";
else status="ปกติ";

}


/* ===== STORE DATA ===== */

const row={
name,
date:displayDate,
clockIn,
clockOut,
site,
ot,
status
};

reportData.push(row);


/* ===== TABLE ROW ===== */

const tr=document.createElement("tr");

tr.innerHTML=`

<td>${displayDate}</td>
<td>${clockIn}</td>
<td>${clockOut}</td>
<td>${site}</td>
<td>${ot}</td>
<td>${status}</td>

`;

tbody.appendChild(tr);

});

});

}


/* EXPORT */

async function exportExcel(){

if(reportData.length===0){

alert("โหลดข้อมูลก่อน");
return;

}

const res=await fetch("templateรายงานการเข้างานประจำเดือน.xlsx");

const buffer=await res.arrayBuffer();

const workbook=XLSX.read(buffer,{type:"array"});

const templateName=workbook.SheetNames[0];
const template=workbook.Sheets[templateName];

const users={};

reportData.forEach(r=>{

if(!users[r.name]) users[r.name]=[];
users[r.name].push(r);

});

for(const name in users){

const sheet=XLSX.utils.sheet_to_json(template,{header:1});
const newSheet=XLSX.utils.aoa_to_sheet(sheet);

let row=7;

users[name].forEach(d=>{

newSheet[`A${row}`]={t:"s",v:d.date};
newSheet[`B${row}`]={t:"s",v:d.clockIn};
newSheet[`C${row}`]={t:"s",v:d.clockOut};
newSheet[`D${row}`]={t:"s",v:d.site};
newSheet[`E${row}`]={t:"s",v:d.ot};
newSheet[`F${row}`]={t:"s",v:d.status};

row++;

});

workbook.SheetNames.push(name);
workbook.Sheets[name]=newSheet;

}

delete workbook.Sheets[templateName];

workbook.SheetNames=
workbook.SheetNames.filter(s=>s!==templateName);

XLSX.writeFile(workbook,"attendance_report.xlsx");

}


/* BUTTON */

document.getElementById("loadBtn")
.addEventListener("click",loadReport);

document.getElementById("exportBtn")
.addEventListener("click",exportExcel);
