const indoorMarkers = L.layerGroup();
let indoorImageOverlay = null;

let activeBuildingId = null;
let activeBuilding = null;
let activeFloor = null;

let isIndoor = false;


/* =========================
    INDOOR DATA (DEMO ONLY)
========================= */
const FCIfloors = {
    0: { image: '/static/images/fci_ground.png', },
    1: { image: '/static/images/fci_floor1.png', },
    2: { image: '/static/images/fci_floor23.png', },
    3: { image: '/static/images/fci_floor23.png', },
    4: { image: '/static/images/fci_floor4.png', }
};

const FOMfloors = {
    0: { image: '/static/images/fci_floor1.png', },
    1: { image: '/static/images/fci_floor1.png', },
    2: { image: '/static/images/fci_floor1.png', },
    3: { image: '/static/images/fci_floor1.png', },
    4: { image: '/static/images/fci_floor1.png', }
}
const FAIEfloors = {
    0: { image: '/static/images/fci_floor1.png', },
    1: { image: '/static/images/fci_floor1.png', },
    2: { image: '/static/images/fci_floor1.png', },
    3: { image: '/static/images/fci_floor1.png', },
    4: { image: '/static/images/fci_floor1.png', }
}
const FCMfloors = {
    0: { image: '/static/images/fci_floor1.png', },
    1: { image: '/static/images/fci_floor1.png', },
    2: { image: '/static/images/fci_floor1.png', },
    3: { image: '/static/images/fci_floor1.png', },
    4: { image: '/static/images/fci_floor1.png', }
}


/* =========================
    Building marker locations(OUTDOOR)
========================= */
const buildings = {
    fci: {
        name: "FCI Building",
        center: [2.928656, 101.64111],
        floors: FCIfloors, 
    },

    
    fom: {
        name: "FOM Building",
        center: [2.929079, 101.641324],
        floors: FOMfloors,
    },

    faie: {
        name: "FAIE Building",
        center: [2.926401, 101.641255],
        floors: FOMfloors,
    },

    fcm: {
        name: "FCM Building",
        center: [2.926155, 101.642649],
        floors: FOMfloors,
    }
};

/* =========================
    ENTER INDOOR MODE
========================= */
function enterIndoor(buildingId) {
    activeBuildingId = buildingId;
    activeBuilding = buildings[buildingId];

    isIndoor = true;
    document.getElementById('outdoorCategoryDiv').style.display = 'none';
    document.getElementById('indoorCategoryDiv').style.display = 'block';

    // Hide outdoor markers
    map.removeLayer(outdoorMarkers);
    map.removeLayer(buildingMarkers);

    // Show indoor markers
    indoorMarkers.addTo(map);

    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoom.disable();

    map.flyTo(activeBuilding.center, 19.8);

    document.getElementById('indoorPanel').style.display = 'block';
    document.getElementById('indoorContainer').hidden = false;

    loadFloor(1);
}

/* =========================
    LOAD FLOOR
========================= */
async function loadFloor(floorNumber) {
    activeFloor = floorNumber;

    const floor = activeBuilding.floors[floorNumber];
    if (!floor || !floor.image) return;

    if (indoorImageOverlay) {
        map.removeLayer(indoorImageOverlay);
    }

    const bounds = boundsFromCenter(activeBuilding.center, 123);

    indoorImageOverlay = L.imageOverlay(
        floor.image,
        bounds,
        { opacity: 1, interactive: false }
    ).addTo(map);

    indoorMarkers.clearLayers();

    // Load real indoor markers from DB
    const response = await fetch("/api/indoor-markers");
    const indoorData = await response.json();

    const filtered = indoorData.filter(m =>
        m.building === activeBuildingId &&
        m.floor == activeFloor
    );

    filtered.forEach(m => {
        L.marker([m.latitude, m.longitude], {
            icon: getCategoryIcon(m.category)
        })
        .bindPopup(`<b>${m.name}</b><br>${m.description || ""}`)
        .addTo(indoorMarkers);
    });

    indoorMarkers.bringToFront();
}

function boundsFromCenter(center, sizeMeters) {
    const lat = center[0];
    const lng = center[1];

    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos(lat * Math.PI / 180);

    const dLat = (sizeMeters / 2) / metersPerDegLat;
    const dLng = (sizeMeters / 2) / metersPerDegLng;

    return [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng]
    ];
}


/* =========================
    EXIT INDOOR MODE
========================= */
function exitIndoor() {
    activeBuilding = null;
    activeBuildingId = null;
    activeFloor = null;

    if (indoorImageOverlay) {
        map.removeLayer(indoorImageOverlay);
        indoorImageOverlay = null;
    }

    map.removeLayer(indoorMarkers);
    indoorMarkers.clearLayers();

    isIndoor = false;
    document.getElementById('outdoorCategoryDiv').style.display = 'block';
    document.getElementById('indoorCategoryDiv').style.display = 'none';

    buildingMarkers.addTo(map);
    outdoorMarkers.addTo(map);

    document.getElementById('indoorContainer').hidden = true;
    document.getElementById('indoorPanel').style.display = 'none';

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();

    initBuildings();
}

function createBuildingMarker(buildingId) {
    const b = buildings[buildingId];

    L.marker(b.center, {
        icon: getCategoryIcon("building")
    })
        .addTo(buildingMarkers)
        .bindPopup(`
            <b>${b.name}</b><br>
            <button onclick="enterIndoor('${buildingId}')">Enter Building</button>
        `);
}


function initBuildings() {
    buildingMarkers.clearLayers();
    createBuildingMarker("fci");
    createBuildingMarker("fom");
    createBuildingMarker("faie");
    createBuildingMarker("fcm");
}


