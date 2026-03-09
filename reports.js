import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
getFirestore,
collection,
getDocs,
query,
where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
apiKey: "YOUR_KEY",
authDomain: "YOUR_DOMAIN",
projectId: "system-base-8b777",
storageBucket: "system-base-8b777.firebasestorage.app",
messagingSenderId: "749702522934",
appId: "1:749702522934:web:5664ccfd9d04ae88985097"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.loadReport = async function(){

const start = document.getElementById("startDate").value;
const end = document.getElementById("endDate").value;

if(!start || !end){
alert("เลือกช่วงวันที่");
return;
}

const q = query(
collection(db,"attendance"),
where("date",">=",start),
where("date","<=",end)
);

const snapshot = await getDocs(q);

const table = document.getElementById("reportTable");
table.innerHTML="";

let total=0;
let checked=0;

snapshot.forEach(docSnap=>{

const data=docSnap.data();

total++;

if(data.checkIn){
checked++;
}

table.innerHTML+=`
<tr>
<td>${data.name}</td>
<td>${data.date}</td>
<td>${data.checkIn || "-"}</td>
<td>${data.checkOut || "-"}</td>
<td>${data.site || "-"}</td>
<td>${data.status || "-"}</td>
</tr>
`;

});

document.getElementById("totalStaff").innerText=total;
document.getElementById("checkedIn").innerText=checked;
document.getElementById("absent").innerText=total-checked;

}
