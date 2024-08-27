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
        console.log('User:', user);

        const cartData = await fetchCartData(user.uid);
        console.log('Cart Data:', cartData);

        const userDetails = await fetchUserDetails(user.uid);
        console.log('User Details:', userDetails);

        displayUserDetails(userDetails);
        displayPaymentDetails(cartData);

        // Retrieve promo code details from sessionStorage
        const promoCodeDetails = JSON.parse(sessionStorage.getItem('appliedPromoCode'));

        if (promoCodeDetails) {
            // Display promo code and discount if present
            document.getElementById('promoCodeSection').style.display = 'block';
            document.getElementById('discountSection').style.display = 'block';
            document.getElementById('appliedPromo').textContent = promoCodeDetails.code;
            document.getElementById('discountAmount').textContent = `RM ${promoCodeDetails.discount.toFixed(2)}`;
        } else {
            // Hide promo code and discount sections if no promo code is applied
            clearPromoCode();
        }

        // Setup Redeem Coins Functionality
        setupRedeemCoins(userDetails.coins);

        // Update total amount to reflect any promo code or coins applied
        updateTotalAmount();

        // Ensure the total amount is updated whenever the redeem switch changes
        document.getElementById('redeemCoinsSwitch').addEventListener('change', updateTotalAmount);

    } catch (error) {
        console.error('Error fetching data for payment page:', error);
    }
});

// Function to clear any previously applied promo code
function clearPromoCode() {
    const promoCodeElement = document.getElementById('promoCodeSection');
    const discountElement = document.getElementById('discountSection');

    promoCodeElement.style.display = 'none';
    discountElement.style.display = 'none';
    sessionStorage.removeItem('appliedPromoCode');  // Clear the promo code from sessionStorage
}

// Function to apply promo code (example for illustration, modify as needed)
function applyPromoCode(promoCode) {
    // Assuming the promo code is applied and a discount is calculated
    const discountAmount = 20; // Example discount

    if (promoCode) {
        // Show the promo code and discount sections
        const promoCodeElement = document.getElementById('promoCodeSection');
        const discountElement = document.getElementById('discountSection');

        promoCodeElement.style.display = 'block';
        discountElement.style.display = 'block';

        document.getElementById('appliedPromo').textContent = promoCode;
        document.getElementById('discountAmount').textContent = `RM ${discountAmount.toFixed(2)}`;
    }
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

// Function to fetch cart data from Firestore
async function fetchCartData(userId) {
    try {
        const cartSnapshot = await db.collection('carts').where('userId', '==', userId).get();
        const cartDataArray = [];

        if (cartSnapshot.empty) {
            console.error('No cart found for this user.');
            return [];
        }

        cartSnapshot.forEach(doc => {
            const cartData = doc.data();
            cartDataArray.push(cartData);
        });

        return cartDataArray;

    } catch (error) {
        console.error('Error fetching cart data:', error);
        return [];
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

// Function to display cart items and calculate total
async function displayPaymentDetails(cartDataArray) {
    const paymentItemsContainer = document.getElementById('paymentItems');
    let subtotal = 0;

    if (cartDataArray.length === 0) {
        paymentItemsContainer.innerHTML = '<p>No items in cart.</p>';
        document.getElementById('subtotal').textContent = 'RM 0.00';
        document.getElementById('totalAmount').textContent = 'RM 0.00';
        return;
    }

    const itemsHTML = await Promise.all(cartDataArray.map(async (cartData) => {
        const { quantities, attractionId, visitDate } = cartData;
        const attractionDoc = await db.collection('attractions').doc(attractionId).get();

        if (!attractionDoc.exists) {
            return '<p>Attraction not found.</p>';
        }

        const attractionData = attractionDoc.data();
        let imageDisplayed = false;

        return Object.keys(quantities).map(type => {
            const quantity = quantities[type];
            if (quantity > 0) {
                let price = getPriceForType(attractionData, type);
                price = price ? price : 0;
                const itemTotal = price * quantity;
                subtotal += itemTotal;

                const imageHTML = !imageDisplayed ? `
                    <div class="col-md-3">
                        <img src="${attractionData.images[0]}" class="img-fluid" alt="${attractionData.destinationName}">
                    </div>` : '<div class="col-md-3"></div>';

                imageDisplayed = true;

                return `
                    <div class="cart-item">
                        <div class="row">
                            ${imageHTML}
                            <div class="col-md-9">
                                <h5>${attractionData.destinationName} - ${formatType(type)}</h5>
                                <p>Quantity: ${quantity}</p>
                                <p>Price: RM ${price.toFixed(2)}</p>
                                <p>Subtotal: RM ${itemTotal.toFixed(2)}</p>
                                <p>Date of Visit: ${visitDate}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');
    }));

    paymentItemsContainer.innerHTML = itemsHTML.join('');
    document.getElementById('subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    // Update the dataset for original subtotal (without discounts)
    document.getElementById('subtotal').dataset.originalSubtotal = subtotal.toFixed(2);

    // Update total amount right after displaying payment details
    updateTotalAmount();
}

// Function to get the price for a specific ticket type
function getPriceForType(attractionData, type) {
    switch (type) {
        case 'MalaysianAdult':
            return parseFloat(attractionData.ticketPriceMalaysianAdult) || 0;
        case 'MalaysianChild':
            return parseFloat(attractionData.ticketPriceMalaysianChild) || 0;
        case 'NonMalaysianAdult':
            return parseFloat(attractionData.ticketPriceNonMalaysianAdult) || 0;
        case 'NonMalaysianChild':
            return parseFloat(attractionData.ticketPriceNonMalaysianChild) || 0;
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

// Function to ensure the total amount is correctly displayed after discounts
function updateTotalAmount() {
    const subtotal = parseFloat(document.getElementById('subtotal').dataset.originalSubtotal || '0');
    const promoDiscount = parseFloat(document.getElementById('discountAmount').textContent.replace('RM', '').trim()) || 0;
    const redeemSwitch = document.getElementById('redeemCoinsSwitch');
    const userCoins = parseFloat(document.getElementById('redeemCoinsInfo').textContent.replace(/\D/g, '')) || 0;

    // Calculate the coins discount (1 coin = RM 0.01)
    const coinsDiscount = redeemSwitch.checked ? Math.min(userCoins * 0.01, subtotal) : 0;

    // Calculate the final total amount after applying the promo and coin discounts
    const finalTotal = subtotal - promoDiscount - coinsDiscount;
    document.getElementById('totalAmount').textContent = `RM ${finalTotal.toFixed(2)}`;

    // Calculate the coins earned based on the final total (RM 0.01 per coin)
    const coinsEarned = Math.floor(finalTotal);

    // Calculate the new coin balance:
    // New balance = (Current coins - Redeemed coins) + Earned coins
    const newCoinsBalance = (userCoins - Math.floor(coinsDiscount / 0.01)) + coinsEarned;

}

// Function to handle payment and process the order
async function processPayment() {
    try {
        const user = await getCurrentUser();
        const totalAmountElement = document.getElementById('totalAmount');
        const redeemSwitch = document.getElementById('redeemCoinsSwitch');
        const userCoins = Number(document.getElementById('redeemCoinsInfo').textContent.replace(/\D/g, '')) || 0;
        const coinsDiscount = redeemSwitch.checked ? Math.min(userCoins * 0.01, parseFloat(totalAmountElement.textContent.replace('RM', '').trim())) : 0;
        const finalTotal = parseFloat(totalAmountElement.textContent.replace('RM', '').trim());

        // Prepare order data
        const orderData = {
            userId: user.uid,
            totalAmount: parseFloat(document.getElementById('subtotal').dataset.originalSubtotal),  // Store subtotal before discounts
            finalAmount: finalTotal, // Store final total after discounts
            promoCode: document.getElementById('appliedPromo').textContent,
            promoDiscount: parseFloat(document.getElementById('discountAmount').textContent.replace('RM', '').trim()) || 0,
            coinsDiscount: coinsDiscount, // Correctly storing the coins discount value
            items: [], // Will fill in below
            userDetails: await fetchUserDetails(user.uid),
            orderDate: new Date(),
        };

        // Fetch and format cart data
        const cartDataArray = await fetchCartData(user.uid);
        for (let cartData of cartDataArray) {
            const attractionDoc = await db.collection('attractions').doc(cartData.attractionId).get();
            if (attractionDoc.exists) {
                const attractionData = attractionDoc.data();
                Object.keys(cartData.quantities).forEach(type => {
                    if (cartData.quantities[type] > 0) {
                        const price = getPriceForType(attractionData, type);
                        orderData.items.push({
                            attractionId: cartData.attractionId,
                            attractionName: attractionData.destinationName,
                            ticketType: formatType(type),
                            quantity: cartData.quantities[type],
                            price: price,
                            visitDate: cartData.visitDate,
                        });
                    }
                });
            } else {
                console.error(`Attraction ID ${cartData.attractionId} not found.`);
            }
        }

        // Store the order in Firestore
        await db.collection('orders').add(orderData);

        // Calculate new coins balance
        const newCoinBalance = redeemSwitch.checked
            ? (userCoins - Math.floor(coinsDiscount / 0.01)) + Math.floor(finalTotal)
            : userCoins + Math.floor(finalTotal);

        // Update user coin balance in Firestore
        await db.collection('users').doc(user.uid).update({
            coins: newCoinBalance
        });

        // Clear cart items after successful order
        const cartSnapshot = await db.collection('carts').where('userId', '==', user.uid).get();
        const batch = db.batch();
        cartSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Clear sessionStorage after payment
        sessionStorage.removeItem('appliedPromoCode');

        alert('Payment Successful!');
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Payment failed, please try again.');
    }
}

// Function to process DuitNow QR Payment
function processDuitnowPayment() {
    // Simulate the payment process
    alert("DuitNow payment has been processed successfully!");

    // After payment processing, finalize the order
    processPayment();
}

// Function to validate card details
function validateCardDetails() {
    const cardNumber = document.getElementById('cardNumber').value;
    const cvc = document.getElementById('cardCvc').value;
    const expiryDate = document.getElementById('cardExpiry').value;

    let isValid = true;

    if (!validateCardNumber(cardNumber)) {
        document.getElementById('cardNumberError').textContent = "Invalid card number.";
        isValid = false;
    } else {
        document.getElementById('cardNumberError').textContent = "";
    }

    if (!validateCVC(cvc)) {
        document.getElementById('cardCvcError').textContent = "Invalid CVC.";
        isValid = false;
    } else {
        document.getElementById('cardCvcError').textContent = "";
    }

    if (!validateExpiryDate(expiryDate)) {
        document.getElementById('cardExpiryError').textContent = "Invalid expiry date.";
        isValid = false;
    } else {
        document.getElementById('cardExpiryError').textContent = "";
    }

    return isValid;
}

function validateCardNumber(cardNumber) {
    const regex = /^\d{16}$/;
    return regex.test(cardNumber);
}

function validateCVC(cvc) {
    const regex = /^\d{3,4}$/;
    return regex.test(cvc);
}

function validateExpiryDate(expiryDate) {
    const regex = /^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/;
    if (!regex.test(expiryDate)) return false;

    const [month, year] = expiryDate.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (parseInt(year, 10) < currentYear || (parseInt(year, 10) === currentYear && parseInt(month, 10) < currentMonth)) {
        return false;
    }

    return true;
}

// Function to validate and process the payment
function validateAndProcessPayment() {
    if (validateCardDetails()) {
        showLoadingSpinner();
        processPayment().then(() => {
            hideLoadingSpinner();
        }).catch(error => {
            hideLoadingSpinner();
            console.error('Error processing payment:', error);
            alert('Payment failed, please try again.');
        });
    }
}

// Show a loading spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = `
        <div class="spinner-overlay">
            <div class="spinner"></div>
            <p>Processing your payment...</p>
        </div>`;
    document.body.appendChild(spinner);
}

// Hide the loading spinner
function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Setup redeem coins functionality
function setupRedeemCoins(userCoins) {
    const redeemSwitch = document.getElementById('redeemCoinsSwitch');
    const redeemCoinsInfo = document.getElementById('redeemCoinsInfo');

    // Ensure userCoins is a valid number, default to 0 if not
    userCoins = Number.isFinite(userCoins) ? userCoins : 0;

    redeemCoinsInfo.innerHTML = `Redeem FlyOne Coins: ${userCoins} <i class="fas fa-coins"></i>`;

    if (userCoins > 0) {
        redeemSwitch.disabled = false;
        redeemSwitch.checked = false;
    } else {
        redeemSwitch.disabled = true;
        redeemSwitch.checked = false;
    }

    // Update total amount when the redeem switch is changed
    redeemSwitch.addEventListener('change', updateTotalAmount);
}

// Function to display user details on the payment page
function displayUserDetails(userDetails) {
    if (!userDetails) {
        console.error('No user details provided.');
        return;
    }

    document.getElementById('firstName').value = userDetails.firstName || '';
    document.getElementById('lastName').value = userDetails.lastName || '';
    document.getElementById('email').value = userDetails.email || '';
    document.getElementById('contactNumber').value = userDetails.contactNumber || '';
}

// Show the appropriate payment modal
function showPaymentModal() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const totalAmount = document.getElementById('totalAmount').textContent;

    if (paymentMethod === 'creditCard') {
        document.getElementById('creditCardTotalAmount').textContent = totalAmount;
        $('#creditCardModal').modal('show');
    } else if (paymentMethod === 'duitnow') {
        document.getElementById('duitnowTotalAmount').textContent = totalAmount;
        $('#duitnowModal').modal('show');
    }
}

