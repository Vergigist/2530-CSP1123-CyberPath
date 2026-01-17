// nodes.js - Node management interface (Rewritten Version)

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Node management system initializing...');
    
    // ============================================
    // 1. ELEMENT REFERENCES
    // ============================================
    const nodeControlsBtn = document.getElementById('nodeControlsBtn');
    const nodePanel = document.getElementById('nodePanel');
    const addNodeBtn = document.getElementById('addNodeBtn');
    const connectNodesBtn = document.getElementById('connectNodesBtn');
    const closeNodePanel = document.getElementById('closeNodePanel');
    const nodeStatus = document.getElementById('nodeStatus');
    
    console.log('📋 Element check:', {
        nodeControlsBtn: !!nodeControlsBtn,
        nodePanel: !!nodePanel,
        addNodeBtn: !!addNodeBtn,
        connectNodesBtn: !!connectNodesBtn,
        closeNodePanel: !!closeNodePanel,
        nodeStatus: !!nodeStatus,
        windowMap: !!window.map
    });
    
    // ============================================
    // 2. STATE VARIABLES
    // ============================================
    let addingNode = false;
    let connectingNodes = false;
    let firstNode = null;
    let tempLine = null;
    let nodeMarkersLayer = null;
    let visualGuide = null;
    let activeMode = 'none'; // 'none', 'add', 'connect'
    
    // ============================================
    // 3. INITIAL SETUP
    // ============================================
    if (!window.map) {
        console.error('❌ Map not available! Make sure map is initialized before nodes.js');
        return;
    }
    
    // Initialize node markers layer
    nodeMarkersLayer = L.layerGroup().addTo(window.map);
    
    // ============================================
    // 4. EVENT LISTENERS - UI CONTROLS
    // ============================================
    
    // Open/close node panel
    if (nodeControlsBtn) {
        nodeControlsBtn.addEventListener('click', function() {
            console.log('📂 Opening node management panel');
            nodePanel.classList.toggle('hidden');
            if (!nodePanel.classList.contains('hidden')) {
                loadAndDisplayNodes();
            }
        });
    }
    
    // Close panel
    if (closeNodePanel) {
        closeNodePanel.addEventListener('click', function() {
            console.log('❌ Closing node panel');
            nodePanel.classList.add('hidden');
            resetNodeMode();
        });
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (nodePanel && !nodePanel.classList.contains('hidden') && 
            e.target === nodePanel) {
            nodePanel.classList.add('hidden');
            resetNodeMode();
        }
    });
    
    // ============================================
    // 5. NODE MANAGEMENT MODES
    // ============================================
    
    // Start adding node mode
    if (addNodeBtn) {
        addNodeBtn.addEventListener('click', function() {
            console.log('➕ Activating ADD NODE mode');
            activateAddNodeMode();
        });
    }
    
    // Start connecting nodes mode
    if (connectNodesBtn) {
        connectNodesBtn.addEventListener('click', function() {
            console.log('🔗 Activating CONNECT NODES mode');
            activateConnectNodesMode();
        });
    }
    
    // ============================================
    // 6. MODE FUNCTIONS
    // ============================================
    
    function activateAddNodeMode() {
        resetNodeMode();
        addingNode = true;
        activeMode = 'add';
        
        // Update UI
        addNodeBtn.textContent = 'Click Map to Add Node (Click to Cancel)';
        addNodeBtn.style.background = '#4CAF50';
        addNodeBtn.style.color = 'white';
        
        connectNodesBtn.textContent = 'Connect Nodes';
        connectNodesBtn.style.background = '';
        connectNodesBtn.style.color = '';
        
        nodeStatus.textContent = 'Click anywhere on the map to add a walking path node';
        nodeStatus.style.color = '#2196F3';
        nodeStatus.style.borderLeftColor = '#2196F3';
        nodeStatus.style.fontWeight = 'bold';
        
        // Add visual guide
        addVisualGuide();
        
        console.log('✅ Add node mode ACTIVE - Click on map to add nodes');
    }
    
    function activateConnectNodesMode() {
        resetNodeMode();
        connectingNodes = true;
        activeMode = 'connect';
        firstNode = null;
        
        // Update UI
        connectNodesBtn.textContent = 'Click First Node (Click to Cancel)';
        connectNodesBtn.style.background = '#FF9800';
        connectNodesBtn.style.color = 'white';
        
        addNodeBtn.textContent = 'Add New Node';
        addNodeBtn.style.background = '';
        addNodeBtn.style.color = '';
        
        nodeStatus.textContent = 'Click on a node to select it, then click another node to connect them';
        nodeStatus.style.color = '#FF9800';
        nodeStatus.style.borderLeftColor = '#FF9800';
        nodeStatus.style.fontWeight = 'bold';
        
        // Show existing nodes
        showExistingNodes();
        
        console.log('✅ Connect nodes mode ACTIVE - Click nodes to connect them');
    }
    
    // ============================================
    // 7. MAP INTERACTION
    // ============================================
    
    // Handle map clicks
    window.map.on('click', function(e) {
        console.log('🗺️ Map clicked:', e.latlng);
        
        if (addingNode) {
            console.log('➕ Adding node at:', e.latlng);
            addNodeAt(e.latlng.lat, e.latlng.lng);
        }
    });
    
    // Handle click on existing node markers
    function handleNodeClick(node, e) {
        console.log('🎯 Node clicked:', node);
        
        if (!firstNode) {
            // First node selected
            firstNode = node;
            nodeStatus.textContent = `Selected: ${node.name || 'Node ' + node.id}. Click another node to connect.`;
            
            // Draw temporary line
            tempLine = L.polyline([
                [node.latitude, node.longitude],
                [node.latitude, node.longitude]
            ], {
                color: '#FF9800',
                weight: 3,
                dashArray: '10, 5',
                opacity: 0.7
            }).addTo(window.map);
            
            // Update line on mouse move
            window.map.on('mousemove', updateTempLine);
        } else {
            // Second node selected
            if (firstNode.id === node.id) {
                alert("Cannot connect a node to itself!");
                return;
            }
            
            // Create edge
            createEdge(firstNode.id, node.id);
        }
    }
    
    // ============================================
    // 8. NODE OPERATIONS
    // ============================================
    
    async function addNodeAt(lat, lng) {
        console.log('📝 Adding node at:', lat, lng);
        
        const name = prompt('Node name (e.g., "Main Entrance", "Library Intersection"):');
        if (name === null) {
            resetNodeMode();
            return;
        }
        
        const type = prompt('Node type (intersection, entrance, landmark, stair, ramp):', 'intersection');
        if (type === null) {
            resetNodeMode();
            return;
        }
        
        try {
            nodeStatus.textContent = 'Adding node...';
            nodeStatus.style.color = '#2196F3';
            
            const response = await fetch('/api/add-node', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: name || '',
                    latitude: lat,
                    longitude: lng,
                    type: type || 'intersection',
                    is_indoor: false
                })
            });
            
            const data = await response.json();
            console.log('📡 Server response:', data);
            
            if (data.success) {
                nodeStatus.textContent = `✅ Node "${name}" added successfully!`;
                nodeStatus.style.color = '#4CAF50';
                nodeStatus.style.borderLeftColor = '#4CAF50';
                
                // Visual feedback
                L.circleMarker([lat, lng], {
                    color: '#4CAF50',
                    radius: 10,
                    fillColor: '#4CAF50',
                    fillOpacity: 0.8,
                    weight: 2
                })
                .addTo(window.map)
                .bindPopup(`New: ${name}`)
                .openPopup();
                
                // Refresh node list
                loadAndDisplayNodes();
                
                // Auto reset after success
                setTimeout(() => {
                    if (addingNode) {
                        // Stay in add mode for next node
                        nodeStatus.textContent = 'Click anywhere on the map to add another node';
                        nodeStatus.style.color = '#2196F3';
                    }
                }, 2000);
                
            } else {
                nodeStatus.textContent = `❌ Failed to add node: ${data.message}`;
                nodeStatus.style.color = '#F44336';
                nodeStatus.style.borderLeftColor = '#F44336';
                
                // Auto reset after error
                setTimeout(() => {
                    resetNodeMode();
                }, 3000);
            }
        } catch (error) {
            console.error('❌ Error adding node:', error);
            nodeStatus.textContent = '❌ Error adding node. Check console.';
            nodeStatus.style.color = '#F44336';
            nodeStatus.style.borderLeftColor = '#F44336';
        }
    }
    
    async function createEdge(nodeAId, nodeBId) {
        const pathType = prompt('Path type (sidewalk, pedestrian, stair, ramp):', 'sidewalk');
        if (pathType === null) {
            resetNodeMode();
            return;
        }
        
        const isBidirectional = confirm('Is this path bidirectional? (OK = Yes, Cancel = One-way)');
        
        try {
            nodeStatus.textContent = 'Creating path...';
            nodeStatus.style.color = '#2196F3';
            
            const response = await fetch('/api/add-edge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    node_a_id: nodeAId,
                    node_b_id: nodeBId,
                    path_type: pathType || 'sidewalk',
                    is_bidirectional: isBidirectional,
                    is_indoor: false
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                nodeStatus.textContent = `✅ Path created successfully!`;
                nodeStatus.style.color = '#4CAF50';
                nodeStatus.style.borderLeftColor = '#4CAF50';
                
                // Draw the actual path
                const nodeA = await getNodeById(nodeAId);
                const nodeB = await getNodeById(nodeBId);
                
                if (nodeA && nodeB) {
                    L.polyline([
                        [nodeA.latitude, nodeA.longitude],
                        [nodeB.latitude, nodeB.longitude]
                    ], {
                        color: '#4CAF50',
                        weight: 4,
                        opacity: 0.7
                    }).addTo(window.map);
                }
                
                // Refresh routing data
                if (window.router && window.router.refreshNodes) {
                    window.router.refreshNodes();
                }
                
                // Reset after success
                setTimeout(() => {
                    activateConnectNodesMode(); // Go back to connect mode
                }, 2000);
                
            } else {
                nodeStatus.textContent = `❌ Failed to create path: ${data.message}`;
                nodeStatus.style.color = '#F44336';
                nodeStatus.style.borderLeftColor = '#F44336';
            }
        } catch (error) {
            console.error('❌ Error creating edge:', error);
            nodeStatus.textContent = '❌ Error creating path. Check console.';
            nodeStatus.style.color = '#F44336';
            nodeStatus.style.borderLeftColor = '#F44336';
        }
    }
    
    // ============================================
    // 9. HELPER FUNCTIONS
    // ============================================
    
    function addVisualGuide() {
        // Remove existing guide
        if (visualGuide) {
            window.map.removeLayer(visualGuide);
        }
        
        // Add cursor style
        document.body.style.cursor = 'crosshair';
        
        // Add instructional popup
        visualGuide = L.popup()
            .setLatLng(window.map.getCenter())
            .setContent('<div style="text-align: center; padding: 10px;"><b>➕ Add Node Mode</b><br>Click anywhere on the map to add a walking path node</div>')
            .openOn(window.map);
    }
    
    function updateTempLine(e) {
        if (!tempLine || !firstNode) return;
        
        const latlngs = [
            [firstNode.latitude, firstNode.longitude],
            [e.latlng.lat, e.latlng.lng]
        ];
        
        tempLine.setLatLngs(latlngs);
    }
    
    async function getNodeById(nodeId) {
        try {
            const response = await fetch('/api/nodes');
            const nodes = await response.json();
            return nodes.find(n => n.id === nodeId);
        } catch (error) {
            console.error('Error fetching node:', error);
            return null;
        }
    }
    
    function resetNodeMode() {
        console.log('🔄 Resetting node mode');
        
        addingNode = false;
        connectingNodes = false;
        firstNode = null;
        activeMode = 'none';
        
        // Reset UI
        if (addNodeBtn) {
            addNodeBtn.textContent = 'Add New Node';
            addNodeBtn.style.background = '';
            addNodeBtn.style.color = '';
        }
        
        if (connectNodesBtn) {
            connectNodesBtn.textContent = 'Connect Nodes';
            connectNodesBtn.style.background = '';
            connectNodesBtn.style.color = '';
        }
        
        if (nodeStatus) {
            nodeStatus.textContent = 'Click a button above to start';
            nodeStatus.style.color = '';
            nodeStatus.style.borderLeftColor = '#2196F3';
            nodeStatus.style.fontWeight = 'normal';
        }
        
        // Clean up map elements
        if (tempLine) {
            window.map.removeLayer(tempLine);
            tempLine = null;
        }
        
        if (visualGuide) {
            window.map.removeLayer(visualGuide);
            visualGuide = null;
        }
        
        // Reset cursor
        document.body.style.cursor = '';
        
        // Remove event listeners
        window.map.off('mousemove', updateTempLine);
        
        console.log('✅ Node mode reset complete');
    }
    
    function showNodeOnMap(node) {
        const icon = L.divIcon({
            className: 'node-marker',
            html: `
                <div style="
                    width: 20px; 
                    height: 20px; 
                    background: ${connectingNodes ? '#FF9800' : '#2196F3'}; 
                    border-radius: 50%; 
                    border: 3px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    cursor: pointer;
                "></div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });
        
        const marker = L.marker([node.latitude, node.longitude], { icon })
            .addTo(nodeMarkersLayer)
            .bindPopup(`<b>${node.name || 'Node ' + node.id}</b><br>Type: ${node.type}`)
            .on('click', function(e) {
                if (connectingNodes) {
                    handleNodeClick(node, e);
                }
            });
        
        return marker;
    }
    
    function showExistingNodes() {
        if (!nodeMarkersLayer) {
            nodeMarkersLayer = L.layerGroup().addTo(window.map);
        } else {
            nodeMarkersLayer.clearLayers();
        }
        
        loadAndDisplayNodes();
    }
    
    async function loadAndDisplayNodes() {
        try {
            console.log('📡 Loading nodes from server...');
            const response = await fetch('/api/nodes');
            const nodes = await response.json();
            
            console.log(`✅ Loaded ${nodes.length} nodes`);
            
            if (!nodeMarkersLayer) {
                nodeMarkersLayer = L.layerGroup().addTo(window.map);
            } else {
                nodeMarkersLayer.clearLayers();
            }
            
            // Display outdoor nodes
            nodes.filter(node => !node.is_indoor).forEach(node => {
                showNodeOnMap(node);
            });
            
        } catch (error) {
            console.error('❌ Error loading nodes:', error);
            nodeStatus.textContent = '❌ Error loading nodes. Check console.';
            nodeStatus.style.color = '#F44336';
        }
    }
    
    // ============================================
    // 10. INITIALIZATION
    // ============================================
    
    console.log('✅ Node management system initialized successfully');
    console.log('💡 Tips:');
    console.log('1. Click "Add New Node" then click on the map');
    console.log('2. Click "Connect Nodes" then click two nodes to connect them');
    console.log('3. Check browser console for detailed logs');
    
    // Load initial nodes
    loadAndDisplayNodes();
});