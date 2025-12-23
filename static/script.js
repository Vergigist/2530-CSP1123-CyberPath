// Initialise Map
let selectedCategoryId = null;
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

    // const routeHere = confirm("Start pathing to this location? (" + lat + ", " + lng + ")?");
    // if (routeHere) {
    //     router.createRoute(parseFloat(lat), parseFloat(lng));
    // }
});

// Forgot Password
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotPasswordPopup = document.getElementById("forgotPasswordPopup");
const closeForgotPasswordPopup = document.getElementById("closeForgotPasswordPopup");

// The sign-in/sign-up popup
const authPopup = document.getElementById("adminPopup");

if (forgotPasswordBtn && forgotPasswordPopup && closeForgotPasswordPopup && authPopup) {
forgotPasswordBtn.addEventListener("click", () => {
        authPopup.style.display = "none";          // hide login popup
        forgotPasswordPopup.style.display = "flex"; // show forgot password popup
});

    closeForgotPasswordPopup.addEventListener("click", () => {
        forgotPasswordPopup.style.display = "none"; // hide forgot popup
        authPopup.style.display = "flex";           // show back login popup
    });
}

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

//danish this is pathing button for user
locationList.addEventListener("click", (e) => {
    const btn = e.target.closest(".path-btn");
    if (!btn) return;

    const lat = btn.dataset.lat;
    const lng = btn.dataset.lng;

    console.log("Path to:", lat, lng);

    // placeholder frontend behavior
    alert(`Pathing to ${lat}, ${lng}`);
});

// Edit Location
const editLocationBtn = document.getElementById("editLocationBtn");

editLocationBtn.addEventListener("click", () => {
    openLocationPopup("edit");
});

function openLocationPopup(mode) {
    viewLocationPopup.classList.remove("hidden");
    locationList.innerHTML = "";

    fetchMarkersByCategory()
        .then(markers => {
            markers.forEach(loc => {
                const row = document.createElement("div");
                row.className = "popup-row";
                row.innerHTML = `
                    <span>${loc.name}</span>
                    <span class="col-category">${loc.category ?? "-"}</span>
                    <button class="path-btn">Get directions</button>
                    ${mode === "edit" ? `<button class="edit-btn" data-id="${loc.id}">Edit</button>` : ""}
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
    const buttons = document.querySelectorAll(".edit-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const locId = btn.dataset.id;
            openEditForm(locId);
        });
    });
}

function openEditForm(id) {
    viewLocationPopup.classList.add("hidden");
    editFormPopup.classList.remove("hidden");

    fetchMarkersByCategory()
        .then(markers => {
            const marker = markers.find(m => m.id == id);
            if (!marker) return;
            document.getElementById("editLocName").value = marker.name;
            document.getElementById("editLocDesc").value = marker.description;
            document.getElementById("editLocCoords").value = `${marker.latitude}, ${marker.longitude}`;
        });

        document.getElementById("editLocationForm").action = `/edit-marker/${id}`;

    pickMode = false;
}

editFormClose.addEventListener("click", () => {
    editFormPopup.classList.add("hidden");
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
       const markers = await fetchMarkersByCategory();

        deleteLocationList.innerHTML = "";

        markers.forEach(marker => {
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
                    <button class="delete-item-btn" data-id="${admin.id}">Delete</button>
                `;
                adminsListDiv.appendChild(div);

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

    window.addEventListener("click", (e) => {
        if (e.target === manageAdminsPopup) {
            manageAdminsPopup.classList.add("hidden");
        }
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
        form.style.display = "none";
    });

    if (formToShow) {
        formToShow.classList.add("active");
        formToShow.style.display = "block";
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
