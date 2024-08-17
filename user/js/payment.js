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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await getCurrentUser();
        console.log('User:', user); // Debugging the user

        const cartData = await fetchCartData(user.uid);
        console.log('Cart Data:', cartData); // Debugging cart data

        const userDetails = await fetchUserDetails(user.uid);
        console.log('User Details:', userDetails); // Debugging user details

        displayUserDetails(userDetails);
        displayPaymentDetails(cartData);

    } catch (error) {
        console.error('Error fetching data for payment page:', error);
    }
});

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

// Function to fetch cart data from Firestore
async function fetchCartData(userId) {
    try {
        const cartSnapshot = await db.collection('carts').where('userId', '==', userId).get();
        
        if (cartSnapshot.empty) {
            console.error('No cart found for this user.');
            return null;
        }

        const cartDoc = cartSnapshot.docs[0];
        const cartData = cartDoc.data();
        console.log('Raw Cart Data:', cartData); // Debugging raw cart data

        if (!cartData || !cartData.quantities || Object.keys(cartData.quantities).length === 0) {
            console.error('Cart data is empty or malformed.');
            return null;
        }

        return cartData;

    } catch (error) {
        console.error('Error fetching cart data:', error);
        return null;
    }
}

// Function to fetch user details from Firestore
async function fetchUserDetails(userId) {
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            return userDoc.data();
        } else {
            console.error('No user details found.');
            return {};
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        return {};
    }
}

// Function to display user details in the form
function displayUserDetails(userDetails) {
    document.getElementById('firstName').value = userDetails.firstName || '';
    document.getElementById('lastName').value = userDetails.lastName || '';
    document.getElementById('email').value = userDetails.email || '';
    document.getElementById('contactNumber').value = userDetails.contactNumber || '';
}

// Function to display cart items and calculate total
async function displayPaymentDetails(cartData) {
    const paymentItemsContainer = document.getElementById('paymentItems');
    let total = 0;

    if (!cartData) {
        paymentItemsContainer.innerHTML = '<p>No items in cart.</p>';
        document.getElementById('subtotal').textContent = 'RM 0.00';
        document.getElementById('totalAmount').textContent = 'RM 0.00';
        return;
    }

    const { quantities, attractionId, visitDate, totalAmount } = cartData;
    const attractionDoc = await db.collection('attractions').doc(attractionId).get();

    if (!attractionDoc.exists) {
        paymentItemsContainer.innerHTML = '<p>Attraction not found.</p>';
        document.getElementById('subtotal').textContent = 'RM 0.00';
        document.getElementById('totalAmount').textContent = 'RM 0.00';
        return;
    }

    const attractionData = attractionDoc.data();
    const itemsHTML = Object.keys(quantities).map(type => {
        const quantity = quantities[type];
        if (quantity > 0) {
            const price = getPriceForType(attractionData, type);
            const itemTotal = price * quantity;
            total += itemTotal;

            return `
                <div class="cart-item">
                    <h5>${attractionData.destinationName} - ${formatType(type)}</h5>
                    <p>Quantity: ${quantity}</p>
                    <p>Price: RM ${price.toFixed(2)}</p>
                    <p>Subtotal: RM ${itemTotal.toFixed(2)}</p>
                    <p>Date of Visit: ${visitDate}</p>
                </div>
            `;
        }
        return '';
    }).join('');

    paymentItemsContainer.innerHTML = itemsHTML;
    document.getElementById('subtotal').textContent = `RM ${total.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `RM ${total.toFixed(2)}`;
}

// Function to get the price for a specific ticket type
function getPriceForType(attractionData, type) {
    switch (type) {
        case 'MalaysianAdult':
            return attractionData.ticketPriceMalaysianAdult || 0;
        case 'MalaysianChild':
            return attractionData.ticketPriceMalaysianChild || 0;
        case 'NonMalaysianAdult':
            return attractionData.ticketPriceNonMalaysianAdult || 0;
        case 'NonMalaysianChild':
            return attractionData.ticketPriceNonMalaysianChild || 0;
        default:
            return 0;
    }
}

// Function to format the ticket type for display
function formatType(type) {
    switch (type) {
        case 'MalaysianAdult':
            return 'Malaysian Adult';
        case 'MalaysianChild':
            return 'Malaysian Child';
        case 'NonMalaysianAdult':
            return 'Non-Malaysian Adult';
        case 'NonMalaysianChild':
            return 'Non-Malaysian Child';
        default:
            return type;
    }
}

// Handle form submission
document.getElementById('userDetailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = await getCurrentUser();
    const updatedDetails = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        contactNumber: document.getElementById('contactNumber').value,
    };

    try {
        await db.collection('users').doc(user.uid).update(updatedDetails);
        alert('Details updated. Proceeding to payment gateway...');
        // Redirect to payment gateway or next step
    } catch (error) {
        console.error('Error updating user details:', error);
        alert('Failed to update details. Please try again.');
    }
});

// Function to make payment (this is a placeholder, you'll need to implement actual payment logic)
function makePayment() {
    alert('Payment process started!');
    // Implement your payment processing logic here.
}
