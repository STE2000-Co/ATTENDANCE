// ===== SIMPLE APP ROUTER =====

async function openPage(page){

  const res = await fetch(page);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html,"text/html");

  document.body.innerHTML = doc.body.innerHTML;

}

// global navigation
window.goLeave = () => openPage("leave.html");
window.goAdmin = () => openPage("admin.html");
window.goReport = () => openPage("report.html");
