document.addEventListener('DOMContentLoaded', () => {

    // Data Models
    const locations = {
        'dense-urban': { baseTemp: 41.5, name: 'Dense Urban Center' },
        'industrial': { baseTemp: 44.0, name: 'Industrial Zone' },
        'suburban': { baseTemp: 34.2, name: 'Suburban Residential' }
    };

    // Cooling Effects
    const interventionEffects = {
        'trees': 2.8,
        'shade': 1.5,
        'reflect': 3.2
    };

    // DOM Elements
    const locationSelect = document.getElementById('location-select');
    const toggles = document.querySelectorAll('.intervention-toggle');
    const tempDisplay = document.getElementById('temp-display');
    const riskDisplay = document.getElementById('risk-display');
    const heatMap = document.getElementById('heat-map');

    // Calculations
    function updateDashboard() {
        const currentLocation = locationSelect.value;
        let currentTemp = locations[currentLocation].baseTemp;

        // Interventions
        toggles.forEach(toggle => {
            if (toggle.checked) {
                currentTemp -= interventionEffects[toggle.value];
            }
        });

        // Format to 1 decimal place
        currentTemp = Math.round(currentTemp * 10) / 10;
        
        // Update DOM
        tempDisplay.textContent = `${currentTemp}°C`;
        updateRiskMetrics(currentTemp);
    }

    function updateRiskMetrics(temp) {
        let riskLevel = '';
        let color = '';
        let mapOpacity = 0;

        // Threshold Logic
        if (temp >= 40) {
            riskLevel = 'Extreme Risk';
            color = 'var(--risk-extreme)';
            mapOpacity = 0.6;
        } else if (temp >= 36) {
            riskLevel = 'High Risk';
            color = 'var(--risk-high)';
            mapOpacity = 0.4;
        } else if (temp >= 32) {
            riskLevel = 'Moderate Risk';
            color = 'var(--risk-moderate)';
            mapOpacity = 0.2;
        } else {
            riskLevel = 'Low Risk';
            color = 'var(--risk-low)';
            mapOpacity = 0.05;
        }

        riskDisplay.textContent = riskLevel;
        riskDisplay.style.color = color;
        tempDisplay.style.color = color;

        // Update Map Visual 
        heatMap.style.background = `radial-gradient(circle, ${color.replace('var(', '').replace(')', '')} 0%, rgba(30, 41, 59, 0) 70%)`;
        heatMap.style.opacity = mapOpacity;
    }

    // Event Listeners
    locationSelect.addEventListener('change', updateDashboard);
    toggles.forEach(toggle => {
        toggle.addEventListener('change', updateDashboard);
    });

    // Initializer
    updateDashboard();

});
