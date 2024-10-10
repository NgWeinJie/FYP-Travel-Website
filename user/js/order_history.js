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
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await getCurrentUser();
        const orders = await fetchUserOrders(user.uid);
        displayOrderHistory(orders, 'upcoming'); // Initially display upcoming orders

        // Event listeners for tabs
        document.getElementById('upcoming-tab').addEventListener('click', () => {
            displayOrderHistory(orders, 'upcoming');
            toggleActiveTab('upcoming');
        });

        document.getElementById('history-tab').addEventListener('click', () => {
            displayOrderHistory(orders, 'history');
            toggleActiveTab('history');
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
    }
});

// Function to toggle active tab
function toggleActiveTab(tab) {
    document.getElementById('upcoming-tab').classList.remove('active');
    document.getElementById('history-tab').classList.remove('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Function to get the currently logged-in user
function getCurrentUser() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                resolve(user);
            } else {
                reject('No user is signed in.');
            }
        });
    });
}

// Function to fetch user orders from Firestore
async function fetchUserOrders(userId) {
    try {
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('orderDate', 'desc')
            .get();

        const orders = [];
        const attractionIds = new Set();

        // Collect all attractionIds from orders
        ordersSnapshot.docs.forEach(doc => {
            const orderData = doc.data();
            orderData.items.forEach(item => {
                attractionIds.add(item.attractionId);
            });
            orders.push({ id: doc.id, ...orderData });
        });

        // Fetch all attraction data in a single batch request
        const attractionDataMap = await fetchAttractions([...attractionIds]);

        // Map attraction data to orders
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

// Helper function to compare only the date part of two dates
function isSameDateWithoutTime(date1, date2) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

// Function to display order history based on filter (upcoming or history)
function displayOrderHistory(orders, filter) {
    const orderHistoryContainer = document.getElementById('orderHistoryContainer');
    orderHistoryContainer.innerHTML = ''; // Clear previous content

    if (orders.length === 0) {
        orderHistoryContainer.innerHTML = '<p>No orders found.</p>';
        return;
    }

    const now = new Date();
    const filteredOrders = orders.filter(order => {
        return order.items.some(item => {
            const visitDate = new Date(item.visitDate);
            if (filter === 'upcoming') {
                return visitDate > now || isSameDateWithoutTime(visitDate, now); // Include today's date as upcoming
            } else {
                return visitDate < now && !isSameDateWithoutTime(visitDate, now); // Exclude today's date from history
            }
        });
    });

    if (filteredOrders.length === 0) {
        orderHistoryContainer.innerHTML = `<p>No ${filter} orders found.</p>`;
        return;
    }

    const orderHTML = filteredOrders.map(order => {
        let promoCodeHTML = '';
        let promoDiscountHTML = '';
        let coinsDiscountHTML = '';

        if (order.promoCode && order.promoCode !== 'None') {
            promoCodeHTML = `<p><strong>Promo Code:</strong> ${order.promoCode}</p>`;
        }

        if (order.promoDiscount && order.promoDiscount > 0) {
            promoDiscountHTML = `<p><strong>Promo Discount:</strong> RM ${order.promoDiscount.toFixed(2)}</p>`;
        }

        if (order.coinsDiscount && order.coinsDiscount > 0) {
            coinsDiscountHTML = `<p><strong>Coins Discount:</strong> RM ${order.coinsDiscount.toFixed(2)}</p>`;
        }

        return `
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
                                    <td><img src="${item.attractionImage}" alt="${item.attractionName}" class="img-fluid" style="max-width: 100px;" loading="lazy"></td>
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
                    ${promoCodeHTML}
                    ${promoDiscountHTML}
                    ${coinsDiscountHTML}
                    <p><strong>Total Amount:</strong> RM ${order.finalAmount.toFixed(2)}</p>
                </div>
                <div class="order-actions text-right">
                    <button class="btn btn-primary" onclick="viewTicket('${order.id}')">View Ticket</button>
                    <button class="btn btn-secondary" onclick="downloadTicketPDF('${order.id}')">Download PDF</button>
                </div>
            </div>
        `;
    }).join('');

    orderHistoryContainer.innerHTML = orderHTML;
}

// Function to view the ticket (open PDF in a new window)
async function viewTicket(orderId) {
    try {
        const order = await fetchOrderById(orderId); // Fetch order details
        const user = await getCurrentUser();
        const doc = await generateTicketPDF(order, user, false); // Generate the PDF (don't save, just view)
        window.open(doc.output('bloburl')); // Open the PDF in a new tab
    } catch (error) {
        console.error('Error viewing ticket:', error);
    }
}

// Function to download the ticket as a PDF
async function downloadTicketPDF(orderId) {
    try {
        const order = await fetchOrderById(orderId); // Fetch order details
        const user = await getCurrentUser();
        await generateTicketPDF(order, user, true); // Generate and save the PDF
    } catch (error) {
        console.error('Error downloading ticket:', error);
    }
}

// Helper function to fetch an order by ID
async function fetchOrderById(orderId) {
    try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        return orderDoc.exists ? orderDoc.data() : null;
    } catch (error) {
        console.error('Error fetching order:', error);
        return null;
    }
}

// Function to generate the PDF
async function generateTicketPDF(order, user, save = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Function to generate QR code
    async function generateQRCode(text) {
        return new Promise((resolve, reject) => {
            QRCode.toDataURL(text, { errorCorrectionLevel: 'H' }, (err, url) => {
                if (err) reject(err);
                resolve(url);
            });
        });
    }

    // Function to center text
    const centerText = (text, y, fontSize, fontStyle) => {
        const width = doc.internal.pageSize.width;
        doc.setFontSize(fontSize);
        doc.setFont(fontStyle);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (width - textWidth) / 2, y);
    };

    // Function to center QR code
    const centerQRCode = (qrCodeURL, y) => {
        const width = doc.internal.pageSize.width;
        doc.addImage(qrCodeURL, 'JPEG', (width - 50) / 2, y, 50, 50); // Center QR code horizontally
    };

    // Generate content for each ticket in the order
    for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const qrCodeData = `Attraction: ${item.attractionName}, Type: ${item.ticketType}, Date: ${item.visitDate}`;
        const qrCodeURL = await generateQRCode(qrCodeData);

        if (i > 0) {
            doc.addPage(); // Add a new page for each ticket
        }

        doc.setTextColor("#FFAA33");
        centerText('FlyOne Travel Explorer', 20, 24, 'bold');

        doc.setTextColor("#000000");
        centerText('Thank you for your purchase!', 30, 16, 'normal');

        centerText(`Attraction: ${item.attractionName}`, 50, 16, 'normal');
        centerText(`Type: ${item.ticketType}`, 60, 16, 'normal');
        centerText(`Date of Visit: ${item.visitDate}`, 70, 16, 'normal');
        centerText('Show this QR code at the entrance:', 80, 16, 'normal');
        
        centerQRCode(qrCodeURL, 90);
    }

    // Either save the PDF or return it for viewing
    if (save) {
        const fileName = `Tickets_${order.id}.pdf`;
        doc.save(fileName);
    } else {
        return doc;
    }
}
