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

// Fetch and process the sales data for analytics
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch all attractions data once
        const attractionsData = await fetchAllAttractions();

        // Fetch ticket sales data and process it with attractions data
        const salesData = await fetchTicketSalesData(attractionsData);

        // Process the data for charts
        const { salesByLocation, popularAttractions, dailySales, monthlySales } = processSalesData(salesData);

        // Render the charts
        renderSalesChart(salesByLocation);
        renderAttractionChart(popularAttractions);
        renderDailySalesChart(dailySales);
        renderMonthlySalesChart(monthlySales);
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

        // For each item in the order, get the state from the cached attractions data
        orderData.items.forEach(item => {
            const attractionData = attractionsData[item.attractionId];
            if (attractionData && attractionData.state) {
                // Add the state to the item
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
        const orderMonth = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;  // Format: "YYYY-MM"

        // Initialize daily and monthly sales objects if not present
        if (!dailySales[orderDay]) {
            dailySales[orderDay] = { revenue: 0, ticketsSold: 0 };
        }
        if (!monthlySales[orderMonth]) {
            monthlySales[orderMonth] = { revenue: 0, ticketsSold: 0 };
        }

        // Calculate revenue and tickets sold
        dailySales[orderDay].revenue += order.totalAmount;
        dailySales[orderDay].ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);

        monthlySales[orderMonth].revenue += order.totalAmount;
        monthlySales[orderMonth].ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);

        order.items.forEach(item => {
            const { attractionName, quantity, state } = item;

            // Count sales by state (KL, Penang)
            if (state === 'KL' || state === 'Penang') {
                salesByLocation[state] += quantity;
            }

            // Track popular attractions
            if (!attractionSales[attractionName]) {
                attractionSales[attractionName] = 0;
            }
            attractionSales[attractionName] += quantity;
        });
    });

    // Sort attractions by popularity
    const popularAttractions = Object.entries(attractionSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);  // Top 5 attractions

    return { salesByLocation, popularAttractions, dailySales, monthlySales };
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
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render daily sales chart
function renderDailySalesChart(dailySales) {
    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(dailySales), // Dates as labels
            datasets: [{
                label: 'Revenue (MYR)',
                data: Object.values(dailySales).map(day => day.revenue),
                borderColor: '#FF5733',
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render monthly sales chart
function renderMonthlySalesChart(monthlySales) {
    const ctx = document.getElementById('monthlySalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthlySales), // Months as labels
            datasets: [{
                label: 'Revenue (MYR)',
                data: Object.values(monthlySales).map(month => month.revenue),
                backgroundColor: '#FFC300'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render popular attractions chart
function renderAttractionChart(popularAttractions) {
    const ctx = document.getElementById('attractionChart').getContext('2d');
    new Chart(ctx, {
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
    });
}


