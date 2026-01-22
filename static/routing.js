
function startRouting() {
  let currentRouteLayer = null;

  // Find nearest node to a lat/lng
  function snapToNearestNode(lat, lng) {
    let nearestId = null;
    let minDist = Infinity;

    Object.entries(nodes).forEach(([id, node]) => {
      const d = distanceMeters(lat, lng, node.lat, node.lng);
      if (d < minDist) {
        minDist = d;
        nearestId = id;
      }
    });

    return nearestId;
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

    map.fitBounds(main.getBounds());
  }

  function createRoute(toLat, toLng) {
    if (!window.userLocation) {
      alert("📍User location not available. Please enable GPS.");
      return;
    }

    const startNode = snapToNearestNode(window.userLocation.latitude, window.userLocation.longitude);
    const endNode = snapToNearestNode(toLat, toLng);
    console.log("Snapped start/end nodes:", startNode, endNode);
    console.log("Start node data:", nodes[startNode]);
    console.log("End node data:", nodes[endNode]);      

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
    return currentRouteLayer;

  }

  function userRemoveRoute() {
    if (currentRouteLayer) {
      map.removeLayer(currentRouteLayer);
      currentRouteLayer = null;
    }
  }

// ---------- Show route info popup ----------
window.showRouteInfoPopup = function(routeLayer, locationName) {
    if (!routeLayer) return;

    // Calculate total distance and estimated duration
    let totalDistance = 0; // in meters
    for (let i = 0; i < routeLayer.length - 1; i++) {
        const p1 = routeLayer[i];
        const p2 = routeLayer[i + 1];
        totalDistance += distanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);
    }

    const distanceKm = (totalDistance / 1000).toFixed(2);
    const walkingSpeed = 1.4; // m/s ~ 5 km/h
    const durationMin = Math.ceil(totalDistance / walkingSpeed / 60);

    // Create popup div
    const popupDiv = document.createElement('div');
    popupDiv.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff8e1;
        padding: 12px 20px;
        border-radius: 10px;
        border: 1px solid #ffd54f;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        font-family: sans-serif;
        font-size: 14px;
        text-align: center;
    `;
    popupDiv.innerHTML = `
        🗺️ Route to <strong>${locationName}</strong><br>
        Distance: <strong>${distanceKm} km</strong><br>
        ETA: <strong>${durationMin} min</strong>
        <button style="margin-top:6px; padding:4px 8px; background:#2196f3; color:white; border:none; border-radius:4px; cursor:pointer;">Close</button>
    `;

    document.body.appendChild(popupDiv);

    // Close button
    const closeBtn = popupDiv.querySelector('button');
    closeBtn.addEventListener('click', () => popupDiv.remove());

    // Auto remove after 12s
    setTimeout(() => {
        if (popupDiv.parentNode) popupDiv.remove();
    }, 12000);
};


  return {
    createRoute,
    userRemoveRoute
  };
}

window.router = startRouting();
