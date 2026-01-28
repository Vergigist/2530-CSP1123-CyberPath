// Initialise Map with zoom limits
let selectedCategoryId = null;

var map = L.map('map', {
    center: [2.928, 101.64192],
    zoom: 16,
    minZoom: 16,   // allow zooming all the way out
    maxZoom: 20   // allow zooming in super close
});

const darkModeToggle = document.getElementById('darkModeToggle');
let campusGeoJSON = null;

fetch("static/newcampus.geojson")
  
.then(response => response.json())
  
  .then(data => {
    
    campusGeoJSON = data;
    console.log("Loaded GeoJSON!");
    console.log("First coordinate:", campusGeoJSON.features[0].geometry.coordinates[0]);

    const walkwayLayer = L.geoJSON(campusGeoJSON, {
      style: {
        color: "#000000",
        weight: 2,
        opacity: 0.1,
        dashArray: "5, 5",
        smoothFactor: 1.5
      }
    }).addTo(map);

    map.fitBounds(walkwayLayer.getBounds());
    
    if (typeof buildGraphFromGeoJSON === "function") {
      buildGraphFromGeoJSON();
    }
  })
  .catch(error => console.error("Error loading GeoJSON:", error));

// Add tile layer
L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    { 
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20   // match map maxZoom
    }
).addTo(map);

// Remove default zoom control buttons
map.removeControl(map.zoomControl);
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const centerBtn = document.getElementById('centerBtn');

// Function to update toggleBtn position
function updateTogglePosition() {
    toggleBtn.style.left = sidebar.classList.contains('active') ? '270px' : '10px';
}

// Initial load
updateTogglePosition();

// Toggle sidebar on button click
toggleBtn.addEventListener('click', () => {
    content.classList.toggle('sidebar-open');
    sidebar.classList.toggle('active');
    updateTogglePosition(); // update button dynamically
    setTimeout(() => {
        map.invalidateSize();
    }, 310);
});

// Center map
centerBtn.addEventListener('click', () => {
    map.setView([2.928, 101.64192], 16);
});

// Update map size after sidebar transition
sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});

// Admin 
const adminBtn = document.getElementById('adminBtn');
const adminPopup = document.getElementById('adminPopup');
const closeAdminPopup = document.getElementById('closePopup');

const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        document.querySelectorAll(".error-message").forEach(el => el.textContent = "");

        const formData = new FormData(signupForm);
        const res = await fetch(signupForm.action, { method: "POST", body: formData });
        const data = await res.json();

        if (!data.success) {
            if (data.field) {
                const errorSpan = document.getElementById(data.field + "Error");
                if (errorSpan) errorSpan.textContent = data.message;
            }
            return;
        }

        alert(data.message);
        adminPopup.style.display = 'none';
    });
}

adminBtn.addEventListener('click', () => {
    adminPopup.style.display = 'flex';
    signupForm.querySelectorAll("input").forEach(input => input.value = "");
    signupForm.querySelectorAll(".error-message").forEach(span => span.textContent = "");
});

closeAdminPopup.addEventListener('click', () => {
    adminPopup.style.display = 'none'
});

window.addEventListener('click', (e) => { 
    if(e.target === adminPopup) 
        adminPopup.style.display = 'none'; 
});

const tabs = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.tab-form');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    });
});

const coordsDisplay = document.getElementById('coords-display');

map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    coordsDisplay.textContent = `Latitude: ${lat}, Longitude: ${lng}`;

    // const routeHere = confirm("Start pathing to this location? (" + lat + ", " + lng + ")?");
    // if (routeHere) {
    //     router.createRoute(parseFloat(lat), parseFloat(lng));
    // }
});


// Admin dashboard
const adminSidebar = document.getElementById("adminSidebar");
const adminToggleBtn = document.getElementById("adminToggleBtn");

if (adminToggleBtn && adminSidebar) {
    adminToggleBtn.addEventListener("click", () => {
        adminSidebar.classList.toggle("active");
        adminToggleBtn.classList.toggle("shifted");
    });
}

function showAdminControls() {
    adminToggleBtn.style.display = "block";
}

// GPS
const gpsButton = document.getElementById("gpsButton");
gpsButton.addEventListener("click", gps.findCurrentLocation);

//Clear Route
const userRemoveRouteButton = document.getElementById("userRemoveRouteButton");
userRemoveRouteButton.addEventListener("click", router.userRemoveRoute);

// Add location form
const addLocationBtn = document.getElementById("addLocationBtn");
const addLocationForm = document.getElementById("addLocationForm");
const pickFromMapBtn = document.getElementById("pickFromMapBtn");
const locCoordsInput = document.getElementById("locCoords");
const closeLocationFormBtn = document.getElementById("closeAddLocation");

let pickMode = false;
let activePopup = null;
let activeCoordsInput = null;

addLocationBtn.addEventListener("click", () => {
    addLocationForm.classList.remove("hidden");
});

pickFromMapBtn.addEventListener("click", () => {
    activePopup = addLocationForm;
    activeCoordsInput = locCoordsInput;

    addLocationForm.classList.add("hidden");
    pickMode = true;
});

if (closeLocationFormBtn) {
    closeLocationFormBtn.addEventListener("click", () => {
        addLocationForm.classList.add("hidden");
        pickMode = false;
    });
}

//marker icon change

const ICONS = {
    "Lecture Hall": L.icon({
        iconUrl: "/static/icons/default.png",
        iconSize: [28, 34],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    }),
    "Food & Drinks": L.icon({
        iconUrl: "/static/icons/food&drinks.png",
        iconSize: [28, 34],
        iconAnchor: [14, 28]
    }),
    "Facilities": L.icon({
        iconUrl: "/static/icons/default.png",
        iconSize: [28, 34],
        iconAnchor: [14, 28]
    }),
    "Recreation": L.icon({
        iconUrl: "/static/icons/recreation.png",
        iconSize: [28, 34],
        iconAnchor: [14, 28]
    }),
    "default": L.icon({
        iconUrl: "/static/icons/default.png",
        iconSize: [28, 34],
        iconAnchor: [13, 26]
    })
};

function getCategoryIcon(category) {
    return ICONS[category] || ICONS.default;
}

// Map picking for both add + edit
map.on("click", function (e) {
    if (!pickMode || !activePopup || !activeCoordsInput) return;

    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    activeCoordsInput.value = `${lat}, ${lng}`;

    activePopup.classList.remove("hidden");

    pickMode = false;
    activePopup = null;
    activeCoordsInput = null;
});

// View all location
const viewAllBtn = document.getElementById("viewAllBtn");
const viewAllBtnUser = document.getElementById("viewAllBtnUser");
const viewLocationPopup = document.getElementById("viewLocationPopup");
const closePopupView = document.getElementById("closePopup");
const searchInput = document.getElementById("searchLocation");
const locationList = document.getElementById("locationList");

viewAllBtn.addEventListener("click", () => {
    openLocationPopup("view");
});

viewAllBtnUser.addEventListener("click", () => {
    openLocationPopup("view");
});

closePopupView.addEventListener("click", () => {
    viewLocationPopup.classList.add("hidden");
});

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();

    const rows = locationList.querySelectorAll(".popup-row:not(.header)");
    rows.forEach(row => {
        const name = row.children[0].textContent.toLowerCase();
        const category = row.children[1].textContent.toLowerCase();

        // show row only if name or category includes query
        if (name.includes(query) || category.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});

//danish pathing
// Use a flag to prevent double clicks
let routingInProgress = false;

locationList.addEventListener("click", (e) => {
    const btn = e.target.closest(".path-btn");
    if (!btn) return;

    if (routingInProgress) return; // ignore if already routing
    routingInProgress = true;

    try {
        const targetLat = parseFloat(btn.dataset.lat);
        const targetLng = parseFloat(btn.dataset.lng);
        const locationName = btn.dataset.name;

        if (!window.userLocation) {
            alert("📍 Please enable GPS first!");
            return;
        }

        if (!router?.createRoute) {
            alert("Routing system not ready. Please refresh.");
            return;
        }

        const routeHere = router.createRoute(targetLat, targetLng);
        if (routeHere) {
            alert(`✅ Route created to ${locationName}!`);
        } else {
            alert(`⚠️ Failed to create route to ${locationName}.`);
        }
    } finally {
        routingInProgress = false; // reset flag
    }
});

document.getElementById("markerForm").addEventListener("submit", () => {
    const isIndoorInput = document.querySelector('[name="is_indoor"]');
    const buildingInput = document.querySelector('[name="building_id"]');
    const floorInput = document.querySelector('[name="floor"]');
    const outdoorCategory = document.getElementById("outdoorCategory");
    const indoorCategory = document.getElementById("indoorCategory");

    if (isIndoor === true) {
        isIndoorInput.value = "1";
        buildingInput.value = activeBuildingId;
        floorInput.value = activeFloor;
        outdoorCategory.disabled = true;
        indoorCategory.disabled = false;
    } else {
        isIndoorInput.value = "0";
        buildingInput.value = "";
        floorInput.value = "";
        isIndoorInput.value = "0";
        outdoorCategory.disabled = false;
        indoorCategory.disabled = true;
    }
});

// Edit Location
const editLocationBtn = document.getElementById("editLocationBtn");

editLocationBtn.addEventListener("click", () => {
    openLocationPopup("edit");
});

function openLocationPopup(mode) {
    viewLocationPopup.classList.remove("hidden");
    locationList.innerHTML = "";

    Promise.all([fetchMarkersByCategory(), fetchIndoorMarkers()])
        .then(([outdoorMarkers, indoorMarkers]) => {

            const allMarkers = [
                ...outdoorMarkers,
                ...indoorMarkers.map(m => ({ ...m, type: "indoor" }))
            ];

            allMarkers.forEach(loc => {
                const row = document.createElement("div");
                row.className = "popup-row";
                row.innerHTML = `
                    <span>${loc.name}</span>
                    <span class="col-category">${loc.category ?? "-"}</span>
                    <button class="path-btn" 
                            data-lat="${loc.latitude}" 
                            data-lng="${loc.longitude}"
                            data-name="${loc.name}">
                        Get directions
                    </button>
                    ${mode === "edit" ? `<button class="edit-btn" data-id="${loc.id}" data-type="${loc.type || 'outdoor'}">Edit</button>` : ""}
                `;

                locationList.appendChild(row);
            });

            attachEditButtons();
        });
}


// Edit location form
const editFormPopup = document.getElementById("editLocationFormPopup");
const editFormClose = document.getElementById("closeEditFormPopup");
const editCoordsInput = document.getElementById("editLocCoords");

function attachEditButtons() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            openEditForm(id, type);
        });
    });
}

function openEditForm(id, type) {
    viewLocationPopup.classList.add("hidden");
    editFormPopup.classList.remove("hidden");

    if (type === "indoor") {
        fetchIndoorMarkers().then(markers => {
            const marker = markers.find(m => m.id == id);
            if (!marker) return;

            document.getElementById("editMarkerId").value = marker.id;
            document.getElementById("editLocName").value = marker.name;
            document.getElementById("editLocDesc").value = marker.description;
            document.getElementById("editLocCoords").value = `${marker.latitude}, ${marker.longitude}`;

            document.getElementById("editIsIndoor").value = "1";
            document.getElementById("editBuildingId").value = marker.building;
            document.getElementById("editFloor").value = marker.floor;
        });
    } else {
        fetchMarkersByCategory().then(markers => {
            const marker = markers.find(m => m.id == id);
            if (!marker) return;

            document.getElementById("editMarkerId").value = marker.id;
            document.getElementById("editLocName").value = marker.name;
            document.getElementById("editLocDesc").value = marker.description;
            document.getElementById("editLocCoords").value = `${marker.latitude}, ${marker.longitude}`;

            document.getElementById("editIsIndoor").value = "0";
            document.getElementById("editBuildingId").value = "";
            document.getElementById("editFloor").value = "";
        });
    }

    document.getElementById("editLocationForm").action = `/edit-marker/${id}`;
    pickMode = false;
}

editFormClose.addEventListener("click", () => {
    editFormPopup.classList.add("hidden");
    openLocationPopup("edit");
});

editPickFromMapBtn.addEventListener("click", () => {
    activePopup = editFormPopup;
    activeCoordsInput = editCoordsInput;

    editFormPopup.classList.add("hidden");
    pickMode = true;

})


// Delete location
const deleteLocationBtn = document.getElementById("deleteLocationBtn");
const deleteLocationPopup = document.getElementById("deleteLocationPopup");
const closeDeletePopup = document.getElementById("closeDeletePopup");
const searchDeleteLocation = document.getElementById("searchDeleteLocation");
const deleteLocationList = document.getElementById("deleteLocationList");

deleteLocationBtn.addEventListener("click", () => {
    deleteLocationPopup.classList.remove("hidden");
    populateDeleteList();
});

// Close popup
closeDeletePopup.addEventListener("click", () => {
    deleteLocationPopup.classList.add("hidden");
});

// Filter search
searchDeleteLocation.addEventListener("input", () => {
    const filter = searchDeleteLocation.value.toLowerCase();
    [...deleteLocationList.children].forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(filter)
            ? "block"
            : "none";
    });
});

async function populateDeleteList() {
    try {
        const [outdoorMarkers, indoorMarkers] = await Promise.all([
            fetchMarkersByCategory(),
            fetchIndoorMarkers()
        ]);

        const allMarkers = [
            ...outdoorMarkers,
            ...indoorMarkers.map(m => ({ ...m, type: "indoor" }))
        ];

        deleteLocationList.innerHTML = "";

        allMarkers.forEach(marker => {
            const row = document.createElement("div");
            row.className = "popup-item";
            row.style.padding = "6px 0";

            const label = document.createElement("span");
            label.textContent = marker.name;

            const delBtn = document.createElement("button");
            delBtn.className = "delete-item-btn";
            delBtn.textContent = "Delete";

            delBtn.addEventListener("click", async () => {
                if (confirm(`Delete "${marker.name}"?`)) {
                    await fetch(`/delete-marker/${marker.id}`, { method: "POST" });
                    populateDeleteList();
                }
            });

            row.appendChild(label);
            row.appendChild(delBtn);
            deleteLocationList.appendChild(row);
        });
    } catch (err) {
        console.error("Failed to fetch markers:", err);
    }
}

// Profile 
const profilePopup = document.getElementById("profilePopup");
const closePopupProfile = document.getElementById("closeProfilePopup");
const aboutMeInput = document.getElementById("profileAboutMe");
const emailInput = document.getElementById("profileEmail");
let openedFromManageAdmins = false;

async function openProfile(userId = null, editable = true) {
    try {
        let url = userId ? `/api/admin/${userId}` : `/api/admin/me`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
            alert("Failed to load profile: " + (data.message || ""));
            return false;
        }

        const emailInput = document.getElementById("profileEmail");
        const aboutMeInput = document.getElementById("profileAboutMe");
        const profilePopup = document.getElementById("profilePopup");

        emailInput.value = data.email;
        aboutMeInput.value = data.about_me || "";
        aboutMeInput.readOnly = !editable;

        profilePopup.classList.remove("hidden");
        return true;
    } catch (err) {
        console.error("Error fetching profile data:", err);
        alert("Error fetching profile data.");
        return false;
    }
}


document.getElementById("profileBtn")?.addEventListener("click", () => {
    openedFromManageAdmins = false;
    openProfile(null, true);
});

closePopupProfile.addEventListener("click", () => {
    profilePopup.classList.add("hidden");

    if (openedFromManageAdmins) {
        document.getElementById("manageAdminsPopup").classList.remove("hidden");
        openedFromManageAdmins = false;
    }
});

//Change Email popup
const changeEmailBtn = document.getElementById("changeEmailBtn");
const changeEmailPopup = document.getElementById("changeEmailPopup");
const closeChangeEmailPopup = document.getElementById("closeChangeEmailPopup");

changeEmailBtn.addEventListener("click", () => {
    profilePopup.classList.add("hidden");
    changeEmailPopup.classList.remove("hidden");
});

closeChangeEmailPopup.addEventListener("click", () => {
    changeEmailPopup.classList.add("hidden");
    profilePopup.classList.remove("hidden");
});

//Change Password popup
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordPopup = document.getElementById("changePasswordPopup");
const closeChangePasswordPopup = document.getElementById("closeChangePasswordPopup");

changePasswordBtn.addEventListener("click", () => {
    profilePopup.classList.add("hidden");
    changePasswordPopup.classList.remove("hidden");
});

closeChangePasswordPopup.addEventListener("click", () => {
    changePasswordPopup.classList.add("hidden");
    profilePopup.classList.remove("hidden");
});

document.addEventListener("DOMContentLoaded", function () {
    const aboutInput = document.getElementById("profileAboutMe");
    const aboutStatus = document.getElementById("aboutStatus");

    let aboutTimeout;

    if (!aboutInput) return;

    aboutInput.addEventListener("input", function () {
        clearTimeout(aboutTimeout);

        // show "Saving..."
        if (aboutStatus) {
            aboutStatus.textContent = "Saving...";
            aboutStatus.style.opacity = "1";
            aboutStatus.style.color = "#888";
        }

        aboutTimeout = setTimeout(async () => {
            try {
                const res = await fetch("/update-about-me", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ about_me: aboutInput.value })
                });

                if (res.ok && aboutStatus) {
                    aboutStatus.textContent = "Saved ✓";
                    aboutStatus.style.color = "green";

                    // fade out after a moment
                    setTimeout(() => {
                        aboutStatus.style.opacity = "0";
                    }, 1200);
                }
            } catch (err) {
                if (aboutStatus) {
                    aboutStatus.textContent = "Failed to save";
                    aboutStatus.style.color = "red";
                }
            }
        }, 500);
    });
});

function fetchMarkersByCategory() {
    const url = selectedCategoryId
        ? `/markers/${selectedCategoryId}`
        : "/api/markers";

    return fetch(url).then(res => res.json());
}

function fetchIndoorMarkers() {
    return fetch("/api/indoor-markers").then(res => res.json());
}

const pendingApprovalsBtn = document.getElementById("pendingApprovalsBtn");
const pendingApprovalsPopup = document.getElementById("pendingApprovalsPopup");
const closePendingApprovals = document.getElementById("closePendingApprovals");
const pendingApprovalsList = document.getElementById("pendingApprovalsList");

pendingApprovalsBtn.addEventListener("click", async () => {
    pendingApprovalsPopup.classList.remove("hidden");
    await loadPendingApprovals();
});

closePendingApprovals.addEventListener("click", () => {
    pendingApprovalsPopup.classList.add("hidden");
});

async function loadPendingApprovals() {
    try {
        const res = await fetch("/api/pending-approvals");
        const users = await res.json();
        pendingApprovalsList.innerHTML = "";
        if(users.length === 0){
            pendingApprovalsList.innerHTML = "<p>No pending approvals.</p>";
            return;
        }

        users.forEach(user => {
            const div = document.createElement("div");
            div.classList.add("pending-user");
            div.innerHTML = `
            <span>${user.email}</span>
            <div class="button-group">
                <button class="approve-btn" data-id="${user.id}">Approve</button>
                <button class="reject-btn" data-id="${user.id}">Reject</button>
            </div>
            `;
            pendingApprovalsList.appendChild(div);
        });

        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const userId = btn.dataset.id;
                const res = await fetch(`/admin/approve/${userId}`, { method: "POST" });
                const data = await res.json();
                alert(data.message);
                await loadPendingApprovals();
            });
        });

        document.querySelectorAll(".reject-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const userId = btn.dataset.id;
                const res = await fetch(`/admin/reject/${userId}`, { method: "POST" });
                const data = await res.json();
                alert(data.message);
                await loadPendingApprovals();
            });
        });

    } catch (err) {
        console.error("Failed to load pending approvals:", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const manageAdminsBtn = document.getElementById("manageAdminsBtn");
    const manageAdminsPopup = document.getElementById("manageAdminsPopup");
    const closeManageAdminsPopup = document.getElementById("closeManageAdmins");
    const adminsListDiv = document.getElementById("adminsList");

    manageAdminsBtn.addEventListener("click", async () => {
        manageAdminsPopup.classList.remove("hidden");

        try {
            const res = await fetch("/api/admins");
            const admins = await res.json();

            adminsListDiv.innerHTML = "";

            admins.forEach(admin => {
                const div = document.createElement("div");
                div.classList.add("admin-item");
                div.innerHTML = `
                    <span>${admin.email}</span>
                    <button class="profileBtnManage">ℹ️</button>
                    <button class="delete-item-btn" data-id="${admin.id}">Delete</button>
                `;
                adminsListDiv.appendChild(div);

                //Profile inside manage admins
                const profileBtnManage = div.querySelector(".profileBtnManage");
                profileBtnManage.addEventListener("click", async () => {
                    openedFromManageAdmins = true;

                    const success = await openProfile(admin.id, false);

                    if (success) {
                        manageAdminsPopup.classList.add("hidden");
                    }
                });

                // Attach delete handler
                const delBtn = div.querySelector(".delete-item-btn");
                delBtn.addEventListener("click", async () => {
                    if (confirm(`Delete admin "${admin.email}"?`)) {
                        const delRes = await fetch(`/delete-admin/${admin.id}`, { method: "POST" });
                        const delData = await delRes.json();
                        if (delData.success) {
                            div.remove();
                            alert("Admin deleted successfully.");
                        } else {
                            alert("Cannot delete this admin.");
                        }
                    }
                });
            });
        } catch (err) {
            console.error("Failed to fetch admins:", err);
        }
    });

    closeManageAdminsPopup.addEventListener("click", () => {
        manageAdminsPopup.classList.add("hidden");
    });

    window.addEventListener("click", e => {
        if (e.target === manageAdminsPopup) 
            manageAdminsPopup.classList.add("hidden");
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const toggles = document.querySelectorAll(".toggle-password");
    const passwordFields = document.querySelectorAll(".password-field");

    toggles.forEach(toggle => {
        toggle.addEventListener("click", () => {
            const currentlyVisible = passwordFields[0].type === "text";

            passwordFields.forEach(input => {
                input.type = currentlyVisible ? "password" : "text";
            });

            toggles.forEach(icon => {
                icon.classList.toggle("fa-eye", !currentlyVisible);
                icon.classList.toggle("fa-eye-slash", currentlyVisible);
            });
        });
    });
});

function activateOtpForm(formToShow) {
    [sendOtpForm, verifyOtpForm].forEach(form => {
        if (!form) return;
        form.classList.remove("active");
        form.hidden = true;
    });

    if (formToShow) {
        formToShow.classList.add("active");
        formToShow.hidden = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Buttons
    const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const closeForgotOtpBtn = document.getElementById("closeForgotOtp");
    const closeVerifyOtpBtn = document.getElementById("closeVerifyOtp");

    // Popups / Forms
    const sendOtpForm = document.getElementById("sendOtpForm");
    const verifyOtpForm = document.getElementById("verifyOtpForm");
    const forgotOtpPopup = document.getElementById("forgotOtpPopup");
    const verifyOtpPopup = document.getElementById("verifyOtpPopup");

    // OTP Inputs
    const otpInputs = document.querySelectorAll(".otp-input");
    const otpHidden = document.getElementById("otpHidden");
    const newPasswordInput = document.getElementById("otpNewPassword");
    const confirmPasswordInput = document.getElementById("otpConfirmPassword");

    // Helper functions
    const resetSendOtpForm = () => sendOtpForm?.reset();

    const resetOtpForm = () => {
        otpInputs.forEach(input => input.value = "");
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
        if (otpHidden) otpHidden.value = "";
    };

    const resetOtpState = () => {
        fetch("/forgot-password/reset", { method: "POST" });

        forgotOtpPopup.classList.add("hidden");
        verifyOtpPopup.classList.add("hidden");

        resetSendOtpForm();

        // Reset cooldown
        if (otpCooldownTimer) {
            clearInterval(otpCooldownTimer);
            otpCooldownTimer = null;
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send OTP";
        }
    };

    const updateOtpHidden = () => {
        if (otpHidden) {
            otpHidden.value = [...otpInputs].map(i => i.value).join("");
        }
    };

    // OTP cooldown
    let otpCooldownTimer = null;
    const OTP_COOLDOWN = 30;

    const startOtpCooldown = () => {
        let timeLeft = OTP_COOLDOWN;
        sendOtpBtn.disabled = true;

        otpCooldownTimer = setInterval(() => {
            sendOtpBtn.textContent = `Send OTP (${timeLeft}s)`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(otpCooldownTimer);
                otpCooldownTimer = null;
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send OTP";
            }
        }, 1000);
    };

    // Open Forgot OTP popup
    forgotPasswordBtn?.addEventListener("click", () => {
        resetOtpState();
        forgotOtpPopup.classList.remove("hidden");
        activateOtpForm(sendOtpForm);
    });

    // Close buttons
    closeForgotOtpBtn?.addEventListener("click", resetOtpState);
    closeVerifyOtpBtn?.addEventListener("click", resetOtpState);

    // Send OTP
    sendOtpForm?.addEventListener("submit", async e => {
        e.preventDefault();

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Sending...";

        const res = await fetch("/forgot-password/send-otp", { method: "POST", body: new FormData(sendOtpForm) });
        const data = await res.json();

        if (data.success) {
            forgotOtpPopup.classList.add("hidden");
            resetSendOtpForm();
            verifyOtpPopup.classList.remove("hidden");
            activateOtpForm(verifyOtpForm);
            startOtpCooldown(); 
            sendOtpBtn.textContent = "Send OTP";
        } else {
            alert(data.message);
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send OTP";
        }
    });

    // Verify OTP
    verifyOtpForm?.addEventListener("submit", async e => {
        e.preventDefault();
        const res = await fetch("/forgot-password/verify", { method: "POST", body: new FormData(verifyOtpForm) });
        const data = await res.json();

        if (data.success) {
            alert("Password reset successful!");
            resetOtpState();
            resetOtpForm();
        } else {
            alert(data.message);
        }
    });

    // Reset OTP on page refresh
    window.addEventListener("beforeunload", () => {
        navigator.sendBeacon("/forgot-password/reset");
    });

    // OTP input
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/, "");
            if (input.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
            updateOtpHidden();
        });

        input.addEventListener("keydown", e => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    // Clear passwords initially
    if (newPasswordInput) newPasswordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";
});

// Array to store marker instances (optional, useful if you want later)

let markers = [];
const outdoorMarkers = L.layerGroup().addTo(map);
const buildingMarkers = L.layerGroup().addTo(map);

// ---------- LOAD MARKERS ----------
async function loadMarkers() {
    const response = await fetch("/api/markers");
    const data = await response.json();
    addMarkersToMap(data);
}

// ---------- ADD MARKERS ----------
function addMarkersToMap(data) {
    outdoorMarkers.clearLayers();
    markers.length = 0;

    data.forEach(m => {
        const marker = L.marker([m.latitude, m.longitude], {
            icon: getCategoryIcon(m.category)
        })
        .bindPopup(`
            <strong>${m.name}</strong><br>
            ${m.description || ""}
        `)
        .addTo(outdoorMarkers);

        markers.push(marker);
    });
}

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        darkModeToggle.textContent = "☀️ Light Mode";
    } else {
        darkModeToggle.textContent = "🌙 Dark Mode";
    }

    // Optional: store preference in localStorage
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Restore mode on page load
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = "☀️ Light Mode";
}


// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
    loadMarkers();
    initBuildings();
});
