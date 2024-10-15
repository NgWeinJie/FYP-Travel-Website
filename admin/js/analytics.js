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

// Firebase configuration (same as before)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let salesData, dailySales, monthlySales; // Declare globally

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const attractionsData = await fetchAllAttractions();
        salesData = await fetchTicketSalesData(attractionsData); // Store data in the global variable

        const { salesByLocation, allAttractions: processedAllAttractions, topAttractions: processedTopAttractions, dailySales: processedDailySales, monthlySales: processedMonthlySales } = processSalesData(salesData);

        // Assign globally so that the button and other parts can access them
        window.allAttractions = processedAllAttractions;
        window.topAttractions = processedTopAttractions;

        dailySales = processedDailySales;
        monthlySales = processedMonthlySales;

        renderSalesTable(salesByLocation);
        renderAttractionChart(window.topAttractions);
        renderDailySalesChart(dailySales);
        renderMonthlySalesChart(monthlySales);

        // Event Listener for Export Button
        document.getElementById('exportBtn').addEventListener('click', () => {
            exportCartDataToCSV(salesData, salesByLocation, window.allAttractions, dailySales, monthlySales);
        });

        // Add Event Listeners for the date filters
        document.getElementById('dailySalesStartDate').addEventListener('change', filterCharts);
        document.getElementById('dailySalesEndDate').addEventListener('change', filterCharts);
        document.getElementById('monthlySalesStartMonth').addEventListener('change', filterCharts);
        document.getElementById('monthlySalesEndMonth').addEventListener('change', filterCharts);
    } catch (error) {
        console.error('Error fetching sales data:', error);
    }
});

// Function to fetch all attractions data at once
async function fetchAllAttractions() {
    const attractionsSnapshot = await db.collection('attractions').get();
    const attractionsData = {};
    attractionsSnapshot.forEach(doc => {
        attractionsData[doc.id] = doc.data();
    });
    return attractionsData;
}

// Function to fetch ticket sales data from Firestore
async function fetchTicketSalesData(attractionsData) {
    const ordersSnapshot = await db.collection('orders').get();
    const salesData = [];

    ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        const processedItems = [];

        orderData.items.forEach(item => {
            const attractionData = attractionsData[item.attractionId];
            if (attractionData && attractionData.state) {
                processedItems.push({
                    ...item,
                    state: attractionData.state
                });
            }
        });

        salesData.push({
            ...orderData,
            items: processedItems
        });
    });

    console.log('Fetched sales data:', salesData); // Add this line
    return salesData;
}


// Function to process sales data for charts
function processSalesData(salesData) {
    const salesByLocation = { 'KL': 0, 'Penang': 0 };
    const attractionSales = {};
    const dailySales = {};
    const monthlySales = {};

    salesData.forEach(order => {
        const orderDate = order.orderDate.toDate();  // Convert Firestore Timestamp to JS Date
        const orderDay = orderDate.toLocaleDateString();  // Format: "MM/DD/YYYY"
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;  // Format: "YYYY-MM" with zero-padding

        if (!dailySales[orderDay]) {
            dailySales[orderDay] = { revenue: 0, ticketsSold: 0 };
        }
        if (!monthlySales[orderMonth]) {
            monthlySales[orderMonth] = { revenue: 0, ticketsSold: 0 };
        }

        dailySales[orderDay].revenue += order.totalAmount;
        dailySales[orderDay].ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);

        monthlySales[orderMonth].revenue += order.totalAmount;
        monthlySales[orderMonth].ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);

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

    // Sort attractions by popularity
    const allAttractions = Object.entries(attractionSales)
        .sort(([, a], [, b]) => b - a);  // Sort by quantity sold

    // Top 5 attractions
    const topAttractions = allAttractions.slice(0, 5);

    return { salesByLocation, allAttractions, topAttractions, dailySales, monthlySales };
}



// Render ticket sales by location chart
function renderSalesChart(salesByLocation) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
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
            animation: {
                duration: 1000, // Masa untuk animasi
                easing: 'easeOutBounce' // Jenis easing untuk animasi
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

let dailySalesChartInstance = null; // Declare a global variable to store the chart instance

function renderDailySalesChart(dailySales) {
    const ctx = document.getElementById('dailySalesChart').getContext('2d');

    // Destroy the existing chart if it exists
    if (dailySalesChartInstance) {
        dailySalesChartInstance.destroy();
    }

    // Sort and prepare the data
    const sortedDates = Object.keys(dailySales).sort((a, b) => new Date(a) - new Date(b));
    const sortedRevenues = sortedDates.map(date => dailySales[date].revenue);

    const formattedDates = sortedDates.map(date => {
        const parts = date.split('/'); // Format: MM/DD/YYYY
        return `${parts[1]}/${parts[0]}/${parts[2]}`; // Convert to DD/MM/YYYY
    });

    // Create a new chart and store it in the global variable
    dailySalesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [{
                label: 'Revenue (MYR)',
                data: sortedRevenues,
                borderColor: '#FF5733',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Fix chart height
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

let monthlySalesChartInstance = null; // Global variable for monthly chart instance

function renderMonthlySalesChart(monthlySales) {
    const ctx = document.getElementById('monthlySalesChart').getContext('2d');

    // Destroy the existing chart if it exists
    if (monthlySalesChartInstance) {
        monthlySalesChartInstance.destroy();
    }

    const months = Object.keys(monthlySales);
    const revenues = months.map(month => monthlySales[month].revenue);

    // Create a new chart and store it in the global variable
    monthlySalesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,  // Ensure this is sorted in ascending order
            datasets: [{
                label: 'Revenue (MYR)',
                data: revenues,
                backgroundColor: '#FFC300'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Fix chart height
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

let showAllAttractions = false; // Variable to track whether all attractions or only top 5 are shown

// Render popular attractions chart
function renderAttractionChart(attractions) {
    const ctx = document.getElementById('attractionChart').getContext('2d');
    filterMonthlySales
    const chartData = {
        type: 'bar',
        data: {
            labels: attractions.map(attraction => attraction[0]),
            datasets: [{
                label: 'Tickets Sold',
                data: attractions.map(attraction => attraction[1]),
                backgroundColor: ['#FFAA33', '#FF5733', '#FFC300', '#DAF7A6', '#C70039']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false, // Allow the chart to adjust while maintaining fixed height
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    };

    // Destroy and recreate chart when switching between views
    if (window.attractionChart && typeof window.attractionChart.destroy === 'function') {
        window.attractionChart.destroy();
    }

    window.attractionChart = new Chart(ctx, chartData);
}

function renderSalesTable(salesByLocation) {
    const salesTableBody = document.getElementById('salesTableBody');
    salesTableBody.innerHTML = ''; // Clear any existing rows

    // Create rows for each location
    for (const location in salesByLocation) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${location}</td>
            <td>${salesByLocation[location]}</td>
        `;
        salesTableBody.appendChild(row);
    }
}

// Function to toggle between top 5 and all attractions
function toggleAttractionsView(allAttractions, topAttractions) {
    showAllAttractions = !showAllAttractions;
    if (showAllAttractions) {
        renderAttractionChart(allAttractions);  // Show all attractions
        document.getElementById('toggleAttractionsBtn').innerText = 'Show Top 5';
    } else {
        renderAttractionChart(topAttractions);  // Show top 5 attractions
        document.getElementById('toggleAttractionsBtn').innerText = 'Show All';
    }
}

// Function to export cart data to CSV
function exportCartDataToCSV(salesData, salesByLocation, allAttractions, dailySales, monthlySales) {
    if (!salesData || salesData.length === 0) {
        console.error('No sales data available for export.');
        return; // Exit if no data
    }

    const csvRows = [];

    // Add headers for Sales Data by Location
    csvRows.push('Sales Data by Location');
    csvRows.push('Location,Tickets Sold');
    for (const location in salesByLocation) {
        const row = `${location},${salesByLocation[location]}`;
        csvRows.push(row);
    }
    csvRows.push(''); // Add an empty row for separation

    // Add headers for Popular Attractions (this is where we ensure all attractions are exported)
    csvRows.push('Popular Attractions');
    csvRows.push('Attraction Name,Tickets Sold');
    allAttractions.forEach(attraction => {
        const row = `${attraction[0]},${attraction[1]}`; // Export all attractions
        csvRows.push(row);
    });
    csvRows.push(''); // Add an empty row for separation

    // Add headers for Daily Sales
    csvRows.push('Daily Sales');
    csvRows.push('Date,Revenue (MYR),Tickets Sold');
    for (const date in dailySales) {
        const { revenue, ticketsSold } = dailySales[date];
        const row = `${date},${revenue},${ticketsSold}`;
        csvRows.push(row);
    }
    csvRows.push(''); // Add an empty row for separation

    // Add headers for Monthly Sales
    csvRows.push('Monthly Sales');
    csvRows.push('Month,Revenue (MYR),Tickets Sold');
    for (const month in monthlySales) {
        const { revenue, ticketsSold } = monthlySales[month];
        const row = `${month},${revenue},${ticketsSold}`;
        csvRows.push(row);
    }

    // Create a Blob from the CSV string
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Create a link to download the CSV
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sales_data.csv');
    a.click();

    // Cleanup
    URL.revokeObjectURL(url);
}


function filterCharts() {
    const dailyStartDate = document.getElementById('dailySalesStartDate').value;
    const dailyEndDate = document.getElementById('dailySalesEndDate').value;
    const monthlyStartMonth = document.getElementById('monthlySalesStartMonth').value;
    const monthlyEndMonth = document.getElementById('monthlySalesEndMonth').value;

    // Filter daily sales based on start and end date
    if (dailyStartDate && dailyEndDate) {
        const filteredDailySales = filterDailySales(dailyStartDate, dailyEndDate, dailySales); // dailySales is global
        renderDailySalesChart(filteredDailySales);
    }

    // Filter monthly sales based on start and end month
    if (monthlyStartMonth && monthlyEndMonth) {
        const filteredMonthlySales = filterMonthlySales(monthlyStartMonth, monthlyEndMonth);
        renderMonthlySalesChart(filteredMonthlySales);
    }
}

function filterDailySales(startDate, endDate) {
    const dailySalesFiltered = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of the day

    Object.keys(dailySales).forEach(date => {
        const currentDate = new Date(date);
        if (currentDate >= start && currentDate <= end) {
            dailySalesFiltered[date] = dailySales[date];
        }
    });

    return dailySalesFiltered;
}


function filterMonthlySales(startMonth, endMonth) {
    const monthlySalesFiltered = {};

    // Create Date objects for comparison
    const start = new Date(`${startMonth}-01`);  // Start of the start month
    const end = new Date(`${endMonth}-01`);      // Start of the end month
    end.setMonth(end.getMonth() + 1);            // Move to the next month to include the full end month

    // Loop through the months in monthlySales and filter based on the start and end range
    Object.keys(monthlySales).forEach(month => {
        const currentMonth = new Date(`${month}-01`);  // Convert month to a Date object

        // Check if the current month is within the range [start, end)
        if (currentMonth >= start && currentMonth < end) {
            monthlySalesFiltered[month] = monthlySales[month];  // Include month in filtered results
        }
    });

    // Sort the filtered months in ascending order
    const sortedMonths = Object.keys(monthlySalesFiltered).sort();

    // Create a new object with sorted months
    const sortedMonthlySalesFiltered = {};
    sortedMonths.forEach(month => {
        sortedMonthlySalesFiltered[month] = monthlySalesFiltered[month];
    });

    console.log('Filtered and Sorted Monthly Sales:', sortedMonthlySalesFiltered); // Debugging line
    return sortedMonthlySalesFiltered;
}