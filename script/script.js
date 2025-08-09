// DOM Elements
const themeToggle = document.querySelector('.theme-toggle');
const calculateBtn = document.getElementById('calculate-btn');
const offsetAmountInput = document.getElementById('offset-amount');
const offsetCostDisplay = document.getElementById('offset-cost');

// Global Variables
const emissionFactors = {
    economy: 0.09,    // kg CO₂ per passenger-km
    premium: 0.14,
    business: 0.26,
    first: 0.4
};

const offsetPricePerKg = 0.015; // $15 per 1000kg (1 metric ton)

// Mock database of common routes (in km)
const routeDatabase = {
    "LHR-JFK": 5550,
    "JFK-LHR": 5550,
    "LAX-ORD": 2800,
    "ORD-LAX": 2800,
    "SFO-DXB": 13000,
    "DXB-SFO": 13000,
    "CDG-BCN": 850,
    "BCN-CDG": 850,
    "SYD-MEL": 705,
    "MEL-SYD": 705
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme from localStorage
    initTheme();
    
    // Set up event listeners based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'calculator.html') {
        setupCalculator();
    } else if (currentPage === 'offset.html') {
        setupOffsetCalculator();
    } else if (currentPage === 'routes.html') {
        setupRouteFinder();
    } else if (currentPage === 'analytics.html') {
        setupAnalytics();
    }
});

// Theme Toggle Functionality
function initTheme() {
    if (themeToggle) {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark-mode', darkMode);
        themeToggle.textContent = darkMode ? '☀️' : '🌙';
        
        themeToggle.addEventListener('click', () => {
            const isDarkMode = document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        });
    }
}

// Calculator Page Functions
function setupCalculator() {
    if (!calculateBtn) return;
    
    calculateBtn.addEventListener('click', async function() {
        const departure = document.getElementById('departure').value.trim().toUpperCase();
        const arrival = document.getElementById('arrival').value.trim().toUpperCase();
        const cabinClass = document.getElementById('cabin-class').value;
        const passengers = parseInt(document.getElementById('passengers').value);
        
        // Validate inputs
        if (!departure || !arrival) {
            showError('Please enter both departure and arrival airports');
            return;
        }
        
        if (departure === arrival) {
            showError('Departure and arrival airports cannot be the same');
            return;
        }
        
        if (isNaN(passengers) || passengers < 1) {
            showError('Please enter a valid number of passengers');
            return;
        }
        
        // Show loading state
        toggleLoading(true);
        
        try {
            // Get flight distance
            const distanceKm = await getFlightDistance(departure, arrival);
            
            // Calculate emissions
            const co2e = calculateFlightCO2(distanceKm, cabinClass, passengers);
            
            // Display results
            displayResults(co2e, passengers, distanceKm);
            
            // Animate the plane
            animatePlane();
        } catch (error) {
            console.error("Error:", error);
            showError("Could not calculate emissions. Please check airport codes and try again.");
        } finally {
            toggleLoading(false);
        }
    });
}

function getFlightDistance(departureIATA, arrivalIATA) {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            const routeKey = `${departureIATA}-${arrivalIATA}`;
            
            if (routeDatabase[routeKey]) {
                resolve(routeDatabase[routeKey]);
            } else {
                // Fallback: Use great circle distance calculation if we had coordinates
                // For now, return an average medium-haul flight distance
                resolve(2500); // Default to 2500km if unknown
            }
        }, 800); // Simulate network delay
    });
}

function calculateFlightCO2(distanceKm, cabinClass, passengers) {
    const factor = emissionFactors[cabinClass] || emissionFactors.economy;
    return distanceKm * factor * passengers;
}

function displayResults(co2e, passengers, distanceKm) {
    const resultDiv = document.getElementById('result');
    const defaultOutput = document.getElementById('default-output');
    const emissionResult = document.getElementById('emission-result');
    const comparisonDiv = document.getElementById('comparison');
    
    // Format the CO2e value
    const formattedCO2 = co2e >= 1000 
        ? `${(co2e / 1000).toFixed(1)} metric tons` 
        : `${Math.round(co2e)} kg`;
    
    const formattedCO2PerPassenger = (co2e / passengers) >= 1000 
        ? `${((co2e / passengers) / 1000).toFixed(1)} metric tons` 
        : `${Math.round(co2e / passengers)} kg`;
    
    // Display the main result
    emissionResult.innerHTML = `
        <p>Total for ${passengers} passenger${passengers > 1 ? 's' : ''}: <strong>${formattedCO2} CO₂e</strong></p>
        <p>Per passenger: <strong>${formattedCO2PerPassenger} CO₂e</strong></p>
        <p>Distance: ~${Math.round(distanceKm)} km</p>
    `;
    
    // Create comparison information
    comparisonDiv.innerHTML = generateComparisons(co2e);
    
    // Show results
    defaultOutput.classList.add('hidden');
    resultDiv.classList.remove('hidden');
}

function generateComparisons(co2e) {
    // These are approximate values for comparison
    const kgCO2PerLiterGasoline = 2.3;
    const avgCarEmissionPerKm = 0.12; // kg CO2 per km
    const avgCarAnnualEmission = 2000; // kg CO2 per year
    const treeAbsorptionPerYear = 21.77; // kg CO2 per tree per year

    const litersOfGasoline = co2e / kgCO2PerLiterGasoline;
    const kmByCar = co2e / avgCarEmissionPerKm;
    const carMonths = (co2e / avgCarAnnualEmission) * 12;
    const treesNeeded = co2e / treeAbsorptionPerYear;

    let comparisons = '<p>This is equivalent to:</p><ul>';
    
    if (co2e >= 1000) {
        comparisons += `<li><i class="fas fa-gas-pump"></i> Burning ${Math.round(litersOfGasoline / 100) / 10} thousand liters of gasoline</li>`;
        comparisons += `<li><i class="fas fa-car"></i> Driving ${Math.round(kmByCar / 100) / 10} thousand km in an average car</li>`;
        comparisons += `<li><i class="fas fa-calendar"></i> ${Math.round(carMonths)} months of an average car's emissions</li>`;
        comparisons += `<li><i class="fas fa-tree"></i> ${Math.round(treesNeeded)} trees needed to absorb this CO₂ in one year</li>`;
    } else {
        comparisons += `<li><i class="fas fa-gas-pump"></i> Burning ${Math.round(litersOfGasoline)} liters of gasoline</li>`;
        comparisons += `<li><i class="fas fa-car"></i> Driving ${Math.round(kmByCar)} km in an average car</li>`;
        comparisons += `<li><i class="fas fa-tree"></i> ${Math.round(treesNeeded)} trees needed to absorb this CO₂ in one year</li>`;
    }
    
    comparisons += '</ul>';
    return comparisons;
}

function animatePlane() {
    const planeIcon = document.getElementById('plane-icon');
    if (!planeIcon) return;
    
    planeIcon.classList.remove('hidden');
    planeIcon.classList.add('animate');
    
    // Reset animation after it completes
    setTimeout(() => {
        planeIcon.classList.remove('animate');
        planeIcon.style.left = '0';
    }, 3000);
}

// Offset Calculator Page Functions
function setupOffsetCalculator() {
    if (!offsetAmountInput || !offsetCostDisplay) return;
    
    offsetAmountInput.addEventListener('input', updateOffsetCost);
    
    // Initialize with default value
    updateOffsetCost();
}

function updateOffsetCost() {
    const amount = parseFloat(offsetAmountInput.value) || 0;
    const cost = (amount * offsetPricePerKg).toFixed(2);
    offsetCostDisplay.textContent = cost;
}

// Route Finder Page Functions
function setupRouteFinder() {
    const routeFromInput = document.getElementById('route-from');
    const routeToInput = document.getElementById('route-to');
    const findRoutesBtn = document.querySelector('.finder-input button');
    const finderResults = document.querySelector('.finder-results');
    
    if (!findRoutesBtn) return;
    
    findRoutesBtn.addEventListener('click', function() {
        const from = routeFromInput.value.trim();
        const to = routeToInput.value.trim();
        const date = document.getElementById('travel-date').value;
        
        if (!from || !to) {
            alert('Please enter both departure and destination');
            return;
        }
        
        // Show loading state
        finderResults.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Finding eco-friendly routes...</p>
            </div>
        `;
        
        // Simulate API call
        setTimeout(() => {
            displayRouteResults(from, to, date);
        }, 1500);
    });
}

function displayRouteResults(from, to, date) {
    const finderResults = document.querySelector('.finder-results');
    
    // Mock data - in a real app this would come from an API
    const mockResults = [
        {
            airline: "EcoAir",
            flightNo: "EA 123",
            departure: "08:00",
            arrival: "11:00",
            duration: "3h 0m",
            aircraft: "Boeing 787",
            stops: "Non-stop",
            emissions: "120 kg CO₂",
            price: "$350"
        },
        {
            airline: "GreenWings",
            flightNo: "GW 456",
            departure: "10:30",
            arrival: "14:15",
            duration: "3h 45m",
            aircraft: "Airbus A350",
            stops: "Non-stop",
            emissions: "135 kg CO₂",
            price: "$320"
        },
        {
            airline: "SkyEco",
            flightNo: "SE 789",
            departure: "13:15",
            arrival: "17:30",
            duration: "4h 15m",
            stops: "1 stop (DXB)",
            aircraft: "Boeing 787",
            emissions: "150 kg CO₂",
            price: "$290"
        }
    ];
    
    let resultsHTML = `
        <div class="results-header">
            <h3>Eco-Friendly Options from ${from} to ${to}</h3>
            ${date ? `<p class="date">${formatDate(date)}</p>` : ''}
        </div>
        <div class="route-results">
    `;
    
    mockResults.forEach(flight => {
        resultsHTML += `
            <div class="route-card">
                <div class="route-airline">
                    <h4>${flight.airline}</h4>
                    <span class="flight-no">${flight.flightNo}</span>
                </div>
                <div class="route-times">
                    <div class="time-block">
                        <span class="time">${flight.departure}</span>
                        <span class="label">Depart</span>
                    </div>
                    <div class="duration">
                        <i class="fas fa-plane"></i>
                        <span>${flight.duration}</span>
                    </div>
                    <div class="time-block">
                        <span class="time">${flight.arrival}</span>
                        <span class="label">Arrive</span>
                    </div>
                </div>
                <div class="route-details">
                    <div class="detail">
                        <i class="fas fa-plane"></i>
                        <span>${flight.aircraft}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${flight.stops}</span>
                    </div>
                </div>
                <div class="route-emissions">
                    <div class="emission-badge">
                        <i class="fas fa-leaf"></i>
                        <span>${flight.emissions}</span>
                    </div>
                </div>
                <div class="route-price">
                    <span class="price">${flight.price}</span>
                    <button class="btn-outline">Select</button>
                </div>
            </div>
        `;
    });
    
    resultsHTML += `</div>`;
    finderResults.innerHTML = resultsHTML;
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Analytics Page Functions
function setupAnalytics() {
    // Initialize time period buttons
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(button => {
        button.addEventListener('click', function() {
            timeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateAnalyticsData(this.textContent.trim());
        });
    });
    
    // Initialize progress circles
    initProgressCircles();
}

function updateAnalyticsData(timePeriod) {
    console.log(`Loading data for: ${timePeriod}`);
    // In a real app, this would fetch data based on the time period
    // For now, we'll just simulate loading
    
    const loadingIndicators = document.querySelectorAll('.chart-placeholder');
    loadingIndicators.forEach(indicator => {
        indicator.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    });
    
    setTimeout(() => {
        // Simulate loaded data
        loadingIndicators.forEach(indicator => {
            indicator.innerHTML = '<img src="https://via.placeholder.com/600x300?text=Chart+Data" alt="Chart data">';
        });
    }, 1000);
}

function initProgressCircles() {
    const circles = document.querySelectorAll('.progress-circle');
    circles.forEach(circle => {
        const value = circle.getAttribute('data-value');
        const strokePath = circle.querySelector('path:last-child');
        
        if (strokePath) {
            const circumference = 2 * Math.PI * 15.9155;
            const offset = circumference - (value / 100) * circumference;
            strokePath.style.strokeDashoffset = offset;
        }
    });
}

// Utility Functions
function toggleLoading(show) {
    const loadingDiv = document.getElementById('loading');
    const calculateBtn = document.getElementById('calculate-btn');
    
    if (loadingDiv) loadingDiv.classList.toggle('hidden', !show);
    if (calculateBtn) calculateBtn.disabled = show;
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (!errorDiv) return;
    
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Add event listener for DOMContentLoaded to all pages
document.addEventListener('DOMContentLoaded', function() {
    // Any initialization that should run on all pages
    console.log('EcoFlight initialized');
});