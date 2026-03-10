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


/* DATE RANGE */

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


/* DISTANCE */

function distance(lat1,lon1,lat2,lon2){

const R=6371000;

const dLat=(lat2-lat1)*Math.PI/180;
const dLon=(lon2-lon1)*Math.PI/180;

const a=
Math.sin(dLat/2)**2+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)**2;

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return R*c;

}


/* FIND SITE */

function findSite(lat,lng,sites){

if(!lat || !lng) return "-";

let insideSite=null;
let nearest=null;
let nearestDist=999999;

sites.forEach(site=>{

const siteLat=Number(site.lat ?? site.latitude);
const siteLng=Number(site.lng ?? site.longitude);

if(!siteLat || !siteLng) return;

const dist=distance(lat,lng,siteLat,siteLng);

const radius=Number(site.radius)||0;

const siteName=site.name ?? site.siteName ?? "-";

if(dist<=radius){
insideSite=siteName;
}

if(dist<nearestDist){
nearestDist=dist;
nearest=siteName;
}

});

if(insideSite){
return insideSite;
}

if(nearest){
const km=(nearestDist/1000).toFixed(2);
return `นอกพื้นที่ ${km} กม. (${nearest})`;
}

return "-";

}


/* TIME FORMAT */

function getTime(ts){

if(!ts) return "-";

try{

const date = ts.seconds
? new Date(ts.seconds*1000)
: new Date(ts);

return date.toLocaleTimeString([],{
hour:"2-digit",
minute:"2-digit"
});

}catch{

return "-";

}

}


/* LOAD REPORT */

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


/* HEADER */

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


/* WORK */

else if(day){

workDays++;

clockIn=getTime(day.clockIn);
clockOut=getTime(day.clockOut);


/* SITE IN */

if(day.locationIn){

const lat=day.locationIn.lat ?? day.locationIn.latitude;
const lng=day.locationIn.lng ?? day.locationIn.longitude;

siteIn=findSite(lat,lng,sites);

}


/* SITE OUT */

if(day.locationOut){

const lat=day.locationOut.lat ?? day.locationOut.latitude;
const lng=day.locationOut.lng ?? day.locationOut.longitude;

siteOut=findSite(lat,lng,sites);

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


/* SAVE */

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


/* TABLE */

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


/* SUMMARY */

const otHour=Math.floor(otMinutesTotal/60);
const otMin=otMinutesTotal%60;

const summary=document.createElement("tr");

summary.className=`row-${group} hiddenRow summaryRow`;

summary.innerHTML=`

<td colspan="7">

<div class="summaryBox">

<div class="summaryTitle">
📊 สรุปการทำงานเดือนนี้
</div>

<div class="summaryGrid">

<div class="sumItem">
<div class="sumNumber">${workDays}</div>
<div class="sumLabel">วันทำงาน</div>
</div>

<div class="sumItem">
<div class="sumNumber late">${lateDays}</div>
<div class="sumLabel">มาสาย</div>
</div>

<div class="sumItem">
<div class="sumNumber leave">${leaveDays}</div>
<div class="sumLabel">ลางาน</div>
</div>

<div class="sumItem">
<div class="sumNumber holiday">${holidayDays}</div>
<div class="sumLabel">วันหยุด</div>
</div>

<div class="sumItem">
<div class="sumNumber ot">${otDays}</div>
<div class="sumLabel">วัน OT</div>
</div>

<div class="sumItem">
<div class="sumNumber ot">${otHour}:${String(otMin).padStart(2,"0")}</div>
<div class="sumLabel">OT รวม</div>
</div>

</div>

</div>

</td>

`;

tbody.appendChild(summary);

});

}


/* EXPORT */

function exportExcel(){

let csv="ชื่อ,วันที่,เข้า,ออก,สถานที่เข้า,สถานที่ออก,OT,สถานะ\n";

reportData.forEach(r=>{
csv+=`${r.name},${r.date},${r.clockIn},${r.clockOut},${r.siteIn},${r.siteOut},${r.ot},${r.status}\n`;
});

const blob=new Blob([csv],{type:"text/csv"});
const url=URL.createObjectURL(blob);

const a=document.createElement("a");
a.href=url;
a.download="report.csv";
a.click();

}


/* BUTTON */

document.getElementById("loadBtn")
.addEventListener("click",loadReport);

document.getElementById("exportBtn")
.addEventListener("click",exportExcel);
