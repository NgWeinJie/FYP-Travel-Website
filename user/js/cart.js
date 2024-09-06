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

// Get current user
async function getCurrentUser() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                resolve(user);
            } else {
                reject('No user logged in');
            }
        });
    });
}

// Fetch cart items for the current user
async function fetchCartItems(userId) {
    try {
        const cartSnapshot = await db.collection('carts').where('userId', '==', userId).get();
        if (cartSnapshot.empty) {
            return [];
        }
        return cartSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching cart items:', error);
        return [];
    }
}

// Update cart item quantities
async function updateCartItem(cartId, updatedQuantities) {
    try {
        const cartRef = db.collection('carts').doc(cartId);
        await cartRef.update({ quantities: updatedQuantities });
        displayCartItems(); // Refresh the cart items display
    } catch (error) {
        console.error('Error updating cart item:', error);
    }
}

// Delete a specific ticket type from the cart
async function deleteTicketType(cartId, type) {
    try {
        const cartRef = db.collection('carts').doc(cartId);
        const doc = await cartRef.get();
        if (doc.exists) {
            const data = doc.data();
            const updatedQuantities = { ...data.quantities };
            delete updatedQuantities[type];

            // Check if all quantities are now 0
            const areAllQuantitiesZero = Object.values(updatedQuantities).every(qty => qty === 0);

            if (areAllQuantitiesZero) {
                // If all quantities are zero, delete the entire cart item
                await cartRef.delete();
            } else {
                // Otherwise, update the cart with remaining tickets
                await cartRef.update({ quantities: updatedQuantities });
            }

            displayCartItems(); // Refresh the cart items display
        }
    } catch (error) {
        console.error('Error deleting ticket type:', error);
    }
}


// Clear all cart items
async function clearCart(userId) {
    if (!userId) {
        console.error('User ID is undefined or null');
        return;
    }
    try {
        const cartSnapshot = await db.collection('carts').where('userId', '==', userId).get();
        const batch = db.batch();
        cartSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        displayCartItems(); // Refresh the cart items display
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
}


// Display cart items
async function displayCartItems() {
    try {
        const user = await getCurrentUser();
        const cartItems = await fetchCartItems(user.uid);
        const cartItemsContainer = document.getElementById('cartItems');
        const subtotalElement = document.getElementById('subtotal');

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
            subtotalElement.textContent = "RM 0.00";
            return;
        }

        let subtotal = 0;
        const promises = cartItems.map(async item => {
            const doc = await db.collection('attractions').doc(item.attractionId).get();
            if (doc.exists) {
                const data = doc.data();
                const ticketPrices = {
                    MalaysianAdult: Number(data.ticketPriceMalaysianAdult) || 0,
                    MalaysianChild: Number(data.ticketPriceMalaysianChild) || 0,
                    NonMalaysianAdult: Number(data.ticketPriceNonMalaysianAdult) || 0,
                    NonMalaysianChild: Number(data.ticketPriceNonMalaysianChild) || 0,
                };

                let ticketHTML = '';
                let itemTotal = 0;

                if (item.quantities.MalaysianAdult > 0) {
                    const quantity = item.quantities.MalaysianAdult;
                    const price = ticketPrices.MalaysianAdult;
                    itemTotal += quantity * price;
                    const quantityInputId = `${item.id}-MalaysianAdult`;
                    ticketHTML += `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                Malaysian Adult
                            </div>
                            <div class="col-md-4">
                                RM ${price.toFixed(2)}
                            </div>
                            <div class="col-md-4 d-flex align-items-center">
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'MalaysianAdult', -1)">-</button>
                                <input type="text" class="form-control form-control-sm mx-2 d-inline qty-input" id="${quantityInputId}" value="${quantity}" readonly>
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'MalaysianAdult', 1)">+</button>
                                <button class="btn btn-danger btn-sm ml-auto" onclick="deleteTicketType('${item.id}', 'MalaysianAdult')">Delete</button>
                            </div>
                        </div>
                    `;
                }

                if (item.quantities.MalaysianChild > 0) {
                    const quantity = item.quantities.MalaysianChild;
                    const price = ticketPrices.MalaysianChild;
                    itemTotal += quantity * price;
                    const quantityInputId = `${item.id}-MalaysianChild`;
                    ticketHTML += `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                Malaysian Child
                            </div>
                            <div class="col-md-4">
                                RM ${price.toFixed(2)}
                            </div>
                            <div class="col-md-4 d-flex align-items-center">
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'MalaysianChild', -1)">-</button>
                                <input type="text" class="form-control form-control-sm mx-2 d-inline qty-input" id="${quantityInputId}" value="${quantity}" readonly>
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'MalaysianChild', 1)">+</button>
                                <button class="btn btn-danger btn-sm ml-auto" onclick="deleteTicketType('${item.id}', 'MalaysianChild')">Delete</button>
                            </div>
                        </div>
                    `;
                }

                if (item.quantities.NonMalaysianAdult > 0) {
                    const quantity = item.quantities.NonMalaysianAdult;
                    const price = ticketPrices.NonMalaysianAdult;
                    itemTotal += quantity * price;
                    const quantityInputId = `${item.id}-NonMalaysianAdult`;
                    ticketHTML += `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                Non-Malaysian Adult
                            </div>
                            <div class="col-md-4">
                                RM ${price.toFixed(2)}
                            </div>
                            <div class="col-md-4 d-flex align-items-center">
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'NonMalaysianAdult', -1)">-</button>
                                <input type="text" class="form-control form-control-sm mx-2 d-inline qty-input" id="${quantityInputId}" value="${quantity}" readonly>
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'NonMalaysianAdult', 1)">+</button>
                                <button class="btn btn-danger btn-sm ml-auto" onclick="deleteTicketType('${item.id}', 'NonMalaysianAdult')">Delete</button>
                            </div>
                        </div>
                    `;
                }

                if (item.quantities.NonMalaysianChild > 0) {
                    const quantity = item.quantities.NonMalaysianChild;
                    const price = ticketPrices.NonMalaysianChild;
                    itemTotal += quantity * price;
                    const quantityInputId = `${item.id}-NonMalaysianChild`;
                    ticketHTML += `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                Non-Malaysian Child
                            </div>
                            <div class="col-md-4">
                                RM ${price.toFixed(2)}
                            </div>
                            <div class="col-md-4 d-flex align-items-center">
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'NonMalaysianChild', -1)">-</button>
                                <input type="text" class="form-control form-control-sm mx-2 d-inline qty-input" id="${quantityInputId}" value="${quantity}" readonly>
                                <button class="btn btn-secondary btn-sm" onclick="changeQuantity('${item.id}', 'NonMalaysianChild', 1)">+</button>
                                <button class="btn btn-danger btn-sm ml-auto" onclick="deleteTicketType('${item.id}', 'NonMalaysianChild')">Delete</button>
                            </div>
                        </div>
                    `;
                }

                subtotal += itemTotal;

                return `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <img src="${data.images[0]}" class="img-fluid" alt="${data.destinationName}">
                                </div>
                                <div class="col-md-9">
                                    <h5 class="card-title">${data.destinationName}</h5>
                                    <p>Date of Visit: ${item.visitDate}</p>
                                    ${ticketHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            return '';
        });

        const html = (await Promise.all(promises)).join('');
        cartItemsContainer.innerHTML = html;
        subtotalElement.textContent = `RM ${subtotal.toFixed(2)} `;
    } catch (error) {
        console.error('Error displaying cart items:', error);
    }
}

// Change ticket quantity in the cart
async function changeQuantity(cartId, type, change) {
    try {
        const cartRef = db.collection('carts').doc(cartId);
        const doc = await cartRef.get();
        if (doc.exists) {
            const data = doc.data();
            const updatedQuantities = { ...data.quantities };
            const currentQuantity = updatedQuantities[type] || 0;
            const newQuantity = Math.max(0, currentQuantity + change);

            if (newQuantity === 0) {
                delete updatedQuantities[type]; // Remove the ticket type if quantity is zero
            } else {
                updatedQuantities[type] = newQuantity; // Update with new quantity
            }

            // Check if all quantities are now 0
            const areAllQuantitiesZero = Object.values(updatedQuantities).every(qty => qty === 0);

            if (areAllQuantitiesZero) {
                // If all quantities are zero, delete the entire cart item
                await cartRef.delete();
            } else {
                // Otherwise, update the cart item with remaining ticket types
                await cartRef.update({ quantities: updatedQuantities });
            }

            displayCartItems(); // Refresh the cart items display
        }
    } catch (error) {
        console.error('Error changing ticket quantity:', error);
    }
}

async function handleClearCart() {
    try {
        const user = await getCurrentUser();
        await clearCart(user.uid);
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
}


// Event listeners for cart page
document.addEventListener('DOMContentLoaded', () => {
    displayCartItems();
});

// Function to apply promo code
async function applyPromoCode() {
    const promoCodeInput = document.getElementById('promoCode').value.trim().toUpperCase();
    const promoMessage = document.getElementById('promoMessage');
    promoMessage.textContent = ''; // Clear previous messages

    if (!promoCodeInput) {
        promoMessage.textContent = 'Please enter a promo code.';
        return;
    }

    try {
        const promoCodeSnapshot = await db.collection('promotions').where('promoCode', '==', promoCodeInput).get();

        if (promoCodeSnapshot.empty) {
            promoMessage.textContent = 'Invalid promo code.';
            return;
        }

        const promoData = promoCodeSnapshot.docs[0].data();
        const now = new Date();
        const startDate = promoData.startDateTime.toDate();
        const endDate = promoData.endDateTime.toDate();
        const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('RM', '').trim());

        if (now < startDate) {
            promoMessage.textContent = 'Promo code is not yet valid.';
            return;
        }
        if (now > endDate) {
            promoMessage.textContent = 'Promo code has expired.';
            return;
        }
        if (subtotal < promoData.minSpend) {
            promoMessage.textContent = `Minimum spend amount is RM ${promoData.minSpend.toFixed(2)}.`;
            return;
        }

        // Apply flat discount
        const discountAmount = promoData.discountAmount || 0;
        const newSubtotal = Math.max(subtotal - discountAmount, 0); // Ensure subtotal doesn't go below 0
        document.getElementById('subtotal').textContent = `RM ${newSubtotal.toFixed(2)}`;
        promoMessage.textContent = `Promo code applied! Discount: RM ${discountAmount.toFixed(2)}`;

        // Store promo code details in sessionStorage for payment page
        sessionStorage.setItem('appliedPromoCode', JSON.stringify({
            code: promoCodeInput,
            discount: discountAmount
        }));

    } catch (error) {
        console.error('Error applying promo code:', error);
        promoMessage.textContent = 'An error occurred. Please try again.';
    }
}




// Example function to fetch promo codes (add to Firebase Firestore)
async function fetchPromotions() {
    try {
        const promoSnapshot = await db.collection('promotions').get();
        const promotions = promoSnapshot.docs.map(doc => doc.data());
        console.log(promotions);
        return promotions;
    } catch (error) {
        console.error('Error fetching promotions:', error);
    }
}

function checkout() {
    window.location.href = 'payment.html';
}