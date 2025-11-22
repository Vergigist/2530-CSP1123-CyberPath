// Initialise Map
var map = L.map('map').setView([2.928, 101.64192], 16);

// Add OpenStreetMap layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Remove default zoom controls for cleaner look
map.removeControl(map.zoomControl);

// Elements
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const centerBtn = document.getElementById('centerBtn');

// Sidebar toggle
toggleBtn.addEventListener('click', () => {
    content.classList.toggle('sidebar-open');
    sidebar.classList.toggle('active');

  // Fix map size after animation
    setTimeout(() => {
        map.invalidateSize();
    }, 310);
});

centerBtn.addEventListener('click', () => {
    map.setView([2.928, 101.64192], 16);
});

sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});


// Admin 
const adminBtn = document.getElementById('adminBtn');
const adminPopup = document.getElementById('adminPopup');
const closePopup = document.getElementById('closePopup');

adminBtn.addEventListener('click', () => adminPopup.style.display = 'flex');
closePopup.addEventListener('click', () => adminPopup.style.display = 'none');
window.addEventListener('click', (e) => { if(e.target === adminPopup) adminPopup.style.display = 'none'; });

const tabs = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.tab-form');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    });
});

//Map get coordinates interaction

const coordsDisplay = document.getElementById('coords-display');

map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    coordsDisplay.textContent = `Latitude: ${lat}, Longitude: ${lng}`;
});

//Admin dashboard
const adminSidebar = document.getElementById("adminSidebar");
const adminToggleBtn = document.getElementById("adminToggleBtn");

// Toggle admin sidebar visibility
adminToggleBtn.addEventListener("click", () => {
    adminSidebar.classList.toggle("active");
    adminToggleBtn.classList.toggle("shifted");
});

// Show admin button only after login
function showAdminControls() {
    adminToggleBtn.style.display = "block";
}

// Example: call after admin login is verified
//showAdminControls();

// GPS Connection 
const gpsButton = document.getElementById("gpsButton");
gpsButton.addEventListener("click", gps.findCurrentLocation);

// Add location form elements
const addLocationBtn = document.getElementById("addLocationBtn");
const addLocationForm = document.getElementById("addLocationForm");
const pickFromMapBtn = document.getElementById("pickFromMapBtn");
const locCoordsInput = document.getElementById("locCoords");

let pickMode = false;

// Show form when click "Add Location"
addLocationBtn.addEventListener("click", () => {
    addLocationForm.classList.remove("hidden");
});

//Start picking coordinates
pickFromMapBtn.addEventListener("click", () => {
    addLocationForm.classList.add("hidden");   // hide form
    pickMode = true;                           // enable picking mode
//    alert("Click anywhere on the map to pick a location.");
});

//Close form button
closeLocationFormBtn.addEventListener("click", () => {
    addLocationForm.classList.add("hidden");
    pickMode = false;
});

//Map click handler
map.on("click", function (e) {
    if (!pickMode) return;

    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);

    // Fill input box
    locCoordsInput.value = `${lat}, ${lng}`;

    // Stop pick mode
    pickMode = false;

    // Show the form again
    addLocationForm.classList.remove("hidden");
});

//View All Location
const viewAllBtn = document.getElementById("viewAllBtn");
const popup = document.getElementById("viewLocationPopup");
const closePopupBtn = document.getElementById("closePopup");
const searchInput = document.getElementById("searchLocation");
const locationList = document.getElementById("locationList");

// Open popup
viewAllBtn.addEventListener("click", () => {
    popup.classList.remove("hidden");
});

// Close popup
closePopupBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
});

// Search input (currently skeleton, no data yet)
searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();
    [...locationList.children].forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(filter)
            ? "block"
            : "none";
    });
});     

// Skeleton: add sample items to visualize scroll
for (let i = 1; i <= 5; i++) {
    const item = document.createElement("div");
    item.textContent = `Location ${i}`;
    locationList.appendChild(item);
}

for (let i = 6; i <= 10; i++) {
    const item = document.createElement("div");
    item.textContent = `Apple ${i}`;
    locationList.appendChild(item);
}