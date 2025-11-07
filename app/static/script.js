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