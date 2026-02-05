function makeGPS() {
    let watchID = null;

    function startTrackingUser() {
        if (watchID !== null) {
            return; // Already tracking
        }

        if (navigator.geolocation) {
            watchID = navigator.geolocation.watchPosition(
                function (position) {   
                    let lat  = position.coords.latitude;
                    let long = position.coords.longitude;
                    console.log("User moved to: ", lat.toFixed(6),"," , long.toFixed(6));
                    if (window.userLocationMarker) {
                        window.userLocationMarker.setLatLng([lat, long]);
                    }

                    window.userLocation = { latitude: lat, longitude: long };
                    if (window.currentDestination) {
                    router.createRoute(window.currentDestination.lat, window.currentDestination.lng, window.currentDestination.building || null,
                    window.currentDestination.isIndoor || false);
                    }
                },
                function (gpsError) {
                    if (gpsError.code === gpsError.PERMISSION_DENIED) {
                        alert("📍 You blocked location access. Please allow GPS in your browser settings.");
                    } else if (gpsError.code === gpsError.POSITION_UNAVAILABLE) {
                        alert("📍 Location information is unavailable. Please try again later.");
                    } else if (gpsError.code === gpsError.TIMEOUT) {
                    } else {
                        alert("📍 An unknown error occurred while trying to get your location.");
                    } 
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }
    }
    function findCurrentLocation() {
        console.log("Finding current location...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    let lat  = position.coords.latitude;
                    let long = position.coords.longitude;
                    
                    if (!window.userLocationMarker) {
                        const userLocationIcon = L.divIcon({
                            className: "userLocationIcon",
                            html: '<div class="blue-circle"></div>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 30]
                        });
                        window.userLocationMarker = L.marker([lat, long], {icon: userLocationIcon}).addTo(map).bindPopup("You are here!").openPopup();
                    } else {
                        window.userLocationMarker.setLatLng([lat, long]);
                    }

                    map.setView([lat, long],20);
                    window.userLocation = {latitude: lat, longitude: long};
                    startTrackingUser();
                },
                
                function (gpsError) {
                    if (gpsError.code === gpsError.PERMISSION_DENIED) {
                        alert("📍 You blocked location access. Please allow GPS in your browser settings.");
                    } else if (gpsError.code === gpsError.POSITION_UNAVAILABLE) {
                        alert("📍 Location information is unavailable. Please try again later.");
                    } else if (gpsError.code === gpsError.TIMEOUT) {
                        alert("📍 The request to get your location timed out. Please try again.");
                    } else {
                        alert("📍 An unknown error occurred while trying to get your location.");
                    }
                }
            
            );
        } else {
            alert("Geolocation is not supported by this browser! Try using Chrome, Firefox, or Edge.");
            }
    };
    return {
        findCurrentLocation: findCurrentLocation,
        startTrackingUser: startTrackingUser
    };
}

const gps = makeGPS();
