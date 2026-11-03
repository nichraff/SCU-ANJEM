"use strict";

/* =========================================
   KONFIGURASI SCU ANJEM
========================================= */

const ANJEMIN_CONFIG = {
    farePerKm: 5000,
    averageSpeedKmh: 20,
    trafficFactor: 1.35,
    whatsappNumber: "6282221693472",
    instagramUrl: ""
};

/* =========================================
   STATE
========================================= */

const orderState = {
    pickup: "",
    destination: "",
    pickupLocation: null,
    destinationLocation: null,
    distance: null,
    timeMinutes: null,
    fare: null
};

let mapInstance = null;
let mapMarker = null;
let activeLocationField = "pickup";
let pendingMapLocation = null;
let toastTimeout = null;

/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    initializeMobileNavigation();
    initializeServiceFilters();
    initializeMapLocationPicker();
    initializeSwapButton();
    initializeFareCalculator();
    initializeOrderButton();
    initializeModal();
    initializeContactLinks();
    initializeFooter();
    initializeSummaryDefaults();
});

/* =========================================
   HELPER
========================================= */

function getElement(id) {
    return document.getElementById(id);
}

function showToast(message) {
    const toast = getElement("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(function () {
        toast.classList.remove("show");
    }, 3500);
}

function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(value);
}

function formatDistance(distance) {
    return distance.toLocaleString("id-ID", {
        maximumFractionDigits: 1
    }) + " km";
}

function formatTravelTime(minutes) {
    if (minutes < 60) {
        return `${minutes} menit`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours} jam`;
    }

    return `${hours} jam ${remainingMinutes} menit`;
}

/* =========================================
   NAVIGATION
========================================= */

function initializeMobileNavigation() {
    const navLinks = getElement("navLinks");
    const menuToggle = getElement("menuToggle");
    const indicator = getElement("navIndicator");

    if (!navLinks) return;

    const links = Array.from(
        navLinks.querySelectorAll('a[href^="#"]')
    );

    if (!links.length) return;

    let activeLink =
        links.find(link => link.getAttribute("href") === "#home")
        || links[0];

    let programmaticScroll = false;
    let scrollReleaseTimer = null;

    function getSectionFromHref(href) {
        if (!href || href === "#") return null;

        if (href === "#home" || href === "#hero") {
            return getElement("hero") || getElement("home");
        }

        return getElement(href.substring(1));
    }

    function getNavLinkForHref(href) {
        if (href === "#hero" || href === "#home") {
            return links.find(
                link => link.getAttribute("href") === "#home"
            );
        }

        return links.find(
            link => link.getAttribute("href") === href
        );
    }

    function moveIndicator(link) {
        if (!indicator || !link) return;

        if (window.innerWidth <= 900) {
            indicator.style.opacity = "0";
            indicator.classList.remove("ready");
            return;
        }

        const navRect = navLinks.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        const left = linkRect.left - navRect.left;
        const top = linkRect.top - navRect.top;

        indicator.style.width = `${linkRect.width}px`;
        indicator.style.height = `${linkRect.height}px`;

        indicator.style.transform =
            `translate3d(${left}px, ${top}px, 0)`;

        indicator.style.opacity = "1";
        indicator.classList.add("ready");
    }

    function setActiveLink(link) {
        if (!link) return;

        activeLink = link;

        links.forEach(function (item) {
            const isActive = item === link;

            item.classList.toggle("active", isActive);

            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });

        moveIndicator(link);
    }

    function closeMenu() {
        navLinks.classList.remove("open");

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Buka navigasi");
            menuToggle.textContent = "☰";
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            const isOpen = navLinks.classList.toggle("open");

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Tutup navigasi" : "Buka navigasi"
            );

            menuToggle.textContent = isOpen ? "✕" : "☰";
        });
    }

    function startProgrammaticScroll() {
        programmaticScroll = true;

        clearTimeout(scrollReleaseTimer);

        scrollReleaseTimer = setTimeout(function () {
            programmaticScroll = false;
            updateActiveFromScroll();
        }, 1800);
    }

    function finishProgrammaticScroll() {
        if (!programmaticScroll) return;

        clearTimeout(scrollReleaseTimer);

        programmaticScroll = false;
        updateActiveFromScroll();
    }

    function updateActiveFromScroll() {
        if (programmaticScroll) return;

        const scrollPosition = window.scrollY;
        const viewportHeight = window.innerHeight;

        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );

        const distanceToBottom =
            documentHeight - (scrollPosition + viewportHeight);

        if (distanceToBottom <= 8) {
            for (let i = links.length - 1; i >= 0; i--) {
                const section = getSectionFromHref(
                    links[i].getAttribute("href")
                );

                if (section) {
                    setActiveLink(links[i]);
                    return;
                }
            }
        }

        if (scrollPosition <= 5) {
            const homeLink = getNavLinkForHref("#home");

            if (homeLink) {
                setActiveLink(homeLink);
                return;
            }
        }

        const marker = 150;
        let currentLink = links[0];

        links.forEach(function (link) {
            const section = getSectionFromHref(
                link.getAttribute("href")
            );

            if (!section) return;

            const rect = section.getBoundingClientRect();

            if (rect.top <= marker) {
                currentLink = link;
            }
        });

        setActiveLink(currentLink);
    }

    window.addEventListener(
        "scrollend",
        finishProgrammaticScroll
    );

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener("click", function (event) {
            const href = anchor.getAttribute("href");
            const target = getSectionFromHref(href);

            if (!target) return;

            const correspondingLink = getNavLinkForHref(href);

            if (correspondingLink) {
                setActiveLink(correspondingLink);
            }

            startProgrammaticScroll();

            if (navLinks.contains(anchor)) {
                event.preventDefault();

                closeMenu();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                history.replaceState(null, "", href);
            }
        });
    });

    window.addEventListener(
        "scroll",
        updateActiveFromScroll,
        { passive: true }
    );

    window.addEventListener("resize", function () {
        moveIndicator(activeLink);
    });

    document.addEventListener("click", function (event) {
        if (
            navLinks.classList.contains("open") &&
            !navLinks.contains(event.target) &&
            menuToggle &&
            !menuToggle.contains(event.target)
        ) {
            closeMenu();
        }
    });

    setActiveLink(activeLink);
}

/* =========================================
   SERVICE FILTERS
========================================= */

function initializeServiceFilters() {
    const filterButtons = document.querySelectorAll("[data-filter]");
    const serviceCards = document.querySelectorAll(".service-card");

    if (!filterButtons.length || !serviceCards.length) return;

    filterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const filter = button.dataset.filter;

            filterButtons.forEach(function (item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            serviceCards.forEach(function (card) {
                const category = card.dataset.category;

                card.style.display =
                    filter === "all" || category === filter
                        ? ""
                        : "none";
            });
        });
    });
}

/* =========================================
   MAP LOCATION PICKER
========================================= */

function initializeMapLocationPicker() {
    const pickupInput = getElement("pickup");
    const destinationInput = getElement("destination");
    const mapModal = getElement("mapModal");
    const closeButton = getElement("closeMapModal");
    const searchInput = getElement("mapSearchInput");
    const searchButton = getElement("mapSearchButton");
    const gpsButton = getElement("useMyLocation");
    const confirmButton = getElement("confirmMapLocation");

    if (!pickupInput || !destinationInput || !mapModal) return;

    pickupInput.readOnly = true;
    destinationInput.readOnly = true;

    pickupInput.addEventListener("click", function () {
        openMapModal("pickup");
    });

    destinationInput.addEventListener("click", function () {
        openMapModal("destination");
    });

    if (closeButton) {
        closeButton.addEventListener("click", closeMapModal);
    }

    mapModal.addEventListener("click", function (event) {
        if (event.target === mapModal) {
            closeMapModal();
        }
    });

    if (searchButton) {
        searchButton.addEventListener("click", searchMapLocation);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                searchMapLocation();
            }
        });
    }

    if (gpsButton) {
        gpsButton.addEventListener("click", useCurrentLocation);
    }

    if (confirmButton) {
        confirmButton.addEventListener("click", confirmMapLocation);
    }

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            mapModal.classList.contains("show")
        ) {
            closeMapModal();
        }
    });
}

function openMapModal(field) {
    const mapModal = getElement("mapModal");
    const helpText = getElement("mapModalHelp");
    const searchInput = getElement("mapSearchInput");

    if (!mapModal) return;

    activeLocationField = field;
    pendingMapLocation = null;

    const selected = field === "pickup"
        ? orderState.pickupLocation
        : orderState.destinationLocation;

    const selectedText = getElement("selectedLocationText");
    const confirmButton = getElement("confirmMapLocation");
    const resultsContainer = getElement("mapSearchResults");

    if (helpText) {
        helpText.textContent =
            field === "pickup"
                ? "Tentukan lokasi penjemputan."
                : "Tentukan lokasi tujuan.";
    }

    if (searchInput) {
        searchInput.value = "";
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = "";
    }

    if (selectedText) {
        selectedText.textContent = selected
            ? selected.name
            : "Pilih titik pada peta atau cari alamat terlebih dahulu.";
    }

    if (confirmButton) {
        confirmButton.disabled = true;
    }

    mapModal.classList.add("show");
    mapModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    initializeLeafletMap();

    setTimeout(function () {
        if (mapInstance) {
            mapInstance.invalidateSize();

            if (selected) {
                setPendingMapLocation(
                    selected.lat,
                    selected.lon,
                    selected.name,
                    false
                );
            }
        }
    }, 200);
}

function closeMapModal() {
    const mapModal = getElement("mapModal");

    if (!mapModal) return;

    mapModal.classList.remove("show");
    mapModal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
}

/* =========================================
   LEAFLET MAP
========================================= */

function initializeLeafletMap() {
    const mapElement = getElement("locationMap");

    if (!mapElement) return;

    if (typeof L === "undefined") {
        showToast(
            "Library peta belum berhasil dimuat. Periksa koneksi internet."
        );
        return;
    }

    if (mapInstance) {
        mapInstance.invalidateSize();
        return;
    }

    mapInstance = L.map("locationMap").setView(
        [-6.99, 110.42],
        12
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            maxZoom: 19
        }
    ).addTo(mapInstance);

    mapInstance.on("click", async function (event) {
        const lat = event.latlng.lat;
        const lon = event.latlng.lng;

        setPendingMapLocation(
            lat,
            lon,
            "Mengambil alamat...",
            true
        );

        try {
            const address = await reverseGeocode(lat, lon);

            setPendingMapLocation(
                lat,
                lon,
                address,
                false
            );
        } catch (error) {
            setPendingMapLocation(
                lat,
                lon,
                `Titik peta (${lat.toFixed(5)}, ${lon.toFixed(5)})`,
                false
            );
        }
    });
}

function setPendingMapLocation(lat, lon, name, loading = false) {
    pendingMapLocation = {
        lat: Number(lat),
        lon: Number(lon),
        name: name
    };

    if (mapInstance) {
        mapInstance.setView([lat, lon], 16);

        if (mapMarker) {
            mapMarker.setLatLng([lat, lon]);
        } else {
            mapMarker = L.marker([lat, lon]).addTo(mapInstance);
        }

        mapMarker.bindPopup(
            loading ? "Mengambil alamat..." : name
        ).openPopup();
    }

    const selectedText = getElement("selectedLocationText");
    const confirmButton = getElement("confirmMapLocation");

    if (selectedText) {
        selectedText.textContent = loading
            ? "Mengambil nama lokasi..."
            : name;
    }

    if (confirmButton) {
        confirmButton.disabled = loading;
    }
}

/* =========================================
   PENCARIAN LOKASI
   NOMINATIM + PHOTON
========================================= */

async function searchMapLocation() {
    const searchInput = getElement("mapSearchInput");
    const resultsContainer = getElement("mapSearchResults");
    const searchButton = getElement("mapSearchButton");

    if (!searchInput || !resultsContainer) return;

    const query = searchInput.value.trim();

    if (!query) {
        resultsContainer.innerHTML =
            "<p>Masukkan nama lokasi terlebih dahulu.</p>";
        return;
    }

    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = "Mencari...";
    }

    resultsContainer.innerHTML =
        "<p>Sedang mencari lokasi...</p>";

    const searchQuery = `${query}, Semarang, Indonesia`;

    let locations = [];

    try {
        locations = await searchNominatim(searchQuery);
    } catch (error) {
        console.warn("Nominatim gagal:", error);
    }

    if (!locations.length) {
        resultsContainer.innerHTML =
            "<p>Mencoba sumber pencarian alternatif...</p>";

        try {
            locations = await searchPhoton(query);
        } catch (error) {
            console.warn("Photon gagal:", error);
        }
    }

    if (!locations.length) {
        resultsContainer.innerHTML = `
            <p>Lokasi tidak ditemukan.</p>
            <p>Coba gunakan nama jalan, gedung, atau tempat yang lebih spesifik.</p>
        `;

        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = "Cari";
        }

        return;
    }

    displayMapSearchResults(locations);

    if (searchButton) {
        searchButton.disabled = false;
        searchButton.textContent = "Cari";
    }
}

/* =========================================
   NOMINATIM SEARCH
========================================= */

async function searchNominatim(query) {
    const url = new URL(
        "https://nominatim.openstreetmap.org/search"
    );

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", "id");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Nominatim tidak dapat diakses.");
    }

    const data = await response.json();

    return data.map(place => ({
        name: place.display_name,
        lat: Number(place.lat),
        lon: Number(place.lon)
    }));
}

/* =========================================
   PHOTON SEARCH
========================================= */

async function searchPhoton(query) {
    const url = new URL(
        "https://photon.komoot.io/api/"
    );

    url.searchParams.set("q", query);
    url.searchParams.set("limit", "8");
    url.searchParams.set("lat", "-6.99");
    url.searchParams.set("lon", "110.42");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Photon tidak dapat diakses.");
    }

    const data = await response.json();

    return data.features.map(place => {
        const properties = place.properties;
        const coordinates = place.geometry.coordinates;

        const name = [
            properties.name,
            properties.street,
            properties.district,
            properties.city,
            properties.state,
            properties.country
        ]
            .filter(Boolean)
            .filter((value, index, array) =>
                array.indexOf(value) === index
            )
            .join(", ");

        return {
            name: name || "Lokasi tanpa nama",
            lat: Number(coordinates[1]),
            lon: Number(coordinates[0])
        };
    });
}

/* =========================================
   DISPLAY SEARCH RESULTS
========================================= */

function displayMapSearchResults(locations) {
    const resultsContainer = getElement("mapSearchResults");

    if (!resultsContainer) return;

    resultsContainer.innerHTML = "";

    locations.forEach(location => {
        if (
            !Number.isFinite(location.lat) ||
            !Number.isFinite(location.lon)
        ) {
            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.className = "map-search-result";
        button.textContent = location.name;

        button.addEventListener("click", function () {
            setPendingMapLocation(
                location.lat,
                location.lon,
                location.name
            );

            if (mapInstance) {
                mapInstance.setView(
                    [location.lat, location.lon],
                    17
                );
            }

            resultsContainer.innerHTML =
                "<p>Lokasi berhasil dipilih.</p>";
        });

        resultsContainer.appendChild(button);
    });

    if (!resultsContainer.children.length) {
        resultsContainer.innerHTML =
            "<p>Tidak ada hasil lokasi yang valid.</p>";
    }
}

/* =========================================
   REVERSE GEOCODING
========================================= */

async function reverseGeocode(lat, lon) {
    const url = new URL(
        "https://nominatim.openstreetmap.org/reverse"
    );

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Gagal mendapatkan alamat.");
    }

    const data = await response.json();

    return data.display_name ||
        `Titik peta (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

/* =========================================
   CURRENT LOCATION / GPS
========================================= */

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast("Browser tidak mendukung fitur GPS.");
        return;
    }

    const gpsButton = getElement("useMyLocation");

    if (gpsButton) {
        gpsButton.disabled = true;
        gpsButton.textContent = "Mengambil lokasi...";
    }

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            setPendingMapLocation(
                lat,
                lon,
                "Mengambil alamat...",
                true
            );

            try {
                const address = await reverseGeocode(lat, lon);

                setPendingMapLocation(
                    lat,
                    lon,
                    address
                );
            } catch (error) {
                setPendingMapLocation(
                    lat,
                    lon,
                    `Lokasi GPS (${lat.toFixed(5)}, ${lon.toFixed(5)})`
                );
            }

            if (gpsButton) {
                gpsButton.disabled = false;
                gpsButton.textContent = "Gunakan Lokasi Saya";
            }
        },

        function (error) {
            let message = "Tidak dapat mengambil lokasi GPS.";

            if (error.code === error.PERMISSION_DENIED) {
                message = "Izin lokasi ditolak. Aktifkan izin lokasi browser.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = "Informasi lokasi tidak tersedia.";
            } else if (error.code === error.TIMEOUT) {
                message = "Waktu pengambilan lokasi habis. Coba kembali.";
            }

            showToast(message);

            if (gpsButton) {
                gpsButton.disabled = false;
                gpsButton.textContent = "Gunakan Lokasi Saya";
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
        }
    );
}

/* =========================================
   CONFIRM LOCATION
========================================= */

function confirmMapLocation() {
    if (!pendingMapLocation) {
        showToast("Pilih lokasi pada peta terlebih dahulu.");
        return;
    }

    const location = {
        name: pendingMapLocation.name,
        lat: pendingMapLocation.lat,
        lon: pendingMapLocation.lon
    };

    if (activeLocationField === "pickup") {
        orderState.pickupLocation = location;
        orderState.pickup = location.name;

        const input = getElement("pickup");

        if (input) {
            input.value = location.name;
        }
    } else {
        orderState.destinationLocation = location;
        orderState.destination = location.name;

        const input = getElement("destination");

        if (input) {
            input.value = location.name;
        }
    }

    resetFareCalculation();
    updateLocationSummary();
    closeMapModal();
}

/* =========================================
   SWAP LOCATION
========================================= */

function initializeSwapButton() {
    const swapButton = getElement("swap");

    if (!swapButton) return;

    swapButton.addEventListener("click", function () {
        const tempLocation = orderState.pickupLocation;

        orderState.pickupLocation = orderState.destinationLocation;
        orderState.destinationLocation = tempLocation;

        const tempName = orderState.pickup;

        orderState.pickup = orderState.destination;
        orderState.destination = tempName;

        const pickupInput = getElement("pickup");
        const destinationInput = getElement("destination");

        if (pickupInput) {
            pickupInput.value = orderState.pickup;
        }

        if (destinationInput) {
            destinationInput.value = orderState.destination;
        }

        resetFareCalculation();
        updateLocationSummary();
    });
}

/* =========================================
   RESET CALCULATION
========================================= */

function resetFareCalculation() {
    orderState.distance = null;
    orderState.timeMinutes = null;
    orderState.fare = null;

    const sumDistance = getElement("sumDistance");
    const sumTime = getElement("sumTime");
    const sumPrice = getElement("sumPrice");
    const notice = getElement("notice");
    const orderButton = getElement("order");
    const googleMapsLink = getElement("openGoogleMaps");

    if (sumDistance) sumDistance.textContent = "—";
    if (sumTime) sumTime.textContent = "—";
    if (sumPrice) sumPrice.textContent = "—";

    if (notice) notice.textContent = "";

    if (orderButton) {
        orderButton.disabled = true;
    }

    if (googleMapsLink) {
        googleMapsLink.hidden = true;
        googleMapsLink.href = "#";
    }
}

/* =========================================
   LOCATION SUMMARY
========================================= */

function updateLocationSummary() {
    const pickupSummary = getElement("sumPickup");
    const destinationSummary = getElement("sumDest");

    if (pickupSummary) {
        pickupSummary.textContent =
            orderState.pickup || "Belum dipilih";
    }

    if (destinationSummary) {
        destinationSummary.textContent =
            orderState.destination || "Belum dipilih";
    }
}

/* =========================================
   FARE CALCULATOR
========================================= */

function initializeFareCalculator() {
    const calculateButton = getElement("calculate");

    if (!calculateButton) return;

    calculateButton.addEventListener("click", calculateFare);
}

async function calculateFare() {
    const pickup = orderState.pickupLocation;
    const destination = orderState.destinationLocation;

    if (!pickup || !destination) {
        showToast(
            "Silakan tentukan lokasi penjemputan dan tujuan terlebih dahulu."
        );
        return;
    }

    const calculateButton = getElement("calculate");

    if (!calculateButton) return;

    try {
        calculateButton.disabled = true;
        calculateButton.textContent = "Menghitung...";

        const from = pickup;
        const to = destination;

        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${from.lon},${from.lat};${to.lon},${to.lat}` +
            `?overview=false&alternatives=true&steps=false`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Layanan rute tidak dapat diakses.");
        }

        const data = await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes ||
            data.routes.length === 0
        ) {
            throw new Error("Rute perjalanan tidak ditemukan.");
        }

        // Pilih rute dengan durasi tercepat.
        const route = data.routes.reduce((fastest, current) => {
            return current.duration < fastest.duration
                ? current
                : fastest;
        });

        // Jarak dalam kilometer.
        const distance = route.distance / 1000;

        // Durasi asli OSRM dalam menit.
        const baseDuration = route.duration / 60;

        // Penyesuaian estimasi waktu.
        const trafficFactor = ANJEMIN_CONFIG.trafficFactor || 1.35;

        const estimatedDuration = Math.ceil(
            baseDuration * trafficFactor
        );

        // Tarif Rp5.000/km, dibulatkan ke atas per Rp1.000.
        const fare = calculateEstimatedFare(distance);

        // Simpan hasil perhitungan.
        orderState.distance = distance;
        orderState.timeMinutes = estimatedDuration;
        orderState.fare = fare;

        // Perbarui ringkasan.
        renderFareSummary();

        // Perbarui tautan Google Maps.
        updateGoogleMapsLink();

        showToast("Estimasi perjalanan berhasil dihitung.");

    } catch (error) {
        console.error("Kesalahan perhitungan rute:", error);

        showToast(
            error.message || "Gagal menghitung estimasi perjalanan."
        );

    } finally {
        calculateButton.disabled = false;
        calculateButton.textContent = "Hitung Estimasi";
    }
}

function calculateEstimatedFare(distance) {
    return Math.ceil(
        distance * ANJEMIN_CONFIG.farePerKm / 1000
    ) * 1000;
}

/* =========================================
   GOOGLE MAPS DIRECTIONS
========================================= */

function updateGoogleMapsLink() {
    const link = getElement("openGoogleMaps");

    if (
        !link ||
        !orderState.pickupLocation ||
        !orderState.destinationLocation
    ) {
        return;
    }

    const from = orderState.pickupLocation;
    const to = orderState.destinationLocation;

    const url = new URL("https://www.google.com/maps/dir/");

    url.searchParams.set("api", "1");
    url.searchParams.set("origin", `${from.lat},${from.lon}`);
    url.searchParams.set("destination", `${to.lat},${to.lon}`);
    url.searchParams.set("travelmode", "driving");

    link.href = url.toString();
    link.hidden = false;
}

/* =========================================
   SUMMARY DEFAULTS
========================================= */

function initializeSummaryDefaults() {
    updateLocationSummary();
    renderFareSummary();
}

/* =========================================
   FARE SUMMARY
========================================= */

function renderFareSummary() {
    const distanceElement = getElement("sumDistance");
    const timeElement = getElement("sumTime");
    const priceElement = getElement("sumPrice");
    const orderButton = getElement("order");

    updateLocationSummary();

    if (distanceElement) {
        distanceElement.textContent =
            orderState.distance !== null
                ? formatDistance(orderState.distance)
                : "—";
    }

    if (timeElement) {
        timeElement.textContent =
            orderState.timeMinutes !== null
                ? formatTravelTime(orderState.timeMinutes)
                : "—";
    }

    if (priceElement) {
        priceElement.textContent =
            orderState.fare !== null
                ? formatRupiah(orderState.fare)
                : "—";
    }

    if (orderButton) {
        orderButton.disabled = !(
            orderState.pickupLocation &&
            orderState.destinationLocation &&
            orderState.fare !== null
        );
    }
}

/* =========================================
   ORDER BUTTON
========================================= */

function initializeOrderButton() {
    const orderButton = getElement("order");

    if (!orderButton) return;

    orderButton.addEventListener("click", function () {
        if (
            !orderState.pickupLocation ||
            !orderState.destinationLocation
        ) {
            showToast("Silakan tentukan lokasi penjemputan dan tujuan.");
            return;
        }

        if (orderState.fare === null) {
            showToast("Silakan hitung estimasi perjalanan terlebih dahulu.");
            return;
        }

        openOrderModal();
    });
}

/* =========================================
   ORDER MODAL
========================================= */

function initializeModal() {
    const modal = getElement("modalback");
    const closeButton = getElement("modalX");
    const closeButton2 = getElement("closeModal");
    const confirmButton = getElement("confirmDemo");

    if (!modal) return;

    if (closeButton) {
        closeButton.addEventListener("click", closeOrderModal);
    }

    if (closeButton2) {
        closeButton2.addEventListener("click", closeOrderModal);
    }

    if (confirmButton) {
        confirmButton.addEventListener("click", continueToWhatsApp);
    }

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeOrderModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            modal.classList.contains("show")
        ) {
            closeOrderModal();
        }
    });
}

function openOrderModal() {
    const modal = getElement("modalback");
    const summary = getElement("modalSummary");

    if (!modal || !summary) return;

    summary.replaceChildren();

    const details = [
        ["Penjemputan", orderState.pickup],
        ["Tujuan", orderState.destination],
        ["Jarak", formatDistance(orderState.distance)],
        ["Estimasi waktu", formatTravelTime(orderState.timeMinutes)],
        ["Estimasi biaya", formatRupiah(orderState.fare)]
    ];

    details.forEach(function ([label, value]) {
        const row = document.createElement("div");
        row.className = "modal-summary-row";

        const labelElement = document.createElement("span");
        labelElement.textContent = label;

        const valueElement = document.createElement("strong");
        valueElement.textContent = value;

        row.append(labelElement, valueElement);
        summary.appendChild(row);
    });

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeOrderModal() {
    const modal = getElement("modalback");

    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

/* =========================================
   WHATSAPP ORDER
========================================= */

function continueToWhatsApp() {
    const phone = ANJEMIN_CONFIG.whatsappNumber.replace(/\D/g, "");

    if (!phone) {
        showToast("Nomor WhatsApp belum dikonfigurasi.");
        return;
    }

    if (
        !orderState.pickupLocation ||
        !orderState.destinationLocation ||
        orderState.fare === null
    ) {
        showToast("Data pesanan belum lengkap.");
        return;
    }

    const message = `Halo SCU Anjem, saya ingin menanyakan pemesanan layanan.

Detail perjalanan:
Penjemputan: ${orderState.pickup}
Tujuan: ${orderState.destination}
Estimasi jarak: ${formatDistance(orderState.distance)}
Estimasi waktu: ${formatTravelTime(orderState.timeMinutes)}
Estimasi tarif: ${formatRupiah(orderState.fare)}

Mohon konfirmasi tarif dan ketersediaan layanan. Terima kasih.`;

    const whatsappUrl =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
    );

    closeOrderModal();
}

/* =========================================
   CONTACT LINKS
========================================= */

function initializeContactLinks() {
    const contactLinks = document.querySelectorAll("[data-contact]");

    const phone = ANJEMIN_CONFIG.whatsappNumber.replace(/\D/g, "");

    contactLinks.forEach(function (link) {
        const contactType = (
            link.dataset.contact || ""
        ).toLowerCase();

        if (contactType === "whatsapp") {
            if (!phone) return;

            link.href = `https://wa.me/${phone}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

        if (contactType === "instagram") {
            const instagramUrl = ANJEMIN_CONFIG.instagramUrl.trim();

            if (!instagramUrl) {
                link.addEventListener("click", function (event) {
                    event.preventDefault();
                    showToast("Link Instagram belum dikonfigurasi.");
                });

                return;
            }

            try {
                const parsedUrl = new URL(instagramUrl);

                if (
                    parsedUrl.protocol === "https:" &&
                    (
                        parsedUrl.hostname === "instagram.com" ||
                        parsedUrl.hostname === "www.instagram.com"
                    )
                ) {
                    link.href = parsedUrl.toString();
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                }
            } catch (error) {
                console.error("URL Instagram tidak valid:", error);
            }
        }
    });
}

/* =========================================
   FOOTER
========================================= */

function initializeFooter() {
    const yearElement = getElement("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}