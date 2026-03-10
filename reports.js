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


/* ================= HELPER ================= */

function setCell(sheet,cell,value){

if(!sheet[cell]){
sheet[cell]={t:"s",v:value};
}else{
sheet[cell].v=value;
}

}


/* ================= EXPORT EXCEL ================= */

async function exportExcel(){

try{

const monthInput=document.getElementById("reportMonth").value;

if(!monthInput){
alert("เลือกเดือนก่อน");
return;
}

const [year,month]=monthInput.split("-");


/* โหลด template */

const res=await fetch("templateรายงานการเข้างานประจำเดือน.xlsx");
const buffer=await res.arrayBuffer();

const workbook=XLSX.read(buffer,{type:"array"});

const templateName=workbook.SheetNames[0];
const template=workbook.Sheets[templateName];


/* โหลดข้อมูล */

const attendanceSnap=await getDocs(collection(db,"attendance"));
const leaveSnap=await getDocs(collection(db,"leaveRequests"));

const leaveMap={};

leaveSnap.forEach(doc=>{
const d=doc.data();

if(d.status==="approved"){
leaveMap[d.userId+"_"+d.date]=true;
}
});


/* สร้างช่วงวันที่ 25 → 24 */

const start=new Date(year,month-2,25);
const end=new Date(year,month-1,24);

const dates=[];
let cur=new Date(start);

while(cur<=end){
dates.push(new Date(cur));
cur.setDate(cur.getDate()+1);
}


/* สร้าง sheet */

for(const docSnap of attendanceSnap.docs){

const userId=docSnap.id;
const data=docSnap.data();
const days=data.days||{};

const userDoc=await getDoc(doc(db,"users",userId));

const name=userDoc.exists()?userDoc.data().name:userId;
const employeeId=userDoc.exists()?userDoc.data().employeeId:"-";


/* clone template */

const sheet=XLSX.utils.sheet_to_json(template,{header:1});
const newSheet=XLSX.utils.aoa_to_sheet(sheet);


/* copy merges */

if(template["!merges"]){
newSheet["!merges"]=JSON.parse(JSON.stringify(template["!merges"]));
}


/* copy column width */

if(template["!cols"]){
newSheet["!cols"]=JSON.parse(JSON.stringify(template["!cols"]));
}


/* ตั้งชื่อ sheet */

let sheetName=name;
let count=1;

while(workbook.SheetNames.includes(sheetName)){
sheetName=name+"_"+count;
count++;
}

workbook.SheetNames.push(sheetName);
workbook.Sheets[sheetName]=newSheet;


/* header */

setCell(newSheet,"B2",employeeId);
setCell(newSheet,"B3",name);
setCell(newSheet,"B5",`${month}/${year}`);


/* เริ่มข้อมูล row 7 */

let row=7;

for(const dateObj of dates){

const y=dateObj.getFullYear();
const m=String(dateObj.getMonth()+1).padStart(2,"0");
const d=String(dateObj.getDate()).padStart(2,"0");

const firestoreDate=`${y}-${m}-${d}`;
const excelDate=`${d}/${m}/${y}`;

const day=days[firestoreDate];

let clockIn="-";
let clockOut="-";
let siteIn="-";
let siteOut="-";
let ot="-";
let status="-";

const dayOfWeek=dateObj.getDay();


if(leaveMap[userId+"_"+firestoreDate]){
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

siteIn=day.siteName||"-";

siteOut=day.checkoutOutside?"นอกพื้นที่":day.siteName||"-";


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

if(late && ot!=="-") status="สาย,OT";
else if(late) status="สาย";
else if(ot!=="-") status="OT";
else status="ปกติ";

}


setCell(newSheet,`A${row}`,excelDate);
setCell(newSheet,`B${row}`,clockIn);
setCell(newSheet,`C${row}`,clockOut);
setCell(newSheet,`D${row}`,siteIn);
setCell(newSheet,`E${row}`,siteOut);
setCell(newSheet,`F${row}`,ot);
setCell(newSheet,`G${row}`,status);

row++;

}

}


delete workbook.Sheets[templateName];

workbook.SheetNames=
workbook.SheetNames.filter(s=>s!==templateName);


XLSX.writeFile(workbook,`attendance_${month}_${year}.xlsx`);

}catch(err){

console.error(err);
alert("Export ไม่สำเร็จ");

}

}


/* expose ให้ปุ่มเรียกได้ */

window.exportExcel = exportExcel;
