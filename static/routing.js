
function startRouting() {
  let currentRouteLayer = null;

  // Find nearest node to a lat/lng
  function snapToNearestNode(lat, lng, targetBuilding = null) {
    console.log(`🔍 Snapping coordinates (${lat}, ${lng}) to nearest node`);
    console.log(`   Target building: ${targetBuilding}`);
    
    let candidateNodes = Object.entries(nodes);
    
    // If we have a target building, filter nodes to those near that building
    if (targetBuilding) {
        const buildingCenter = getBuildingCenter(targetBuilding);
        if (buildingCenter) {
            candidateNodes = candidateNodes.filter(([id, node]) => {
                const distToBuilding = distanceMeters(node.lat, node.lng, buildingCenter.lat, buildingCenter.lng);
                return distToBuilding < 80; // Only consider nodes within 80m of building
            });
            
            console.log(`   Filtered to ${candidateNodes.length} nodes near ${targetBuilding}`);
            
            // If no nodes found near building, fall back to all nodes
            if (candidateNodes.length === 0) {
                console.log(`   No nodes near ${targetBuilding}, using all nodes`);
                candidateNodes = Object.entries(nodes);
            }
        }
    }
    
    let nearestId = null;
    let minDist = Infinity;
    
    candidateNodes.forEach(([id, node]) => {
        const d = distanceMeters(lat, lng, node.lat, node.lng);
        if (d < minDist) {
            minDist = d;
            nearestId = id;
        }
    });
    
    console.log(`✅ Selected node: ${nearestId} at distance ${minDist.toFixed(2)}m`);
    
    if (!nearestId) {
        console.warn("⚠️ Could not find any nearby nodes!");
    }
    
    return nearestId;
}

// Helper function to get building centers
function getBuildingCenter(buildingName) {
    const buildingCenters = {
        "FCI Building": { lat: 2.928633, lng: 101.64111 },
        "FOM Building": { lat: 2.929487, lng: 101.641294 },
        "FAIE Building": { lat: 2.926401, lng: 101.641255 },
        "FCM Building": { lat: 2.926155, lng: 101.642649 }
    };
    return buildingCenters[buildingName] || null;
}

  // A* algorithm
  function aStar(startId, goalId) {
    const openSet = new Set([startId]);
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    Object.keys(nodes).forEach(id => {
      gScore[id] = Infinity;
      fScore[id] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = distanceMeters(nodes[startId].lat, nodes[startId].lng, nodes[goalId].lat, nodes[goalId].lng);

    while (openSet.size > 0) {
      // Pick node with lowest fScore
      let current = null;
      let lowest = Infinity;
      openSet.forEach(id => {
        if (fScore[id] < lowest) {
          lowest = fScore[id];
          current = id;
        }
      });

      if (current === goalId) {
        // Reconstruct path
        const path = [];
        while (current) {
          path.unshift(current);
          current = cameFrom[current];
        }
        return path;
      }

      openSet.delete(current);

      if (!graph[current]) continue;

      graph[current].forEach(neighbor => {
        const tentativeG = gScore[current] + neighbor.weight;
        if (tentativeG < gScore[neighbor.to]) {
          cameFrom[neighbor.to] = current;
          gScore[neighbor.to] = tentativeG;
          fScore[neighbor.to] = tentativeG + distanceMeters(
            nodes[neighbor.to].lat,
            nodes[neighbor.to].lng,
            nodes[goalId].lat,
            nodes[goalId].lng
          );
          openSet.add(neighbor.to);
        }
      });
    }

    return null; // no path found
  }

  // Draw route on map
  function drawRoute(nodePath) {
    if (currentRouteLayer) {
      map.removeLayer(currentRouteLayer);
    }

    const routeCoords = nodePath.map(id => [nodes[id].lat, nodes[id].lng]);

    // Glow effect: shadow polyline + main polyline
    const shadow = L.polyline(routeCoords, {
      color: "#00FFFF",
      weight: 5,
      opacity: 0.2,
      smoothFactor: 2
    }).addTo(map);

    const main = L.polyline(routeCoords, {
      color: "#00FFFF",
      weight: 2.5,
      opacity: 1,
      smoothFactor: 2
    }).addTo(map);

    currentRouteLayer = L.layerGroup([shadow, main]);
    map.addLayer(currentRouteLayer);

    
  }

  function createRoute(toLat, toLng, targetBuilding = null, isIndoor = false, indoorCategory = null) {
    console.log("=== CREATE ROUTE ===");
    console.log("Destination:", toLat, toLng);
    console.log("Target building:", targetBuilding);
    console.log("Is indoor:", isIndoor);
    console.log("Indoor category:", indoorCategory);
    
    if (!window.userLocation) {
        alert("📍User location not available. Please enable GPS.");
        return;
    }

    // If it's an indoor location, route to building center first
    let finalDestination = { lat: toLat, lng: toLng };
    let displayName = targetBuilding || "Destination";
    
    if (isIndoor && targetBuilding) {
        // Get building center coordinates
        const buildingCenter = getBuildingCenter(targetBuilding);
        if (buildingCenter) {
            console.log(`🏢 Indoor location detected, routing to ${targetBuilding} center first`);
            finalDestination = buildingCenter;
            displayName = `${targetBuilding} (Building Entrance)`;
        }
    }

    const startNode = snapToNearestNode(window.userLocation.latitude, window.userLocation.longitude);
    const endNode = snapToNearestNode(finalDestination.lat, finalDestination.lng, targetBuilding);
    
    console.log("Snapped start/end nodes:", startNode, endNode);

    if (!startNode || !endNode) {
        alert("No route found: could not snap to nodes.");
        return;
    }

    const nodePath = aStar(startNode, endNode);
    if (!nodePath) {
        alert("No path found between selected points.");
        return;
    }

    drawRoute(nodePath);
    
    // Store original destination for info display
    window.currentDestination = {
        lat: toLat,
        lng: toLng,
        name: targetBuilding || "Destination",
        isIndoor: isIndoor,
        building: targetBuilding
    };
    
    return currentRouteLayer;
  }

  function userRemoveRoute() {
    if (currentRouteLayer) {
      map.removeLayer(currentRouteLayer);
      currentRouteLayer = null;
    }
  }

window.showRouteInfoPopup = function(routeLayer, locationName) {
  const existing = document.getElementById("routeInfoPopup"); 
  if (existing) existing.remove();
  if (!routeLayer) return;  
    const popupDiv = document.createElement('div');
    popupDiv.id = "routeInfoPopup"; 
    popupDiv.className = "route-info-card";

    // Get all LatLngs from polylines in the layer group
    let routeCoords = [];
    routeLayer.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            routeCoords = layer.getLatLngs();
        }
    });

    if (routeCoords.length < 2) return;

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < routeCoords.length - 1; i++) {
        totalDistance += distanceMeters(
            routeCoords[i].lat,
            routeCoords[i].lng,
            routeCoords[i + 1].lat,
            routeCoords[i + 1].lng
        );
    }

    let distanceText;

    if (totalDistance < 1000) {
        distanceText = `${Math.round(totalDistance)} m`;
    } else {
        distanceText = `${(totalDistance / 1000).toFixed(2)} km`;
    }
    const walkingSpeed = 1.4; // m/s ~ 5 km/h
    const durationMin = Math.ceil(totalDistance / walkingSpeed / 60);

  
  
    popupDiv.innerHTML = `
  <div class="route-info-header">
    <span class="route-icon">🗺️</span>
    <span class="route-title">${locationName}</span>
    <button class="route-close">✕</button>
  </div>

  <div class="route-info-body">
    <div class="route-metric">
      <span>🚶</span>
      <strong>${durationMin} min</strong>
    </div>
    <div class="route-metric">
      <span>📏</span>
      <strong>${distanceText} </strong>
    </div>
  </div>
`;

    document.body.appendChild(popupDiv);

    // Close button
    const closeBtn = popupDiv.querySelector('button');
    closeBtn.addEventListener('click', () => popupDiv.remove());

};



  return {
    createRoute,
    userRemoveRoute
  };
}

window.router = startRouting();
