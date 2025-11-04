//Initialise Map
var map = L.map('map').setView([2.926, 101.64192], 16);

//Water mark
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Reference elements once, globally
const sidebar = document.getElementById('sidebar');
const mapContainer = document.getElementById('map-container');
const centerBtn = document.getElementById('centerBtn');
const toggleBtn = document.getElementById('toggleBtn');

// Center button
centerBtn.addEventListener('click', function() {
    map.setView([2.926, 101.64192], 16);
});

// Sidebar toggle
toggleBtn.addEventListener('click', function() {
    sidebar.classList.toggle('active');
    mapContainer.classList.toggle('sidebar-open');

  // Ensure map resizes after animation (fallback)
    setTimeout(() => {
    map.invalidateSize();
    }, 310);
});

// Wait until the sidebar transition ends, then fix map size
sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});
