// Global variables
window.graph = {};
window.nodes = {};   
window.edges = [];   
window.nodeIdCounter = 1;

// Haversine distance in meters
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



function makeNodeId() { return "n" + nodeIdCounter++; }

function buildGraphFromGeoJSON() {
  if (!campusGeoJSON) {
    console.log("GeoJSON not loaded yet");
    return;
  }

  // Reset globals
  window.nodes = {};
  window.edges = [];
  window.graph = {};
  nodeIdCounter = 1;

  campusGeoJSON.features.forEach(feature => {
    if (feature.geometry.type !== "LineString") return;

    const coords = feature.geometry.coordinates;
    let prevNodeId = null;

    coords.forEach(coord => {
      const [lng, lat] = coord;
      const nodeId = "n" + nodeIdCounter++;
      window.nodes[nodeId] = { lat, lng };

      if (prevNodeId) {
        const dist = distanceMeters(
          window.nodes[prevNodeId].lat, window.nodes[prevNodeId].lng,
          lat, lng
        );

        window.edges.push({ from: prevNodeId, to: nodeId, weight: dist });
        window.edges.push({ from: nodeId, to: prevNodeId, weight: dist });
      }

      prevNodeId = nodeId;
    });
  });

  // Merge nodes within 2m
  const merged = mergeCloseNodes(window.nodes, window.edges, 5);
  window.nodes = merged.nodes;
  window.edges = merged.edges;

  // Build adjacency list for routing
  window.edges.forEach(edge => {
    if (!window.graph[edge.from]) window.graph[edge.from] = [];
    window.graph[edge.from].push({ to: edge.to, weight: edge.weight });
  });

  console.log("Merged Nodes count:", Object.keys(window.nodes).length);
  console.log("Merged Edges count:", window.edges.length);
  console.log("Graph ready for routing:", window.graph);
}

// Merge nodes closer than threshold
function mergeCloseNodes(nodes, edges, threshold) {
  const nodeIds = Object.keys(nodes);
  const merged = {};
  const mapping = {};

  for (let i = 0; i < nodeIds.length; i++) {
    const idA = nodeIds[i];
    if (mapping[idA]) continue;

    for (let j = i + 1; j < nodeIds.length; j++) {
      const idB = nodeIds[j];
      if (mapping[idB]) continue;

      const d = distanceMeters(
        nodes[idA].lat, nodes[idA].lng,
        nodes[idB].lat, nodes[idB].lng
      );

      if (d < threshold) {
        mapping[idB] = idA;
      }
    }

    if (!merged[idA]) merged[idA] = nodes[idA];
  }

  // Update edges
  const newEdges = edges.map(edge => {
    const from = mapping[edge.from] || edge.from;
    const to = mapping[edge.to] || edge.to;
    if (from === to) return null;
    return { from, to, weight: edge.weight };
  }).filter(e => e);

  return { nodes: merged, edges: newEdges };
}

