import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs
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

let currentState = "checkin";
let currentUserId = null;
let countdownInterval = null;
let confirmCallback = null;

/* ================= DEVICE ID ================= */

function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
}

/* ================= DISTANCE ================= */

function getDistance(lat1, lon1, lat2, lon2) {

  const R = 6371e3;

  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;

  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a =
    Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) *
    Math.cos(φ2) *
    Math.sin(Δλ/2) *
    Math.sin(Δλ/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/* ================= LOAD SITES ================= */

async function loadActiveSites() {

  const snapshot = await getDocs(collection(db,"sites"));

  const sites = [];

  snapshot.forEach(docSnap => {

    const data = docSnap.data();

    if(data.active){

      sites.push({
        id:docSnap.id,
        ...data
      });

    }

  });

  return sites;
}

async function detectSite(lat,lng){

  const sites = await loadActiveSites();

  for(const site of sites){

    const distance = getDistance(lat,lng,site.lat,site.lng);

    if(distance <= site.radius){

      return site;

    }

  }

  return null;

}

/* ================= POPUP ================= */

function showPopup(message,isError=false){

  const overlay = document.getElementById("customPopup");
  const box = overlay.querySelector(".popup-box");

  box.innerHTML = `

  <div class="popup-message" style="white-space:pre-line;">${message}</div>

  <button class="popup-btn" onclick="closePopup()">ตกลง</button>

  `;

  const btn = box.querySelector(".popup-btn");

  btn.style.background = isError ? "#dc2626" : "#16a34a";

  overlay.style.display="flex";

}

function showConfirm(message,onConfirm){

  confirmCallback = onConfirm;

  const overlay = document.getElementById("customPopup");
  const box = overlay.querySelector(".popup-box");

  box.innerHTML = `

  <div class="popup-message">${message}</div>

  <div style="display:flex;gap:10px">

  <button class="popup-btn" style="background:#e5e7eb;color:#111;" onclick="closePopup()">ยกเลิก</button>

  <button class="popup-btn" onclick="confirmAction()">ยืนยัน</button>

  </div>

  `;

  overlay.style.display="flex";

}

window.confirmAction = async function(){

  closePopup();

  if(confirmCallback){

    await confirmCallback();

  }

}

window.closePopup = function(){

  document.getElementById("customPopup").style.display="none";

}

/* ================= LOGIN ================= */

window.login = async function(){

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if(!email || !password){

    showPopup("กรอกข้อมูลให้ครบ",true);
    return;

  }

  try{

    await signInWithEmailAndPassword(auth,email,password);

  }catch{

    showPopup("เข้าสู่ระบบไม่สำเร็จ",true);

  }

}

/* ================= AUTH ================= */

onAuthStateChanged(auth,async(user)=>{

  const loginSection=document.getElementById("loginSection");
  const appSection=document.getElementById("appSection");

  if(!user){

    loginSection.classList.add("active");
    appSection.classList.remove("active");
    return;

  }

  currentUserId=user.uid;

  const userRef=doc(db,"users",user.uid);
  const userSnap=await getDoc(userRef);

  if(!userSnap.exists()){

    showPopup("ไม่มีสิทธิ์เข้าใช้งาน",true);

    await auth.signOut();
    return;

  }

  const userData=userSnap.data();

  if(userData.role==="admin"){

    window.location.href="admin.html";
    return;

  }

  loginSection.classList.remove("active");
  appSection.classList.add("active");

  loadEmployeeCard(userData,user.uid);
  startClock();

  await restoreStateFromFirestore(user.uid);

});

/* ================= CARD ================= */

function loadEmployeeCard(data,uid){

  const empId=data.employeeId || uid;

  document.getElementById("empName").innerText=data.name || "-";
  document.getElementById("empId").innerText=empId;
  document.getElementById("empPosition").innerText=data.position || "-";
  document.getElementById("empDept").innerText=data.department || "-";
  document.getElementById("empIssued").innerText=data.issueDate || "-";

}

/* ================= CLOCK ================= */

function startClock(){

  setInterval(()=>{

    const now=new Date();

    document.getElementById("liveDate").innerText=

    now.toLocaleDateString("th-TH",{dateStyle:"full"});

  },1000);

}

/* ================= FORMAT ================= */

function formatTime(ts){

  if(!ts) return "-";

  return ts.toDate().toLocaleTimeString("th-TH");

}

/* ================= SUMMARY ================= */

async function getTodaySummary(uid){

  const today=new Date().toISOString().split("T")[0];

  const snap=await getDoc(doc(db,"attendance",uid));

  if(!snap.exists()) return null;

  return snap.data().days?.[today] || null;

}

/* ================= STATE ================= */

async function restoreStateFromFirestore(uid){

  const todayData=await getTodaySummary(uid);

  const hour=new Date().getHours();

  if(!todayData){

    if(hour<17) setState("checkin");
    else setState("locked");

    return;

  }

  if(todayData.clockIn && !todayData.clockOut){

    if(hour>=17) setState("checkout");
    else setState("countdown");

    return;

  }

  if(todayData.clockOut){

    setState("finished");

  }

}

/* ================= BUTTON ================= */

window.actionHandler=async function(){

  const btn=document.getElementById("actionBtn");

  if(currentState==="checkin"){

    const ok=await processAttendance(true);

    if(!ok) return;

    const todayData=await getTodaySummary(currentUserId);

    showPopup(

`บันทึกเวลาเข้างานสำเร็จ

ไซต์งาน: ${todayData?.checkInSite || "-"}

เวลา: ${formatTime(todayData?.clockIn)}`

    );

  }

  if(currentState==="checkout"){

    showConfirm("คุณต้องการเลิกงานหรือไม่?",async()=>{

      const ok=await processAttendance(false);

      if(!ok) return;

      const todayData=await getTodaySummary(currentUserId);

      showPopup(

`บันทึกเวลาเลิกงานสำเร็จ

ไซต์งาน: ${todayData?.checkOutSite || "-"}

เวลา: ${formatTime(todayData?.clockOut)}

${todayData?.checkoutOutside ? "⚠ นอกพื้นที่ไซต์" : "✔ ภายในไซต์"}`

      );

    });

  }

}

/* ================= ATTENDANCE ================= */

async function processAttendance(isCheckin){

  let coords;

  try{

    coords = await new Promise((resolve,reject)=>{

      navigator.geolocation.getCurrentPosition(

        pos=>resolve(pos.coords),

        err=>reject(err)

      );

    });

  }catch{

    showPopup("กรุณาเปิด GPS",true);
    return false;

  }

  const lat=coords.latitude;
  const lng=coords.longitude;

  const site=await detectSite(lat,lng);

  const user=auth.currentUser;

  const today=new Date().toISOString().split("T")[0];

  const ref=doc(db,"attendance",user.uid);

  const snap=await getDoc(ref);

  if(isCheckin){

    if(!site){

      showPopup("คุณไม่ได้อยู่ในไซต์งาน",true);
      return false;

    }

    const payload={

      clockIn:serverTimestamp(),

      checkInSite:site.name,

      siteId:site.id,

      locationIn:{lat,lng},

      clockOut:null,

      checkOutSite:null,

      locationOut:null,

      checkoutOutside:false

    };

    if(!snap.exists()){

      await setDoc(ref,{
        days:{[today]:payload}
      });

    }else{

      await updateDoc(ref,{
        [`days.${today}`]:payload
      });

    }

  }else{

    const todayData=snap.data().days?.[today];

    const siteSnap=await getDoc(doc(db,"sites",todayData.siteId));

    const siteData=siteSnap.data();

    const distance=getDistance(lat,lng,siteData.lat,siteData.lng);

    const outside=distance > siteData.radius;

    await updateDoc(ref,{

      [`days.${today}.clockOut`]:serverTimestamp(),

      [`days.${today}.checkOutSite`]:siteData.name,

      [`days.${today}.locationOut`]:{lat,lng},

      [`days.${today}.checkoutOutside`]:outside

    });

  }

  await restoreStateFromFirestore(currentUserId);

  return true;

}

/* ================= STATE UI ================= */

function setState(state){

  const btn=document.getElementById("actionBtn");

  currentState=state;

  if(state==="checkin"){

    btn.innerText="เข้างาน";
    btn.disabled=false;

  }

  if(state==="checkout"){

    btn.innerText="เลิกงาน";
    btn.disabled=false;

  }

  if(state==="countdown"){

    btn.innerText="กำลังทำงาน";
    btn.disabled=true;

  }

  if(state==="finished"){

    btn.innerText="ขอบคุณสำหรับวันนี้";
    btn.disabled=true;

  }

  if(state==="locked"){

    btn.innerText="ปิดรับเข้างาน";
    btn.disabled=true;

  }

}
