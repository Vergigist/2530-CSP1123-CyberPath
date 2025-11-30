function startRouting () {
    let currentRoute = null;

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
    }

    return {
        createRoute: createRoute,
        userRemoveRoute: userRemoveRoute
    };
}

const router = startRouting();