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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const orders = await fetchAllOrders();
        displayCustomerHistory(orders, 'upcoming'); // Initially display upcoming orders

        // Event listeners for tabs
        document.getElementById('upcoming-tab').addEventListener('click', () => {
            displayCustomerHistory(orders, 'upcoming');
            toggleActiveTab('upcoming');
        });

        document.getElementById('history-tab').addEventListener('click', () => {
            displayCustomerHistory(orders, 'history');
            toggleActiveTab('history');
        });

        // Real-time search functionality
        document.getElementById('searchInput').addEventListener('input', () => {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const currentTab = document.querySelector('.nav-tabs .active').id.includes('history') ? 'history' : 'upcoming';
            
            const filteredOrders = orders.filter(order =>
                order.id.toLowerCase().includes(searchTerm) ||
                `${order.userDetails.firstName} ${order.userDetails.lastName}`.toLowerCase().includes(searchTerm)
            );
            displayCustomerHistory(filteredOrders, currentTab); // Use the current tab filter
        });
    } catch (error) {
        console.error('Error fetching customer history:', error);
    }
});

// Function to fetch all orders from Firestore and include images
async function fetchAllOrders() {
    try {
        const ordersSnapshot = await db.collection('orders').orderBy('orderDate', 'desc').get();
        const orders = [];
        const attractionIds = new Set();

        // Collect all attractionIds from orders
        ordersSnapshot.docs.forEach(doc => {
            const orderData = doc.data();
            orderData.items.forEach(item => {
                attractionIds.add(item.attractionId); // Collect attraction IDs for image fetching
            });
            orders.push({ id: doc.id, ...orderData });
        });

        // Fetch all attraction data in a single batch request
        const attractionDataMap = await fetchAttractions([...attractionIds]);

        // Map attraction images to orders
        orders.forEach(order => {
            order.items.forEach(item => {
                item.attractionImage = attractionDataMap[item.attractionId]?.images[0] || 'path/to/default-image.jpg';
            });
        });

        return orders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

// Function to fetch multiple attractions data in a single request
async function fetchAttractions(attractionIds) {
    const attractionsDataMap = {};
    try {
        const batchSize = 10; // Firestore allows a maximum of 10 elements for 'in' query
        for (let i = 0; i < attractionIds.length; i += batchSize) {
            const batch = attractionIds.slice(i, i + batchSize); // Slice the array into batches of 10
            const attractionDocs = await db.collection('attractions')
                .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
                .get();

            attractionDocs.forEach(doc => {
                attractionsDataMap[doc.id] = doc.data();
            });
        }
    } catch (error) {
        console.error('Error fetching attractions:', error);
    }
    return attractionsDataMap;
}

// Function to toggle active tab
function toggleActiveTab(tab) {
    document.getElementById('upcoming-tab').classList.remove('active');
    document.getElementById('history-tab').classList.remove('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Function to display customer history based on filter (upcoming or history)
function displayCustomerHistory(orders, filter) {
    const customerHistoryContainer = document.getElementById('customerHistoryContainer');
    customerHistoryContainer.innerHTML = ''; // Clear previous content

    if (orders.length === 0) {
        customerHistoryContainer.innerHTML = '<p>No orders found.</p>';
        return;
    }

    const now = new Date();
    const filteredOrders = orders.filter(order => {
        return order.items.some(item => {
            const visitDate = new Date(item.visitDate);
            if (filter === 'upcoming') {
                return visitDate > now; 
            } else {
                return visitDate < now; // For history, show past orders
            }
        });
    });

    if (filteredOrders.length === 0) {
        customerHistoryContainer.innerHTML = `<p>No ${filter} orders found.</p>`;
        return;
    }

    const orderHTML = filteredOrders.map(order => `
        <div class="order-card">
            <h4>Order ID: ${order.id}</h4>
            <p><strong>Date:</strong> ${order.orderDate.toDate().toLocaleString()}</p>
            <p><strong>User Details:</strong></p>
            <ul>
                <li><strong>Name:</strong> ${order.userDetails.firstName} ${order.userDetails.lastName}</li>
                <li><strong>Email:</strong> ${order.userDetails.email}</li>
                <li><strong>Contact Number:</strong> ${order.userDetails.contactNumber}</li>
            </ul>
            <h5>Order Items:</h5>
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead class="thead-custom">
                        <tr>
                            <th scope="col">Image</th>
                            <th scope="col">Attraction</th>
                            <th scope="col">Type</th>
                            <th scope="col">Quantity</th>
                            <th scope="col">Price</th>
                            <th scope="col">Visit Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td><img src="${item.attractionImage || 'path/to/default-image.jpg'}" alt="${item.attractionName}" class="img-fluid" style="max-width: 100px;" loading="lazy"></td>
                                <td>${item.attractionName}</td>
                                <td>${item.ticketType}</td>
                                <td>${item.quantity}</td>
                                <td>RM ${item.price.toFixed(2)}</td>
                                <td>${item.visitDate}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="order-summary text-right">
                <p><strong>Promo Code:</strong> ${order.promoCode || 'None'}</p>
                <p><strong>Promo Discount:</strong> RM ${order.promoDiscount ? order.promoDiscount.toFixed(2) : '0.00'}</p>
                <p><strong>Total Amount:</strong> RM ${order.finalAmount.toFixed(2)}</p>
            </div>
        </div>
    `).join('');

    customerHistoryContainer.innerHTML = orderHTML;
}
