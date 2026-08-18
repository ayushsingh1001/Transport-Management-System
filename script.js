/* ============================================================
   STATE
   ============================================================ */

let trips = JSON.parse(localStorage.getItem("trips")) || [];

let lists = JSON.parse(localStorage.getItem("lists")) || {
  transporter: ["Andal Logistics", "EFC Logistics"],
  truckNumber: ["1982", "8218"],
  loadingPoint: ["Sanikpur", "RP Shaw"],
  unloadingPoint: ["Chiliyama", "Sinni"]
};

let sortState = { key: "loadingDate", dir: "desc" };
let freightChart = null;

/* ============================================================
   DOM REFS
   ============================================================ */

const tripForm = document.getElementById("tripForm");
const tripTableBody = document.querySelector("#tripTable tbody");

const weightLoaded = document.getElementById("weightLoaded");
const weightDelivered = document.getElementById("weightDelivered");
const ratePerTon = document.getElementById("ratePerTon");
const freightAmountField = document.getElementById("freightAmount");
const shortageRate = document.getElementById("shortageRate");
const shortageField = document.getElementById("shortage");
const shortageAmountField = document.getElementById("shortageAmount");
const editIndexField = document.getElementById("editIndex");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.getElementById("formHeading");

/* ============================================================
   SELECT LIST MANAGEMENT
   ============================================================ */

function saveLists(){
  localStorage.setItem("lists", JSON.stringify(lists));
}

function populateSelect(id, key){
  let select = document.getElementById(id);
  let current = select.value;
  select.innerHTML = "";
  lists[key].forEach(val => {
    let opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
  if(current && lists[key].includes(current)) select.value = current;
}

function populateAllSelects(){
  populateSelect("transporter", "transporter");
  populateSelect("truckNumber", "truckNumber");
  populateSelect("loadingPoint", "loadingPoint");
  populateSelect("unloadingPoint", "unloadingPoint");
}

function addOption(id){
  let key = id;
  let label = {
    transporter: "transporter name",
    truckNumber: "vehicle number",
    loadingPoint: "loading point",
    unloadingPoint: "unloading point"
  }[key];

  let value = prompt(`Add new ${label}:`);
  if(!value) return;
  value = value.trim();
  if(!value) return;

  if(!lists[key].includes(value)){
    lists[key].push(value);
    saveLists();
  }
  populateSelect(id, key);
  document.getElementById(id).value = value;
  showToast(`Added "${value}"`);
}

/* ============================================================
   LIVE CALCULATIONS
   ============================================================ */

function calculateShortage(){
  let loaded = parseFloat(weightLoaded.value) || 0;
  let delivered = parseFloat(weightDelivered.value) || 0;
  let rate = parseFloat(shortageRate.value) || 0;

  let shortage = loaded - delivered;
  if(shortage < 0) shortage = 0;

  let shortageAmount = shortage * rate;

  shortageField.value = shortage.toFixed(2);
  shortageAmountField.value = shortageAmount.toFixed(2);
}

function calculateFreight(){
  let delivered = parseFloat(weightDelivered.value) || 0;
  let rate = parseFloat(ratePerTon.value) || 0;
  let freight = (delivered / 1000) * rate; // rate is per ton, delivered is in kg
  freightAmountField.value = freight.toFixed(2);
}

weightLoaded.addEventListener("input", calculateShortage);
weightDelivered.addEventListener("input", calculateShortage);
shortageRate.addEventListener("input", calculateShortage);
weightDelivered.addEventListener("input", calculateFreight);
ratePerTon.addEventListener("input", calculateFreight);

/* ============================================================
   ADD / UPDATE TRIP
   ============================================================ */

tripForm.addEventListener("submit", function(e){
  e.preventDefault();

  let trip = {
    loadingDate: document.getElementById("loadingDate").value,
    unloadingDate: document.getElementById("unloadingDate").value,
    transporter: document.getElementById("transporter").value,
    truck: document.getElementById("truckNumber").value,
    loading: document.getElementById("loadingPoint").value,
    unloading: document.getElementById("unloadingPoint").value,

    loaded: parseFloat(weightLoaded.value) || 0,
    delivered: parseFloat(weightDelivered.value) || 0,

    ratePerTon: parseFloat(ratePerTon.value) || 0,
    freight: parseFloat(freightAmountField.value) || 0,

    shortage: parseFloat(shortageField.value) || 0,
    shortageRate: parseFloat(shortageRate.value) || 0,
    shortageAmount: parseFloat(shortageAmountField.value) || 0,

    diesel: parseFloat(document.getElementById("diesel").value) || 0,
    driver: parseFloat(document.getElementById("driver").value) || 0,

    payment: false
  };

  trip.totalExpense = trip.diesel + trip.driver + trip.shortageAmount;

  let editIndex = editIndexField.value;

  if(editIndex !== ""){
    trip.payment = trips[editIndex].payment; // preserve status
    trips[editIndex] = trip;
    showToast("Trip updated");
  } else {
    trips.push(trip);
    showToast("Trip added");
  }

  localStorage.setItem("trips", JSON.stringify(trips));

  resetForm();
  renderAll();
  showSection("tripData");
});

function resetForm(){
  tripForm.reset();
  shortageField.value = "";
  shortageAmountField.value = "";
  freightAmountField.value = "";
  editIndexField.value = "";
  submitBtn.textContent = "Add Trip";
  cancelEditBtn.style.display = "none";
  formHeading.textContent = "New Trip Entry";
  populateAllSelects();
}

function editTrip(index){
  let t = trips[index];

  document.getElementById("loadingDate").value = t.loadingDate;
  document.getElementById("unloadingDate").value = t.unloadingDate;
  document.getElementById("transporter").value = t.transporter;
  document.getElementById("truckNumber").value = t.truck;
  document.getElementById("loadingPoint").value = t.loading;
  document.getElementById("unloadingPoint").value = t.unloading;

  weightLoaded.value = t.loaded;
  weightDelivered.value = t.delivered;
  ratePerTon.value = t.ratePerTon || "";
  shortageRate.value = t.shortageRate || "";
  document.getElementById("diesel").value = t.diesel;
  document.getElementById("driver").value = t.driver;

  calculateShortage();
  calculateFreight();

  editIndexField.value = index;
  submitBtn.textContent = "Save Changes";
  cancelEditBtn.style.display = "inline-block";
  formHeading.textContent = `Editing Trip — ${t.truck}`;

  showSection("addTrip");
}

function cancelEdit(){
  resetForm();
  showSection("tripData");
}

function deleteTrip(index){
  if(!confirm("Delete this trip record? This cannot be undone.")) return;
  trips.splice(index, 1);
  localStorage.setItem("trips", JSON.stringify(trips));
  renderAll();
  showToast("Trip deleted");
}

function togglePayment(index){
  trips[index].payment = !trips[index].payment;
  localStorage.setItem("trips", JSON.stringify(trips));
  renderAll();
}

/* ============================================================
   FILTER / SORT HELPERS
   ============================================================ */

function getFilteredTrips(){
  let search = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  let status = document.getElementById("statusFilter")?.value || "all";

  return trips
    .map((t, i) => ({ ...t, _index: i }))
    .filter(t => {
      if(status === "received" && !t.payment) return false;
      if(status === "due" && t.payment) return false;
      if(search){
        let haystack = `${t.transporter} ${t.truck} ${t.loading} ${t.unloading}`.toLowerCase();
        if(!haystack.includes(search)) return false;
      }
      return true;
    });
}

function sortTrips(list){
  let { key, dir } = sortState;
  return list.slice().sort((a, b) => {
    let av = a[key], bv = b[key];
    if(typeof av === "string"){
      av = av.toLowerCase(); bv = (bv || "").toLowerCase();
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    av = av || 0; bv = bv || 0;
    return dir === "asc" ? av - bv : bv - av;
  });
}

document.querySelectorAll("#tripTable thead th[data-key]").forEach(th => {
  th.addEventListener("click", () => {
    let key = th.dataset.key;
    if(sortState.key === key){
      sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
    } else {
      sortState.key = key;
      sortState.dir = "asc";
    }
    renderTable();
  });
});

function updateSortArrows(){
  document.querySelectorAll("#tripTable thead th[data-key]").forEach(th => {
    let arrow = th.querySelector(".sort-arrow");
    if(th.dataset.key === sortState.key){
      arrow.textContent = sortState.dir === "asc" ? "▲" : "▼";
    } else {
      arrow.textContent = "";
    }
  });
}

/* ============================================================
   RENDER: MAIN TRIP TABLE
   ============================================================ */

function renderTable(){
  let filtered = sortTrips(getFilteredTrips());
  tripTableBody.innerHTML = "";

  if(filtered.length === 0){
    tripTableBody.innerHTML = `<tr><td colspan="16">
      <div class="empty-state">
        <div class="glyph">🗂️</div>
        <div class="title">No matching trips</div>
        <div class="hint">Try clearing the search or filter above.</div>
      </div>
    </td></tr>`;
  } else {
    filtered.forEach(trip => {
      let row = `<tr>
        <td>${trip.loadingDate || "—"}</td>
        <td>${trip.unloadingDate || "—"}</td>
        <td class="text-cell">${trip.transporter}</td>
        <td class="text-cell">${trip.truck}</td>
        <td class="text-cell">${trip.loading}</td>
        <td class="text-cell">${trip.unloading}</td>
        <td>${trip.loaded}</td>
        <td>${trip.delivered}</td>
        <td>${trip.shortage}</td>
        <td>₹${trip.freight.toLocaleString("en-IN")}</td>
        <td>₹${trip.shortageAmount.toLocaleString("en-IN")}</td>
        <td>₹${trip.diesel.toLocaleString("en-IN")}</td>
        <td>₹${trip.driver.toLocaleString("en-IN")}</td>
        <td>₹${trip.totalExpense.toLocaleString("en-IN")}</td>
        <td>
          <span class="status-pill ${trip.payment ? "received" : "due"}"
                style="cursor:pointer"
                onclick="togglePayment(${trip._index})"
                title="Click to toggle status">
            ${trip.payment ? "Received" : "Due"}
          </span>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" onclick="editTrip(${trip._index})" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="icon-btn" onclick="deleteTrip(${trip._index})" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
      tripTableBody.innerHTML += row;
    });
  }

  updateSortArrows();
  renderReceivedTable();
  renderDueTable();
}

/* ============================================================
   RENDER: RECEIVED / DUE
   ============================================================ */

function renderReceivedTable(){
  let table = document.querySelector("#receivedTable tbody");
  let rows = trips.filter(t => t.payment);
  table.innerHTML = rows.length ? "" : `<tr><td colspan="4"><div class="empty-state"><div class="glyph">✅</div><div class="title">Nothing received yet</div></div></td></tr>`;
  rows.forEach(trip => {
    table.innerHTML += `<tr>
      <td class="text-cell">${trip.truck}</td>
      <td class="text-cell">${trip.transporter}</td>
      <td class="text-cell">${trip.loading} → ${trip.unloading}</td>
      <td>₹${trip.freight.toLocaleString("en-IN")}</td>
    </tr>`;
  });
}

function renderDueTable(){
  let table = document.querySelector("#dueTable tbody");
  let rows = trips.filter(t => !t.payment);
  table.innerHTML = rows.length ? "" : `<tr><td colspan="4"><div class="empty-state"><div class="glyph">🎉</div><div class="title">Nothing due</div></div></td></tr>`;
  rows.forEach(trip => {
    table.innerHTML += `<tr>
      <td class="text-cell">${trip.truck}</td>
      <td class="text-cell">${trip.transporter}</td>
      <td class="text-cell">${trip.loading} → ${trip.unloading}</td>
      <td>₹${trip.freight.toLocaleString("en-IN")}</td>
    </tr>`;
  });
}

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */

function renderDashboard(){
  let totalTrips = trips.length;
  let totalFreight = trips.reduce((s, t) => s + t.freight, 0);
  let totalReceived = trips.filter(t => t.payment).reduce((s, t) => s + t.freight, 0);
  let totalDue = trips.filter(t => !t.payment).reduce((s, t) => s + t.freight, 0);
  let totalExpense = trips.reduce((s, t) => s + t.totalExpense, 0);
  let totalShortage = trips.reduce((s, t) => s + t.shortage, 0);

  document.getElementById("statTrips").textContent = totalTrips;
  document.getElementById("statFreight").textContent = "₹" + totalFreight.toLocaleString("en-IN");
  document.getElementById("statReceived").textContent = "₹" + totalReceived.toLocaleString("en-IN");
  document.getElementById("statDue").textContent = "₹" + totalDue.toLocaleString("en-IN");
  document.getElementById("statExpense").textContent = "₹" + totalExpense.toLocaleString("en-IN");
  document.getElementById("statShortage").textContent = totalShortage.toFixed(1) + " kg";

  renderRecentTable();
  renderChart();
}

function renderRecentTable(){
  let table = document.querySelector("#recentTable tbody");
  let recent = trips.slice(-5).reverse();
  table.innerHTML = recent.length ? "" : `<tr><td colspan="5"><div class="empty-state"><div class="glyph">🚚</div><div class="title">No trips logged yet</div><div class="hint">Add your first trip to see it here.</div></div></td></tr>`;
  recent.forEach(trip => {
    table.innerHTML += `<tr>
      <td>${trip.loadingDate || "—"}</td>
      <td class="text-cell">${trip.truck}</td>
      <td class="text-cell">${trip.loading} → ${trip.unloading}</td>
      <td>₹${trip.freight.toLocaleString("en-IN")}</td>
      <td><span class="status-pill ${trip.payment ? "received" : "due"}">${trip.payment ? "Received" : "Due"}</span></td>
    </tr>`;
  });
}

function renderChart(){
  let ctx = document.getElementById("freightChart");
  if(!ctx) return;

  let grouped = {};
  trips.forEach(t => {
    if(!t.loadingDate) return;
    grouped[t.loadingDate] = (grouped[t.loadingDate] || 0) + t.freight;
  });

  let dates = Object.keys(grouped).sort();
  let values = dates.map(d => grouped[d]);

  if(freightChart) freightChart.destroy();

  if(dates.length === 0){
    return;
  }

  freightChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Freight (₹)",
        data: values,
        borderColor: "#f2a63c",
        backgroundColor: "rgba(242,166,60,0.15)",
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: "#14181c",
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "JetBrains Mono", size: 10 } } },
        y: { grid: { color: "#e8ebe8" }, ticks: { font: { family: "JetBrains Mono", size: 10 } } }
      }
    }
  });
}

/* ============================================================
   NAVIGATION
   ============================================================ */

const sectionTitles = {
  dashboard: "Dashboard",
  addTrip: "Add Trip",
  tripData: "Trip Data",
  received: "Received Payments",
  due: "Due Payments"
};

function showSection(section){
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(section).classList.add("active");

  document.querySelectorAll(".navlist button").forEach(b => b.classList.remove("active"));
  let navBtn = document.querySelector(`.navlist button[data-section="${section}"]`);
  if(navBtn) navBtn.classList.add("active");

  document.getElementById("pageTitle").textContent = sectionTitles[section] || section;

  if(section === "addTrip" && editIndexField.value === ""){
    formHeading.textContent = "New Trip Entry";
  }
  if(section === "dashboard") renderDashboard();
  if(section === "tripData") renderTable();
}

/* ============================================================
   EXCEL EXPORT (real .xlsx via SheetJS)
   ============================================================ */

function downloadExcel(){
  if(trips.length === 0){
    showToast("No data to export");
    return;
  }

  let rows = trips.map(t => ({
    "Loading Date": t.loadingDate,
    "Unloading Date": t.unloadingDate,
    "Transporter": t.transporter,
    "Vehicle": t.truck,
    "Loading Point": t.loading,
    "Unloading Point": t.unloading,
    "Weight Loaded (kg)": t.loaded,
    "Weight Delivered (kg)": t.delivered,
    "Shortage (kg)": t.shortage,
    "Rate/Ton (₹)": t.ratePerTon,
    "Freight (₹)": t.freight,
    "Shortage Amount (₹)": t.shortageAmount,
    "Diesel (₹)": t.diesel,
    "Driver (₹)": t.driver,
    "Total Expense (₹)": t.totalExpense,
    "Status": t.payment ? "Received" : "Due"
  }));

  let ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 16 }));

  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trips");

  XLSX.writeFile(wb, "TransportTrips.xlsx");
  showToast("Excel file downloaded");
}

/* ============================================================
   RESET
   ============================================================ */

function resetAllData(){
  if(!confirm("Delete ALL trip data? This cannot be undone.")) return;
  localStorage.removeItem("trips");
  trips = [];
  renderAll();
  showToast("All trip data cleared");
}

/* ============================================================
   TOAST
   ============================================================ */

let toastTimer = null;
function showToast(msg){
  let toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ============================================================
   INIT
   ============================================================ */

function renderAll(){
  renderTable();
  renderDashboard();
}

function setToday(){
  let el = document.getElementById("todayDate");
  let d = new Date();
  el.textContent = d.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

populateAllSelects();
setToday();
renderAll();
