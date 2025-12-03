// Initialise Map
var map = L.map('map').setView([2.928, 101.64192], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.removeControl(map.zoomControl);

const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const centerBtn = document.getElementById('centerBtn');

toggleBtn.addEventListener('click', () => {
    content.classList.toggle('sidebar-open');
    sidebar.classList.toggle('active');
    setTimeout(() => {
        map.invalidateSize();
    }, 310);
});

centerBtn.addEventListener('click', () => {
    map.setView([2.928, 101.64192], 16);
});

sidebar.addEventListener('transitionend', () => {
    map.invalidateSize();
});


// Admin 
const adminBtn = document.getElementById('adminBtn');
const adminPopup = document.getElementById('adminPopup');
const closePopupAdmin = document.getElementById('closePopup');

adminBtn.addEventListener('click', () => adminPopup.style.display = 'flex');
closePopupAdmin.addEventListener('click', () => adminPopup.style.display = 'none');
window.addEventListener('click', (e) => { if(e.target === adminPopup) adminPopup.style.display = 'none'; });

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
    
    const routeHere = confirm("Start pathing to this location? (" + lat + ", " + lng + ")?");
    if (routeHere) {
        router.createRoute(parseFloat(lat), parseFloat(lng));
    }

});

// Forgot Password
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotPasswordPopup = document.getElementById("forgotPasswordPopup");
const closeForgotPasswordPopup = document.getElementById("closeForgotPasswordPopup");

// The sign-in/sign-up popup
const authPopup = document.getElementById("adminPopup");

forgotPasswordBtn.addEventListener("click", () => {
    authPopup.style.display = "none";          // hide login popup
    forgotPasswordPopup.style.display = "flex"; // show forgot password popup
});

closeForgotPasswordPopup.addEventListener("click", () => {
    forgotPasswordPopup.style.display = "none"; // hide forgot popup
    authPopup.style.display = "flex";           // show back login popup
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

let pickMode = false;

addLocationBtn.addEventListener("click", () => {
    addLocationForm.classList.remove("hidden");
});

pickFromMapBtn.addEventListener("click", () => {
    addLocationForm.classList.add("hidden");
    pickMode = true;
});

closeLocationFormBtn.addEventListener("click", () => {
    addLocationForm.classList.add("hidden");
    pickMode = false;
});


// Map picking for both add + edit
map.on("click", function (e) {
    if (!pickMode) return;

    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);

    if (!addLocationForm.classList.contains("hidden")) {
        locCoordsInput.value = `${lat}, ${lng}`;
    }

    if (!document.getElementById("editLocationFormPopup").classList.contains("hidden")) {
        document.getElementById("editLocCoords").value = `${lat}, ${lng}`;
    }

    pickMode = false;
});


// View all location
const viewAllBtn = document.getElementById("viewAllBtn");
const popup = document.getElementById("viewLocationPopup");
const closePopupView = document.getElementById("closePopup");
const searchInput = document.getElementById("searchLocation");
const locationList = document.getElementById("locationList");

viewAllBtn.addEventListener("click", () => {
    openLocationPopup("view");
});

closePopupView.addEventListener("click", () => {
    popup.classList.add("hidden");
});

searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();
    [...locationList.children].forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(filter)
            ? "flex"
            : "none";
    });
});


// Edit Location
const editLocationBtn = document.getElementById("editLocationBtn");

editLocationBtn.addEventListener("click", () => {
    openLocationPopup("edit");
});

function openLocationPopup(mode) {
    popup.classList.remove("hidden");
    locationList.innerHTML = "";

    // Sample data here @jack
    const sampleData = [
        { id: 1, name: "Location 1" },
        { id: 2, name: "Apple 2" },
        { id: 3, name: "Location 3" }
    ];

    sampleData.forEach(loc => {
        const row = document.createElement("div");
        row.className = "popup-row";
        row.innerHTML = `
            <span>${loc.name}</span>
            ${mode === "edit" ? `<button class="edit-btn" data-id="${loc.id}">Edit</button>` : ""}
        `;
        locationList.appendChild(row);
    });

    attachEditButtons();
}

//Edit location -- form

const editFormPopup = document.getElementById("editLocationFormPopup");
const editFormClose = document.getElementById("closeEditFormPopup");
const editPickFromMapBtn = document.getElementById("editPickFromMapBtn");

function attachEditButtons() {
    const buttons = document.querySelectorAll(".edit-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const locId = btn.dataset.id;
            openEditForm(locId);
        });
    });
}

function openEditForm(id) {
    popup.classList.add("hidden");
    editFormPopup.classList.remove("hidden");

    document.getElementById("editLocName").value = "Example Name " + id;
    document.getElementById("editLocDesc").value = "Example description";
    document.getElementById("editLocCoords").value = "2.928000, 101.641920";

    pickMode = false;
}

editFormClose.addEventListener("click", () => {
    editFormPopup.classList.add("hidden");
});

editPickFromMapBtn.addEventListener("click", () => {
    addLocationForm.classList.add("hidden");
    pickMode = true;
});

//Delete location

const deleteLocationBtn = document.getElementById("deleteLocationBtn");
const deleteLocationPopup = document.getElementById("deleteLocationPopup");
const closeDeletePopup = document.getElementById("closeDeletePopup");
const searchDeleteLocation = document.getElementById("searchDeleteLocation");
const deleteLocationList = document.getElementById("deleteLocationList");

deleteLocationBtn.addEventListener("click", () => {
    deleteLocationPopup.classList.remove("hidden");
});

closeDeletePopup.addEventListener("click", () => {
    deleteLocationPopup.classList.add("hidden");
});

searchDeleteLocation.addEventListener("input", () => {
    const filter = searchDeleteLocation.value.toLowerCase();
    [...deleteLocationList.children].forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(filter)
            ? "block"
            : "none";
    });
});

//placcholder
deleteLocationList.innerHTML = "";
for (let i = 1; i <= 10; i++) {
    const row = document.createElement("div");
    row.classList.add("popup-item");
    row.style.padding = "6px 0";

    const label = document.createElement("span");
    label.textContent = "Location " + i;

    const delBtn = document.createElement("button");
    delBtn.classList.add("delete-item-btn");
    delBtn.textContent = "Delete";

    delBtn.addEventListener("click", () => {
        alert(`Pretend deleting: Location ${i}`);
        // Here you will send DELETE request later
    });

    row.appendChild(label);
    row.appendChild(delBtn);
    deleteLocationList.appendChild(row);
}

//Profile 
const profileBtn = document.getElementById("profileBtn");
const profilePopup = document.getElementById("profilePopup");
const closePopupProfile = document.getElementById("closeProfilePopup");

profileBtn.addEventListener("click", () => {
    profilePopup.classList.remove("hidden");
});

closePopupProfile.addEventListener("click", () => {
    profilePopup.classList.add("hidden");
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

