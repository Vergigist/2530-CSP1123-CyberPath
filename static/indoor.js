const indoorMarkers = L.layerGroup().addTo(map);
let indoorImageOverlay = null;

let activeBuildingId = null;
let activeBuilding = null;
let activeFloor = null;



function createBuildingMarker(buildingId) {
    const b = buildings[buildingId];

    L.marker(b.center)
        .addTo(outdoorMarkers)
        .bindPopup(`
            <b>${b.name}</b><br>
            <button onclick="enterIndoor('${buildingId}')">Enter Building</button>
        `);
}

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

    outdoorMarkers.clearLayers();

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
function loadFloor(floorNumber) {
    activeFloor = floorNumber;

    const floor = activeBuilding.floors[floorNumber];
    if (!floor || !floor.image) return;

    // Remove previous floor image
    if (indoorImageOverlay) {
        map.removeLayer(indoorImageOverlay);
        indoorImageOverlay = null;
    }

    // Generate bounds around building center
    const bounds = boundsFromCenter(activeBuilding.center, 123);

    // Add floor image as a Leaflet overlay
    indoorImageOverlay = L.imageOverlay(
        floor.image,
        bounds,
        { opacity: 1, interactive: false } // not blocking clicks
    ).addTo(map);

    // Clear old indoor markers
    indoorMarkers.clearLayers();

    // Add markers on top of floor image
    floor.markers.forEach(m => {
        if (m.lat && m.lng) {
            L.marker([m.lat, m.lng])
                .bindPopup(m.label || "")
                .addTo(indoorMarkers);
        }
    });

    // Make sure markers are visually above the image
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

    indoorMarkers.clearLayers();

    document.getElementById('indoorContainer').hidden = true;
    document.getElementById('indoorPanel').style.display = 'none';

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();

    initBuildings();
}


function initBuildings() {
    if (window.outdoorMarkers) {
        outdoorMarkers.clearLayers();
    } else {
        window.outdoorMarkers = L.layerGroup().addTo(map);
    }

    createBuildingMarker("fci");
}

initBuildings();
