const outdoorMarkers = L.layerGroup().addTo(map);
const indoorPolygons = L.layerGroup();
const indoorMarkers = L.layerGroup();

/* =========================
    FCI LOCATION (OUTDOOR)
========================= */
const fciLatLng = [2.9286, 101.6411];

const fciMarker = L.marker(fciLatLng).addTo(outdoorMarkers);
fciMarker.bindPopup(`
    <b>FCI Building</b><br>
    <button onclick="enterIndoor()">Enter Building</button>
`);

/* =========================
    INDOOR DATA (DEMO ONLY)
    Each floor has its own shapes
========================= */
const floors = {
    0: {
        image: 'fci_floor_0.png',
        markers: [
            { x: 45, y: 60, label: 'Lab A' }
        ]
    },
    1: {
        image: 'fci_floor_1.png',
        markers: [
            { x: 55, y: 40, label: 'Tutorial Room 2' }
        ]
    },
    2: { image: 'fci_floor_2.png', markers: [] },
    3: { image: 'fci_floor_3.png', markers: [] },
    4: { image: 'fci_floor_4.png', markers: [] }
};

/* =========================
    ENTER INDOOR MODE
========================= */
function enterIndoor() {
    outdoorMarkers.clearLayers();

    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoom.disable();

    map.flyTo(fciLatLng, 20);

    document.getElementById('indoorPanel').style.display = 'block';
    document.getElementById('indoorContainer').hidden = false;

    loadFloor(1);
}

/* =========================
    LOAD FLOOR
========================= */
function loadFloor(floorNumber) {
    const floor = floors[floorNumber];
    const img = document.getElementById('floorImage');
    const markerLayer = document.getElementById('indoorMarkers');

    img.src = `/static/floors/${floor.image}`;
    markerLayer.innerHTML = '';

    floor.markers.forEach(m => {
        const el = document.createElement('div');
        el.className = 'indoor-marker';
        el.style.left = m.x + '%';
        el.style.top = m.y + '%';
        el.textContent = '📍';
        el.title = m.label;
        markerLayer.appendChild(el);
    });
}

/* =========================
    EXIT INDOOR MODE
========================= */
function exitIndoor() {
    document.getElementById('indoorContainer').hidden = true;
    document.getElementById('indoorPanel').style.display = 'none';

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();

    outdoorMarkers.addTo(map);

    L.marker(fciLatLng).addTo(outdoorMarkers)
        .bindPopup(`
        <b>FCI Building</b><br>
        <button onclick="enterIndoor()">Enter Building</button>
        `);
}
