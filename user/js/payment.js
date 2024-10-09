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
const storage = firebase.storage();

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
    document.getElementById('subtotal').dataset.originalSubtotal = subtotal.toFixed(2);
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

    const coinsDiscount = redeemSwitch.checked ? Math.min(userCoins * 0.01, subtotal) : 0;
    const finalTotal = subtotal - promoDiscount - coinsDiscount;
    document.getElementById('totalAmount').textContent = `RM ${finalTotal.toFixed(2)}`;

    const coinsEarned = Math.floor(finalTotal);
    const newCoinsBalance = (userCoins - Math.floor(coinsDiscount / 0.01)) + coinsEarned;
}

// Function to generate a QR code
function generateQRCode(text) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(text, { errorCorrectionLevel: 'H' }, (err, url) => {
            if (err) reject(err);
            resolve(url);
        });
    });
}

// Function to fetch image as Base64 from Firebase Storage
async function getImageAsBase64FromFirebase(path) {
    try {
        const logoRef = storage.ref().child(path);
        const url = await logoRef.getDownloadURL();
        const response = await fetch(url, { mode: 'cors' }); // Ensure CORS mode is enabled
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image from Firebase:', error);
        throw error;
    }
}

// Function to generate a single PDF with multiple pages for different tickets
async function generateTicketsPDF(user, items) {
    try {
        const { jsPDF } = window.jspdf; // Ensure jsPDF is loaded from the library

        const doc = new jsPDF(); // Create a new jsPDF instance

        // Function to center text
        const centerText = (text, y, fontSize) => {
            doc.setFontSize(fontSize);
            const width = doc.internal.pageSize.width;
            const textWidth = doc.getTextWidth(text);
            doc.text(text, (width - textWidth) / 2, y);
        };

        // Function to center QR code
        const centerQRCode = (qrCodeURL, y) => {
            const width = doc.internal.pageSize.width;
            doc.addImage(qrCodeURL, 'JPEG', (width - 50) / 2, y, 50, 50); // Center QR code horizontally
        };

        // Add content for each ticket
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const qrCodeData = `Attraction: ${item.attractionName}, Type: ${item.ticketType}, Date: ${item.visitDate}`;
            const qrCodeURL = await generateQRCode(qrCodeData);

            if (i > 0) {
                doc.addPage(); // Add a new page for each ticket after the first
            }

            doc.setTextColor("#FFAA33"); // Set text color
            centerText('FlyOne Travel Explorer', 20, 24); // Larger and bold text

            doc.setTextColor("#000000"); // Reset text color to black
            centerText('Thank you for your purchase!', 30, 16); // Regular text

            // Add attraction details
            centerText(`Attraction: ${item.attractionName}`, 50, 16, 'normal');
            centerText(`Type: ${item.ticketType}`, 60, 16, 'normal');
            centerText(`Date of Visit: ${item.visitDate}`, 70, 16, 'normal');
            centerText('Show this QR code at the entrance:', 80, 16, 'normal');

            // Add QR code image to the PDF
            centerQRCode(qrCodeURL, 90); // Center QR code at y = 90
        }

        // Return the PDF as a data URI before saving it
        const pdfData = doc.output('datauristring'); // Get PDF data as data URI

        // Save the PDF after all pages are added
        const fileName = `Tickets_${user.uid}.pdf`;
        doc.save(fileName); // Optional, if you want to save the PDF locally as well

        return pdfData; // Return the PDF data URI

    } catch (error) {
        console.error('Error generating ticket PDF:', error);
        throw error; // Optionally rethrow the error for further handling
    }
}


// Function to send order summary email
async function sendOrderSummaryEmail(email, totalAmount, pdfData, orderItems) {
    try {
        const response = await fetch('http://localhost:3000/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, totalAmount, pdfData, orderItems }),
        });

        if (!response.ok) {
            throw new Error(`Error sending email: ${response.statusText}`);
        }

        console.log('Order summary email sent successfully.');
    } catch (error) {
        console.error('Error sending order summary email:', error);
    }
}




async function processPayment() {
    try {
        const user = await getCurrentUser();
        const totalAmountElement = document.getElementById('totalAmount');
        const redeemSwitch = document.getElementById('redeemCoinsSwitch');
        const userCoins = Number(document.getElementById('redeemCoinsInfo').textContent.replace(/\D/g, '')) || 0;
        const coinsDiscount = redeemSwitch.checked ? Math.min(userCoins * 0.01, parseFloat(totalAmountElement.textContent.replace('RM', '').trim())) : 0;
        const finalTotal = parseFloat(totalAmountElement.textContent.replace('RM', '').trim());

        const orderData = {
            userId: user.uid,
            totalAmount: parseFloat(document.getElementById('subtotal').dataset.originalSubtotal),
            finalAmount: finalTotal,
            promoCode: document.getElementById('appliedPromo').textContent,
            promoDiscount: parseFloat(document.getElementById('discountAmount').textContent.replace('RM', '').trim()) || 0,
            coinsDiscount: coinsDiscount,
            items: [],
            userDetails: await fetchUserDetails(user.uid),
            orderDate: new Date(),
        };

        const cartDataArray = await fetchCartData(user.uid);
        let itemsForPDF = []; // Collect all items for PDF generation

        for (let cartData of cartDataArray) {
            const attractionDoc = await db.collection('attractions').doc(cartData.attractionId).get();
            if (attractionDoc.exists) {
                const attractionData = attractionDoc.data();
                for (let type of Object.keys(cartData.quantities)) {
                    if (cartData.quantities[type] > 0) {
                        const price = getPriceForType(attractionData, type);
                        const item = {
                            attractionId: cartData.attractionId,
                            attractionName: attractionData.destinationName,
                            ticketType: formatType(type),
                            quantity: cartData.quantities[type],
                            price: price,
                            visitDate: cartData.visitDate,
                        };
                        orderData.items.push(item);

                        // Collect items for generating a single PDF
                        itemsForPDF.push(item);
                    }
                }
            } else {
                console.error(`Attraction ID ${cartData.attractionId} not found.`);
            }
        }

        // Add the order to Firestore and get the order ID
        const orderRef = await db.collection('orders').add(orderData);
        const orderId = orderRef.id; // Fetch the newly created order ID

        // Update user coins
        const newCoinBalance = redeemSwitch.checked
            ? (userCoins - Math.floor(coinsDiscount / 0.01)) + Math.floor(finalTotal)
            : userCoins + Math.floor(finalTotal);

        await db.collection('users').doc(user.uid).update({ coins: newCoinBalance });

        // Clear the cart
        const cartSnapshot = await db.collection('carts').where('userId', '==', user.uid).get();
        const batch = db.batch();
        cartSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        sessionStorage.removeItem('appliedPromoCode');

        // Generate a single PDF with all tickets on separate pages
        const pdfData = await generateTicketsPDF(user, itemsForPDF);

        const base64PDF = pdfData.split(',')[1]; // Get only the base64 part
        await sendOrderSummaryEmail(user.email, finalTotal, base64PDF, orderData.items); // Send the base64 PDF

        alert('Payment and Ticket Generation Successful!');
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Payment failed, please try again.');
    }
}




// Function to process DuitNow QR Payment
function processDuitnowPayment() {
    alert("DuitNow payment has been processed successfully!");
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

    userCoins = Number.isFinite(userCoins) ? userCoins : 0;

    redeemCoinsInfo.innerHTML = `Redeem FlyOne Coins: ${userCoins} <i class="fas fa-coins"></i>`;

    if (userCoins > 0) {
        redeemSwitch.disabled = false;
        redeemSwitch.checked = false;
    } else {
        redeemSwitch.disabled = true;
        redeemSwitch.checked = false;
    }

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