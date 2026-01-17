function startRouting () {
    let currentRoute = null;
    let nodeRoute = null;     
    let nodeMarkers = [];

    function createRoute(toLat, toLong) {
        if (currentRoute) {
            map.removeControl(currentRoute);
        }

        if (!window.userLocation) {
            alert("📍User location not available. Please enable GPS.");
            return;
        }

        currentRoute = L.Routing.control({ //leaflet-routing-machine lib
            waypoints: [
                L.latLng(window.userLocation.latitude, window.userLocation.longitude), //from
                L.latLng(toLat, toLong) ], //to

            routeWhileDragging: false,
            showAlternatives: false,

            routeCalculator: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'foot'
            }),

            lineOptions: { styles : [ { color: '#34d6ffff', opacity: 0.6, weight: 5 } ] },

            createMarker: function() { return null; } //remove default markers
        }).addTo(map);
    }

    function userRemoveRoute() {
        if (currentRoute){
            map.removeControl(currentRoute);
            currentRoute = null; 
        }
        removeNodeRoute();
    }

    // ========== NEW NODE ROUTING FUNCTIONS ==========
    
    function getDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

async function getNodes() {
        try {
            const response = await fetch('/api/nodes');
            const nodes = await response.json();
            return nodes;
        } catch (error) {
            console.log("Could not get nodes:", error);
            return [];
        }
    }
    
    async function getEdges() {
        try {
            const response = await fetch('/api/edges');
            const edges = await response.json();
            return edges;
        } catch (error) {
            console.log("Could not get edges:", error);
            return [];
        }
    }
    
    async function findClosestNode(lat, lng) {
        const nodes = await getNodes();
        let closestNode = null;
        let minDistance = 999999;
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const distance = getDistance(lat, lng, node.latitude, node.longitude);
            
            if (distance < minDistance && distance < 50) { // Within 50 meters
                minDistance = distance;
                closestNode = node;
            }
        }
        
        return closestNode;
    }
    
    async function findNodePath(startLat, startLng, endLat, endLng) {
        console.log("Trying node routing...");
        
        const startNode = await findClosestNode(startLat, startLng);
        const endNode = await findClosestNode(endLat, endLng);
        
        if (!startNode || !endNode) {
            console.log("No nodes found nearby");
            return null;
        }
        
        console.log("Start node:", startNode.name);
        console.log("End node:", endNode.name);
        
        const edges = await getEdges();
        
        const visited = {};
        const queue = [[startNode.id]];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const lastNodeId = path[path.length - 1];
            
            if (lastNodeId === endNode.id) {
                console.log("Found path with", path.length, "nodes");
                return path;
            }
            
            visited[lastNodeId] = true;
            
            for (let i = 0; i < edges.length; i++) {
                const edge = edges[i];
                
                if (edge.node_a_id === lastNodeId && !visited[edge.node_b_id]) {
                    const newPath = [...path, edge.node_b_id];
                    queue.push(newPath);
                }
                if (edge.is_bidirectional && edge.node_b_id === lastNodeId && !visited[edge.node_a_id]) {
                    const newPath = [...path, edge.node_a_id];
                    queue.push(newPath);
                }
            }
        }
        
        console.log("No path found");
        return null;
    }
    
    async function createNodeRoute(toLat, toLng) {

        userRemoveRoute();
        
        if (!window.userLocation) {
            alert("📍 Please enable GPS first!");
            return;
        }
        
        const nodePath = await findNodePath(
            window.userLocation.latitude, window.userLocation.longitude,
            toLat, toLng
        );
        
        if (nodePath) {
            const nodes = await getNodes();
            const pathNodes = [];
            
            for (let i = 0; i < nodePath.length; i++) {
                const node = nodes.find(n => n.id === nodePath[i]);
                if (node) {
                    pathNodes.push(node);
                }
            }
            
            drawNodeRoute(pathNodes, toLat, toLng);
            return;
        }
        
        console.log("Using OSRM fallback");
        createRoute(toLat, toLng);
    }
    
    // Draw the node route on map
    function drawNodeRoute(nodes, toLat, toLng) {
        // Clear any old node route
        removeNodeRoute();
        
        // Create array of coordinates
        const coords = [];
        for (let i = 0; i < nodes.length; i++) {
            coords.push([nodes[i].latitude, nodes[i].longitude]);
        }
        
        
        nodeRoute = L.polyline(coords, {
            color: '#4CAF50',
            weight: 6,
            opacity: 0.8,
            lineCap: 'round'
        }).addTo(map);
        
        
        const startIcon = L.divIcon({
            className: 'node-start',
            html: '<div style="background: green; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white;"></div>',
            iconSize: [22, 22]
        });
        
        const startMarker = L.marker([window.userLocation.latitude, window.userLocation.longitude], {
            icon: startIcon
        }).addTo(map).bindPopup("Start");
        
        
        const endIcon = L.divIcon({
            className: 'node-end',
            html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white;"></div>',
            iconSize: [22, 22]
        });
        
        const endMarker = L.marker([toLat, toLng], {
            icon: endIcon
        }).addTo(map).bindPopup("Destination");
        
        nodeMarkers = [startMarker, endMarker];
        
        
        let totalDistance = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
            totalDistance += getDistance(
                nodes[i].latitude, nodes[i].longitude,
                nodes[i+1].latitude, nodes[i+1].longitude
            );
        }
        
        
        const minutes = Math.ceil((totalDistance / 1.4) / 60); // 1.4 m/s walking speed
        alert(`✅ Node Route Found!\nDistance: ${Math.round(totalDistance)}m\nWalking time: ~${minutes} minutes`);
        
        
        if (nodeRoute) {
            map.fitBounds(nodeRoute.getBounds());
        }
    }
    
    
    function removeNodeRoute() {
        if (nodeRoute) {
            map.removeLayer(nodeRoute);
            nodeRoute = null;
        }
        
        for (let i = 0; i < nodeMarkers.length; i++) {
            map.removeLayer(nodeMarkers[i]);
        }
        nodeMarkers = [];
    }
    
    // ========== PUBLIC FUNCTIONS ==========
    return {
        createRoute: createRoute,
        userRemoveRoute: userRemoveRoute,
        
        createNodeRoute: createNodeRoute,
        
        refreshNodes: async function() {
            console.log("Refreshing node data...");
        }
    };
}

window.router = startRouting();