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

// Center button
centerBtn.addEventListener('click', () => {
    map.setView([2.928, 101.64192], 16);
});

// Ensure map resizes properly after sidebar animation
sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});
