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
    0: {
        image: '/static/images/fci_floor1.png',
        markers: [
            { lat: 2.928785 , lng: 101.641071, label : 'Stair' }
        ]
    },
    1: {
        image: '/static/images/fci_floor1.png',
        markers: [
            { lat: 2.928434 , lng: 101.641128, label : 'Lift' }
        ]
    },
    2: { image: '/static/images/fci_floor1.png', 
        markers: [
            { lat: 2.928454 , lng: 101.641494, label : 'Stair' }
        ] 
    },
    3: { image: '/static/images/fci_floor1.png', 
        markers: [
            { lat: 2.928714 , lng: 101.641126, label : 'CQAR 3005' }
        ] 
    },
    4: { image: '/static/images/fci_floor1.png', 
        markers: [
            { lat: 2.929039 , lng: 101.640763, label : 'CQAR 4002' }
        ] 
    }
};

const FCMfloors = {

}

/* =========================
    FCI LOCATION (OUTDOOR)
========================= */
const buildings = {
    fci: {
        name: "FCI Building",
        center: [2.928633, 101.64111],
        floors: FCIfloors, 
    },

    
    fcm: {
        name: "FCM Building",
        center: [2.9279, 101.6424],
        floors: FCMfloors,
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

    map.flyTo(activeBuilding.center, 20);

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
        L.marker([m.latitude, m.longitude])
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

    L.marker(b.center)
        .addTo(buildingMarkers)
        .bindPopup(`
            <b>${b.name}</b><br>
            <button onclick="enterIndoor('${buildingId}')">Enter Building</button>
        `);
}


function initBuildings() {
    buildingMarkers.clearLayers();
    createBuildingMarker("fci");
}


