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

// Function to create the media element
function createMediaElement(images) {
    return `
        <div class="row">
            <div class="col-12 col-md-8 pr-md-1 main-img-container">
                <img src="${images[0]}" class="img-fluid main-img" alt="Attraction Image 1">
            </div>
            <div class="col-12 col-md-4 pl-md-1">
                <div class="row">
                    <div class="col-12 mb-2 secondary-img-container">
                        <img src="${images[1]}" class="img-fluid secondary-img" alt="Attraction Image 2">
                    </div>
                    <div class="col-12 secondary-img-container">
                        <img src="${images[2]}" class="img-fluid secondary-img" alt="Attraction Image 3">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function to calculate total
function calculateTotal() {
    const ticketPriceMalaysianAdult = parseFloat(document.getElementById('ticketPriceMalaysianAdult').innerText);
    const ticketPriceMalaysianChild = parseFloat(document.getElementById('ticketPriceMalaysianChild').innerText);
    const ticketPriceNonMalaysianAdult = parseFloat(document.getElementById('ticketPriceNonMalaysianAdult').innerText);
    const ticketPriceNonMalaysianChild = parseFloat(document.getElementById('ticketPriceNonMalaysianChild').innerText);

    const quantityMalaysianAdult = parseInt(document.getElementById('qtyMalaysianAdult').value) || 0;
    const quantityMalaysianChild = parseInt(document.getElementById('qtyMalaysianChild').value) || 0;
    const quantityNonMalaysianAdult = parseInt(document.getElementById('qtyNonMalaysianAdult').value) || 0;
    const quantityNonMalaysianChild = parseInt(document.getElementById('qtyNonMalaysianChild').value) || 0;

    const total = (ticketPriceMalaysianAdult * quantityMalaysianAdult) +
                  (ticketPriceMalaysianChild * quantityMalaysianChild) +
                  (ticketPriceNonMalaysianAdult * quantityNonMalaysianAdult) +
                  (ticketPriceNonMalaysianChild * quantityNonMalaysianChild);

    document.getElementById('totalAmount').innerText = `Total: ${total.toFixed(2)} MYR`;
}

// Fetch and display attraction details
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const attractionId = urlParams.get('id');
    
    if (!attractionId) {
        document.getElementById('attraction-details').innerHTML = "<p class='text-danger'>Invalid attraction ID.</p>";
        return;
    }

    try {
        const doc = await db.collection('attractions').doc(attractionId).get();
        if (!doc.exists) {
            document.getElementById('attraction-details').innerHTML = "<p class='text-danger'>No details available for this attraction.</p>";
            return;
        }

        const data = doc.data();
        const mediaElement = createMediaElement(data.images);

        const detailsHTML = `
            <h2>${data.destinationName}</h2>
            ${mediaElement}
            <div id="ticketing" class="bg-light p-4 rounded shadow-sm">
                <h3 class="mb-4">Purchase Tickets</h3>
                <div class="form-group">
                    <label for="visitDate">Select Date:</label>
                    <input type="date" id="visitDate" class="form-control">
                </div>
                <div class="card mb-3">
                    <div class="card-header text-white" style="background-color: #FFAA33;">Malaysian</div>
                    <div class="card-body">
                        <div class="form-group ticket-item">
                            <div class="ticket-name">Adult (>13 years)</div>
                            <div class="ticket-price">MYR <span id="ticketPriceMalaysianAdult">${data.ticketPriceMalaysianAdult}</span></div>
                            <div class="qty-controls">
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('MalaysianAdult', -1)">-</button>
                                <input type="text" id="qtyMalaysianAdult" class="form-control mx-2 text-center qty-box" value="0" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('MalaysianAdult', 1)">+</button>
                            </div>
                        </div>
                        <div class="form-group ticket-item">
                            <div class="ticket-name">Child (3 - 12 years)</div>
                            <div class="ticket-price">MYR <span id="ticketPriceMalaysianChild">${data.ticketPriceMalaysianChild}</span></div>
                            <div class="qty-controls">
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('MalaysianChild', -1)">-</button>
                                <input type="text" id="qtyMalaysianChild" class="form-control mx-2 text-center qty-box" value="0" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('MalaysianChild', 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card mb-3">
                    <div class="card-header text-white" style="background-color: #FFAA33;">Non-Malaysian</div>
                    <div class="card-body">
                        <div class="form-group ticket-item">
                            <div class="ticket-name">Adult (>13 years)</div>
                            <div class="ticket-price">MYR <span id="ticketPriceNonMalaysianAdult">${data.ticketPriceNonMalaysianAdult}</span></div>
                            <div class="qty-controls">
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('NonMalaysianAdult', -1)">-</button>
                                <input type="text" id="qtyNonMalaysianAdult" class="form-control mx-2 text-center qty-box" value="0" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('NonMalaysianAdult', 1)">+</button>
                            </div>
                        </div>
                        <div class="form-group ticket-item">
                            <div class="ticket-name">Child (3 - 12 years)</div>
                            <div class="ticket-price">MYR <span id="ticketPriceNonMalaysianChild">${data.ticketPriceNonMalaysianChild}</span></div>
                            <div class="qty-controls">
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('NonMalaysianChild', -1)">-</button>
                                <input type="text" id="qtyNonMalaysianChild" class="form-control mx-2 text-center qty-box" value="0" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustQuantity('NonMalaysianChild', 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
                <h4 id="totalAmount" style="color: #FFAA33;">Total: 0 MYR</h4>
                <div class="text-right">
                    <button type="button" class="btn btn-primary mt-3" onclick="addToCart()" style="background-color: #FFAA33; border-color: #FFAA33;">Add to Cart</button>
                </div>
            </div>
            <p class="mt-4">${data.description}</p>
            <p><strong>Operating Hours:</strong> ${data.operatingHours}</p>
            <a href="${data.googleMapLink}" class="btn btn-light" target="_blank">View on Map</a>
        `;
        document.getElementById('attraction-details').innerHTML = detailsHTML;

        // Add event listeners
        document.getElementById('visitDate').addEventListener('change', calculateTotal);
        document.querySelectorAll('#ticketing .form-control').forEach(el => {
            el.addEventListener('change', calculateTotal);
        });
    } catch (error) {
        console.error("Error fetching attraction details: ", error);
        document.getElementById('attraction-details').innerHTML = "<p class='text-danger'>Error loading details. Please try again later.</p>";
    }
});

// Adjust quantity function
function adjustQuantity(type, change) {
    const qtyInput = document.getElementById(`qty${type}`);
    let currentQty = parseInt(qtyInput.value) || 0;
    currentQty += change;
    if (currentQty < 0) currentQty = 0;
    qtyInput.value = currentQty;
    calculateTotal();
}

async function addToCart() {
    const user = auth.currentUser;  // Get current user
    if (!user) {
        alert('Please log in to add items to your cart.');
        return;
    }

    const attractionId = new URLSearchParams(window.location.search).get('id');
    const visitDate = document.getElementById('visitDate').value;
    const qtyMalaysianAdult = parseInt(document.getElementById('qtyMalaysianAdult').value) || 0;
    const qtyMalaysianChild = parseInt(document.getElementById('qtyMalaysianChild').value) || 0;
    const qtyNonMalaysianAdult = parseInt(document.getElementById('qtyNonMalaysianAdult').value) || 0;
    const qtyNonMalaysianChild = parseInt(document.getElementById('qtyNonMalaysianChild').value) || 0;
    const totalAmount = parseFloat(document.getElementById('totalAmount').innerText.replace('Total: ', '').replace(' MYR', ''));

    // Validation: Check if a visit date is selected
    if (!visitDate) {
        alert('Please select a date for your visit.');
        return;
    }

    // Validation: Check if at least one ticket is selected
    const quantities = {};
    if (qtyMalaysianAdult > 0) quantities.MalaysianAdult = qtyMalaysianAdult;
    if (qtyMalaysianChild > 0) quantities.MalaysianChild = qtyMalaysianChild;
    if (qtyNonMalaysianAdult > 0) quantities.NonMalaysianAdult = qtyNonMalaysianAdult;
    if (qtyNonMalaysianChild > 0) quantities.NonMalaysianChild = qtyNonMalaysianChild;

    if (Object.keys(quantities).length === 0) {
        alert('Please select at least one type of ticket.');
        return;
    }

    const cartItem = {
        attractionId,
        visitDate,
        quantities,
        totalAmount,
        userId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('carts').add(cartItem);
        alert('Added to cart successfully!');
    } catch (error) {
        console.error("Error adding to cart: ", error);
        alert('Failed to add to cart. Please try again later.');
    }
}


// Example login handling
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('No user logged in.');
    }
});

