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
        polygons: [
            {
                coords: [
                    [2.928876 , 101.640603],
                    [2.928966 , 101.640692],
                    [2.929039 , 101.640618],
                    [2.929151 , 101.640707],
                    [2.928552 , 101.641371],
                    [2.928864 , 101.641377],
                    [2.928863 , 101.641589],
                    [2.928217 , 101.641590],
                    [2.928217 , 101.641352],
                    [2.928372 , 101.641352],
                    [2.928372 , 101.641303],
                    [2.928324 , 101.641290],
                    [2.928284 , 101.641328],
                    [2.928193 , 101.641238]
                ],
                style: { color: 'black', fillColor: 'black', fillOpacity: 1 }
            }
        ],
        markers: [
            { coords: [2.928612, 101.641204], label: 'Lab A' }
        ]
    },
    1: {
        polygons: [
            {
                coords: [
                    [2.928876 , 101.640603],
                    [2.928966 , 101.640692],
                    [2.929039 , 101.640618],
                    [2.929151 , 101.640707],
                    [2.928552 , 101.641371],
                    [2.928864 , 101.641377],
                    [2.928863 , 101.641589],
                    [2.928217 , 101.641590],
                    [2.928217 , 101.641352],
                    [2.928372 , 101.641352],
                    [2.928372 , 101.641303],
                    [2.928324 , 101.641290],
                    [2.928284 , 101.641328],
                    [2.928193 , 101.641238]
                ],
                style: { color: 'black', fillColor: 'black', fillOpacity: 1 }
            }

        ],
        markers: [
            { coords: [2.928612, 101.641204], label: 'Tutorial Room 2' }
        ]
    },
    2: {
        polygons: [
            {
                coords: [
                    [2.928876 , 101.640603],
                    [2.928966 , 101.640692],
                    [2.929039 , 101.640618],
                    [2.929151 , 101.640707],
                    [2.928552 , 101.641371],
                    [2.928864 , 101.641377],
                    [2.928863 , 101.641589],
                    [2.928217 , 101.641590],
                    [2.928217 , 101.641352],
                    [2.928372 , 101.641352],
                    [2.928372 , 101.641303],
                    [2.928324 , 101.641290],
                    [2.928284 , 101.641328],
                    [2.928193 , 101.641238]
                ],
                style: { color: 'black', fillColor: 'black', fillOpacity: 1 }
            }
        ]
    },
    3: {
        polygons: [
            {
                coords: [
                    [2.928876 , 101.640603],
                    [2.928966 , 101.640692],
                    [2.929039 , 101.640618],
                    [2.929151 , 101.640707],
                    [2.928552 , 101.641371],
                    [2.928864 , 101.641377],
                    [2.928863 , 101.641589],
                    [2.928217 , 101.641590],
                    [2.928217 , 101.641352],
                    [2.928372 , 101.641352],
                    [2.928372 , 101.641303],
                    [2.928324 , 101.641290],
                    [2.928284 , 101.641328],
                    [2.928193 , 101.641238]
                ],
                style: { color: 'black', fillColor: 'black', fillOpacity: 1 }
            }
        ]
    },
    4: {
        polygons: [
            {
                coords: [
                    [2.928876 , 101.640603],
                    [2.928966 , 101.640692],
                    [2.929039 , 101.640618],
                    [2.929151 , 101.640707],
                    [2.928552 , 101.641371],
                    [2.928864 , 101.641377],
                    [2.928863 , 101.641589],
                    [2.928217 , 101.641590],
                    [2.928217 , 101.641352],
                    [2.928372 , 101.641352],
                    [2.928372 , 101.641303],
                    [2.928324 , 101.641290],
                    [2.928284 , 101.641328],
                    [2.928193 , 101.641238]
                ],
                style: { color: 'black', fillColor: 'black', fillOpacity: 1 }
            }
        ]
    },
};

/* =========================
    ENTER INDOOR MODE
========================= */
function enterIndoor() {
    // Remove outdoor markers
    outdoorMarkers.clearLayers();

    // Lock map interaction
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoom.disable();

    // Focus on building
    map.flyTo(fciLatLng, 20);

    // Show indoor UI
    document.getElementById('indoorPanel').style.display = 'block';

    // Load default floor
    loadFloor(1);
}

/* =========================
    LOAD FLOOR
========================= */
function loadFloor(floorNumber) {
    indoorPolygons.clearLayers();
    indoorMarkers.clearLayers();

    const floor = floors[floorNumber];

    floor.polygons.forEach(p => {
        L.polygon(p.coords, p.style).addTo(indoorPolygons);
    });

    floor.markers.forEach(m => {
        L.marker(m.coords).bindPopup(m.label).addTo(indoorMarkers);
    });

    indoorPolygons.addTo(map);
    indoorMarkers.addTo(map);
}

/* =========================
    EXIT INDOOR MODE
========================= */
function exitIndoor() {
    indoorPolygons.clearLayers();
    indoorMarkers.clearLayers();

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();

    outdoorMarkers.addTo(map);

    document.getElementById('indoorPanel').style.display = 'none';

    //map.flyTo([2.9245, 101.6423], 17);

    // Restore outdoor marker
    L.marker(fciLatLng).addTo(outdoorMarkers)
    .bindPopup(`
        <b>FCI Building</b><br>
        <button onclick="enterIndoor()">Enter Building</button>
        `);
}