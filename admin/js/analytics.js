// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAddpoD3P3TYiHBCDdaE-1WeBegF8CmGbE",
    authDomain: "fyp-travel-website-7eed9.firebaseapp.com",
    projectId: "fyp-travel-website-7eed9",
    storageBucket: "fyp-travel-website-7eed9.appspot.com",
    messagingSenderId: "466785601243",
    appId: "1:466785601243:web:5909cc22a4fa74363deefe",
    measurementId: "G-EB638XG363"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let salesChartInstance = null;  // Track the sales chart instance
let attractionChartInstance = null;  // Track the attraction chart instance

// Fetch and process the sales data for analytics
document.addEventListener('DOMContentLoaded', async () => {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'block';  // Show spinner during data fetch
    try {
        const attractionsData = await fetchAllAttractions();
        const salesData = await fetchTicketSalesData(attractionsData);

        let { salesByLocation, popularAttractions, dailySales, monthlySales } = processSalesData(salesData);

        renderSalesChart(salesByLocation);
        renderAttractionChart(popularAttractions.slice(0, 5));
        renderDailySalesChart(dailySales);
        renderMonthlySalesChart(monthlySales);

        const toggleButton = document.getElementById('toggleAttractions');
        toggleButton.addEventListener('click', () => {
            if (toggleButton.textContent === 'Show All Attractions') {
                renderAttractionChart(popularAttractions);  
                toggleButton.textContent = 'Show Top 5 Attractions';
            } else {
                renderAttractionChart(popularAttractions.slice(0, 5));  
                toggleButton.textContent = 'Show All Attractions';
            }
        });

        // Filter by date range for all charts
        document.getElementById('filterDates').addEventListener('click', async () => {
            const startDate = new Date(document.getElementById('startDate').value);
            const endDate = new Date(document.getElementById('endDate').value);

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const filteredSalesData = await fetchFilteredSalesData(startDate, endDate);
                const { salesByLocation, popularAttractions, dailySales, monthlySales } = processSalesData(filteredSalesData);

                renderSalesChart(salesByLocation);
                renderAttractionChart(popularAttractions);
                renderDailySalesChart(dailySales);
                renderMonthlySalesChart(monthlySales);
            }
        });

        // Export combined data as CSV
        document.getElementById('exportCombinedCSV').addEventListener('click', function() {
            exportCombinedCSV(salesByLocation, popularAttractions, dailySales, monthlySales, 'combined_report.csv');
        });

    } catch (error) {
        console.error('Error fetching sales data:', error);
    } finally {
        loadingSpinner.style.display = 'none';  // Hide spinner after fetching data
    }
});

// Function to export combined chart data to one CSV file
function exportCombinedCSV(salesByLocation, popularAttractions, dailySales, monthlySales, filename) {
    let csv = '';

    // Section 1: Sales By Location
    csv += 'Sales By Location\n';
    csv += 'Location,Ticket Sales\n';
    for (const [location, tickets] of Object.entries(salesByLocation)) {
        csv += `${location},${tickets}\n`;
    }
    csv += '\n';  // Add empty line for separation

    // Section 2: Popular Attractions
    csv += 'Popular Attractions\n';
    csv += 'Attraction,Tickets Sold\n';
    popularAttractions.forEach(([attraction, tickets]) => {
        csv += `${attraction},${tickets}\n`;
    });
    csv += '\n';  // Add empty line for separation

    // Section 3: Daily Sales
    csv += 'Daily Sales\n';
    csv += 'Date,Revenue (MYR),Tickets Sold\n';
    for (const [date, sales] of Object.entries(dailySales)) {
        csv += `${date},${sales.revenue},${sales.ticketsSold}\n`;
    }
    csv += '\n';  // Add empty line for separation

    // Section 4: Monthly Sales
    csv += 'Monthly Sales\n';
    csv += 'Month,Revenue (MYR)\n';
    for (const [month, sales] of Object.entries(monthlySales)) {
        csv += `${month},${sales.revenue}\n`;
    }

    // Create a Blob from the CSV string
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Create a link to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);  // Clean up the link element
}

// Function to fetch all attractions data
async function fetchAllAttractions() {
    const snapshot = await db.collection('attractions').get();
    const data = {};
    snapshot.forEach(doc => data[doc.id] = doc.data());
    return data;
}

// Function to fetch ticket sales data from Firestore
async function fetchTicketSalesData(attractionsData) {
    const snapshot = await db.collection('orders').get();
    const data = [];
    snapshot.forEach(doc => {
        const order = doc.data();
        order.items.forEach(item => {
            const attraction = attractionsData[item.attractionId];
            if (attraction) {
                item.state = attraction.state;
            }
        });
        data.push(order);
    });
    return data;
}

// Function to fetch filtered ticket sales data (by date range)
async function fetchFilteredSalesData(startDate, endDate) {
    const snapshot = await db.collection('orders')
        .where('orderDate', '>=', startDate)
        .where('orderDate', '<=', endDate)
        .get();

    const data = [];
    snapshot.forEach(doc => data.push(doc.data()));
    return data;
}

// Process sales data into formats for charts
function processSalesData(salesData) {
    const salesByLocation = { 'KL': 0, 'Penang': 0 };
    const attractionSales = {};
    const dailySales = {};
    const monthlySales = {};

    salesData.forEach(order => {
        const orderDate = order.orderDate.toDate();
        const orderDay = orderDate.toLocaleDateString();
        const orderMonth = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;

        if (!dailySales[orderDay]) {
            dailySales[orderDay] = { revenue: 0, ticketsSold: 0 };
        }
        if (!monthlySales[orderMonth]) {
            monthlySales[orderMonth] = { revenue: 0, ticketsSold: 0 };
        }

        dailySales[orderDay].revenue += order.totalAmount;
        monthlySales[orderMonth].revenue += order.totalAmount;

        order.items.forEach(item => {
            const { attractionName, quantity, state } = item;

            if (state === 'KL' || state === 'Penang') {
                salesByLocation[state] += quantity;
            }

            if (!attractionSales[attractionName]) {
                attractionSales[attractionName] = 0;
            }
            attractionSales[attractionName] += quantity;
        });
    });

    const popularAttractions = Object.entries(attractionSales).sort(([, a], [, b]) => b - a);

    return { salesByLocation, popularAttractions, dailySales, monthlySales };
}

// Function to render sales by location chart
function renderSalesChart(salesByLocation) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Destroy existing chart instance if it exists
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['KL', 'Penang'],
            datasets: [{
                label: 'Ticket Sales',
                data: [salesByLocation['KL'], salesByLocation['Penang']],
                backgroundColor: ['#FFAA33', '#FF5733']
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Function to render daily sales chart
function renderDailySalesChart(dailySales) {
    const sortedDates = Object.keys(dailySales).map(dateStr => new Date(dateStr)).sort((a, b) => a - b);
    const sortedFormattedDates = sortedDates.map(dateObj => dateObj.toLocaleDateString('en-GB'));
    const sortedData = sortedDates.map(dateObj => {
        const originalKey = dateObj.toLocaleDateString('en-US');
        return dailySales[originalKey].revenue;
    });

    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedFormattedDates,
            datasets: [{
                label: 'Revenue (MYR)',
                data: sortedData,
                borderColor: '#FF5733',
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Function to render monthly sales chart
function renderMonthlySalesChart(monthlySales) {
    const ctx = document.getElementById('monthlySalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthlySales),
            datasets: [{
                label: 'Revenue (MYR)',
                data: Object.values(monthlySales).map(month => month.revenue),
                backgroundColor: '#FFC300'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Function to render popular attractions chart
function renderAttractionChart(popularAttractions) {
    const ctx = document.getElementById('attractionChart').getContext('2d');

    // Destroy existing chart instance if it exists
    if (attractionChartInstance) {
        attractionChartInstance.destroy();
    }

    attractionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: popularAttractions.map(attraction => attraction[0]),
            datasets: [{
                label: 'Tickets Sold',
                data: popularAttractions.map(attraction => attraction[1]),
                backgroundColor: ['#FFAA33', '#FF5733', '#FFC300', '#DAF7A6', '#C70039']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: { x: { beginAtZero: true } }
        }
    });
}
