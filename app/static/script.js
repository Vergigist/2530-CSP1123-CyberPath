// Initialise Map
var map = L.map('map').setView([2.928, 101.64192], 16);

// Add OpenStreetMap layer (watermark)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Remove default zoom controls for a cleaner UI
map.removeControl(map.zoomControl);

// Cache DOM elements
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const mapContainer = document.getElementById('map-container');
const toggleBtn = document.getElementById('toggleBtn');
const centerBtn = document.getElementById('centerBtn');

// Handle sidebar toggle
toggleBtn.addEventListener('click', () => {
    // Toggle sidebar open/close
    const isOpen = content.classList.toggle('sidebar-open');

    // Resize map after transition (ensure no white gap)
    setTimeout(() => {
        map.invalidateSize();
    }, 310);
});

// Handle recenter button
centerBtn.addEventListener('click', () => {
    map.setView([2.928, 101.64192], 16);
});

// Also fix map size after transition animation finishes
sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});
