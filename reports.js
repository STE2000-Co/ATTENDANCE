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

const start = document.getElementById("startDate").value;
const end = document.getElementById("endDate").value;

if(!start || !end){
alert("เลือกช่วงวันที่");
return;
}

const snapshot = await getDocs(collection(db,"attendance"));

const table = document.getElementById("reportTable");
table.innerHTML="";

let total = 0;
let checked = 0;

for(const docSnap of snapshot.docs){

const userId = docSnap.id;
const data = docSnap.data();
const days = data.days || {};

const userDoc = await getDoc(doc(db,"users",userId));
const userName = userDoc.exists() ? userDoc.data().name : userId;

for(const date in days){

if(date < start || date > end) continue;

const day = days[date];

total++;

if(day.clockIn){
checked++;
}

table.innerHTML += `
<tr>
<td>${userName}</td>
<td>${date}</td>
<td>${day.clockIn ? new Date(day.clockIn.seconds*1000).toLocaleTimeString() : "-"}</td>
<td>${day.clockOut ? new Date(day.clockOut.seconds*1000).toLocaleTimeString() : "-"}</td>
<td>${day.siteName || "-"}</td>
<td>${day.checkoutOutside ? "ออกนอกพื้นที่" : "ปกติ"}</td>
</tr>
`;

}

}

document.getElementById("totalStaff").innerText = total;
document.getElementById("checkedIn").innerText = checked;
document.getElementById("absent").innerText = total - checked;

};
