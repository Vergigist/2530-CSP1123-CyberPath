const indoorMarkers = L.layerGroup();


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
    Each floor has its own shapes
========================= */
const FCIfloors = {
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
    FCI LOCATION (OUTDOOR)
========================= */
const buildings = {
    fci: {
        name: "FCI Building",
        center: [2.9286, 101.6411],
        floors: FCIfloors, // reuse what you already wrote
    },

    /*
    fcm: {
        name: "FCM Building",
        center: [2.9279, 101.6424],
        floors: fcmFloors,
    }
    */
};

/* =========================
    ENTER INDOOR MODE
========================= */
function enterIndoor(buildingId) {
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

    // set image
    const img = document.getElementById("floorImage");
    //img.src = `${activeBuilding.imageBase}${floor.image}`;

    // clear old indoor markers
    const markerLayer = document.getElementById("indoorMarkers");
    markerLayer.innerHTML = "";

    // add new indoor markers (percentage-based)
    floor.markers.forEach(m => {
        const el = document.createElement("div");
        el.className = "indoor-marker";
        el.style.left = m.x + "%";
        el.style.top = m.y + "%";
        el.innerText = "📍";

        el.onclick = () => alert(m.label);

        markerLayer.appendChild(el);
    });
}

/* =========================
    EXIT INDOOR MODE
========================= */
function exitIndoor() {
    activeBuilding = null;

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
    window.outdoorMarkers = L.layerGroup().addTo(map);

    createBuildingMarker("fci");
}
initBuildings();