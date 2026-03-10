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


/* FORMAT DATE */

function formatThaiDate(dateObj){

const d=String(dateObj.getDate()).padStart(2,"0");
const m=String(dateObj.getMonth()+1).padStart(2,"0");
const y=dateObj.getFullYear();

return `${d}/${m}/${y}`;

}


/* DISTANCE CALC (Haversine) */

function distance(lat1,lon1,lat2,lon2){

const R=6371000;

const dLat=(lat2-lat1)*Math.PI/180;
const dLon=(lon2-lon1)*Math.PI/180;

const a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*
Math.sin(dLon/2);

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return R*c;

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
const siteSnap=await getDocs(collection(db,"sites"));
const holidaySnap=await getDocs(collection(db,"holidays"));

/* USERS */

const users={};

usersSnap.forEach(doc=>{
users[doc.id]=doc.data();
});


/* LEAVE */

const leaveMap={};

leaveSnap.forEach(doc=>{

const d=doc.data();

if(d.status==="approved"){
leaveMap[d.userId+"_"+d.date]=true;
}

});


/* SITES */

const sites=[];

siteSnap.forEach(doc=>{
sites.push(doc.data());
});


/* HOLIDAYS */

const holidays={};

holidaySnap.forEach(doc=>{
holidays[doc.id]=doc.data();
});


reportData=[];

const tbody=document.getElementById("reportTableBody");

tbody.innerHTML="";


attendanceSnap.forEach(docSnap=>{

const userId=docSnap.id;
const data=docSnap.data();
const days=data.days||{};
const name=users[userId]?.name||userId;

const group="user_"+userId;


/* SUMMARY */

let workDays=0;
let lateDays=0;
let leaveDays=0;
let holidayDays=0;
let otDays=0;
let otMinutesTotal=0;


/* USER HEADER */

const header=document.createElement("tr");
header.className="userHeader";
header.dataset.group=group;

header.innerHTML=`<td colspan="7">▶ 👤 ${name}</td>`;

tbody.appendChild(header);


/* TOGGLE */

header.addEventListener("click",()=>{

const rows=document.querySelectorAll(`.row-${group}`);

rows.forEach(r=>{
r.classList.toggle("hiddenRow");
});

});


/* SUB HEADER */

const subHeader=document.createElement("tr");

subHeader.className=`subHeader row-${group} hiddenRow`;

subHeader.innerHTML=`

<td>วันที่</td>
<td>เข้า</td>
<td>ออก</td>
<td>สถานที่เข้า</td>
<td>สถานที่ออก</td>
<td>OT</td>
<td>สถานะ</td>

`;

tbody.appendChild(subHeader);


/* LOOP DAYS */

dates.forEach(dateObj=>{

const y=dateObj.getFullYear();
const m=String(dateObj.getMonth()+1).padStart(2,"0");
const d=String(dateObj.getDate()).padStart(2,"0");

const date=`${y}-${m}-${d}`;
const displayDate=formatThaiDate(dateObj);

const day=days[date];

let clockIn="-";
let clockOut="-";
let siteIn="-";
let siteOut="-";
let ot="-";
let status="-";

const dayOfWeek=dateObj.getDay();


/* LEAVE */

if(leaveMap[userId+"_"+date]){

status="ลา";
leaveDays++;

}

/* HOLIDAY */

else if(holidays[date] || dayOfWeek===0){

status="วันหยุด";
holidayDays++;

}

/* WORK DAY */

else if(day){

workDays++;

if(day.clockIn){

clockIn=new Date(day.clockIn.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

}

if(day.clockOut){

clockOut=new Date(day.clockOut.seconds*1000)
.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

}


/* SITE IN */

siteIn=day.siteName ?? "-";


/* SITE OUT */

if(day.locationOut){

let nearest=null;
let nearestDist=999999;

sites.forEach(site=>{

const dist=distance(
day.locationOut.lat,
day.locationOut.lng,
site.lat,
site.lng
);

if(dist<nearestDist){
nearestDist=dist;
nearest=site;
}

});

if(nearest){

if(nearestDist<=nearest.radius){

siteOut=nearest.name;

}else{

const km=(nearestDist/1000).toFixed(2);

siteOut=`นอกพื้นที่ ${km} กม.`;

}

}

}


/* LATE */

let late=false;

if(clockIn!=="-" && clockIn>"08:00"){
late=true;
lateDays++;
}


/* OT */

if(clockOut!=="-"){

const [h,m]=clockOut.split(":").map(Number);
const minutes=h*60+m;

const diff=minutes-1080;

if(diff>0){

otDays++;

const oh=Math.floor(diff/60);
const om=diff%60;

otMinutesTotal+=diff;

ot=`${oh}:${String(om).padStart(2,"0")}`;

}

}


/* STATUS */

if(late && ot!=="-") status="สาย + OT";
else if(late) status="สาย";
else if(ot!=="-") status="OT";
else status="ปกติ";

}


/* SAVE REPORT */

reportData.push({
name,
date:displayDate,
clockIn,
clockOut,
siteIn,
siteOut,
ot,
status
});


/* TABLE ROW */

const tr=document.createElement("tr");

tr.className=`row-${group} hiddenRow`;

tr.innerHTML=`

<td>${displayDate}</td>
<td>${clockIn}</td>
<td>${clockOut}</td>
<td>${siteIn}</td>
<td>${siteOut}</td>
<td>${ot}</td>
<td>${status}</td>

`;

tbody.appendChild(tr);

});


/* SUMMARY ROW */

const otHour=Math.floor(otMinutesTotal/60);
const otMin=otMinutesTotal%60;

const summary=document.createElement("tr");

summary.className=`row-${group} hiddenRow summaryRow`;

summary.innerHTML=`

<td colspan="7">

สรุปเดือนนี้ :
มาทำงาน ${workDays} วัน |
มาสาย ${lateDays} วัน |
ลา ${leaveDays} วัน |
วันหยุด ${holidayDays} วัน |
วัน OT ${otDays} วัน |
OT รวม ${otHour}:${String(otMin).padStart(2,"0")}

</td>

`;

tbody.appendChild(summary);

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
newSheet[`D${row}`]={t:"s",v:d.siteIn};
newSheet[`E${row}`]={t:"s",v:d.siteOut};
newSheet[`F${row}`]={t:"s",v:d.ot};
newSheet[`G${row}`]={t:"s",v:d.status};

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
