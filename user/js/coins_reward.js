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

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userId = user.uid;
            const userEmail = user.email;

            console.log(`Logged in as ${userEmail} with UID: ${userId}`);

            // Load user's coins, vouchers, and redemption history
            loadUserCoins(userId);
            loadVouchers();
            loadRedemptionHistory(userId);
        } else {
            console.error('No user is signed in');
            document.getElementById('userCoins').textContent = 'Please sign in first';
        }
    });
});

// Load user's coin balance
function loadUserCoins(userId) {
    const userRef = db.collection('users').doc(userId);

    userRef.get().then(userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userCoins = userData.coins || 0; // Fallback to 0 if coins are not defined
            document.getElementById('userCoins').textContent = userCoins; // Display user's coin balance
        } else {
            console.error('No such user document!');
            document.getElementById('userCoins').textContent = 'User not found';
        }
    }).catch(error => {
        console.error('Error fetching user coins: ', error);
        document.getElementById('userCoins').textContent = 'Error';
    });
}

// Load available vouchers
function loadVouchers() {
    const voucherCardsContainer = document.getElementById('voucherCards');
    voucherCardsContainer.innerHTML = ''; // Clear previous cards

    db.collection('vouchers').get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const voucher = doc.data();
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-4'; // Card size

            // Use fallback values if properties are missing
            const imageUrl = voucher.voucherImageUrl || 'default_image_url.jpg'; // Fallback image
            const voucherName = voucher.voucherName || 'No Name';
            const costOfCoins = voucher.costOfCoins || 0;
            const stocks = voucher.stocks || 0;
            const termsAndConditions = voucher.termsConditions || 'No terms available.';

            // Create the voucher card
            card.innerHTML = `
                <div class="card">
                    <img src="${imageUrl}" class="card-img-top" alt="${voucherName}">
                    <div class="card-body">
                        <h5 class="card-title">${voucherName}</h5>
                        <p class="card-text">Cost: ${costOfCoins} Coins</p>
                        <p class="card-text">Stock: ${stocks}</p>
                        <button class="btn btn-primary" onclick="redeemVoucher('${doc.id}')">Redeem Voucher</button>
                        <button class="btn btn-link" onclick="showTerms('${termsAndConditions}')">Show Terms & Conditions</button>
                    </div>
                </div>
            `;
            voucherCardsContainer.appendChild(card);
        });
    }).catch(error => {
        console.error('Error fetching vouchers: ', error);
    });
}

// Function to show Terms & Conditions in a modal
function showTerms(terms) {
    const modalContent = document.getElementById('modalContent');
    modalContent.textContent = terms; // Set the terms text
    $('#termsModal').modal('show'); 
}

function loadRedemptionHistory(userId) {
    const redemptionList = document.getElementById('redemptionList').getElementsByTagName('tbody')[0];
    redemptionList.innerHTML = ''; // Clear the table body

    db.collection('redemptions').where('userId', '==', userId).get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const redemption = doc.data();
            const redeemTime = redemption.redeemTime; // Get the redeem time

            // Check if redeemTime is a Firestore Timestamp
            let redeemTimeString;
            if (redeemTime && redeemTime instanceof firebase.firestore.Timestamp) {
                redeemTimeString = redeemTime.toDate().toLocaleString(); // Convert to JS Date
            } else {
                redeemTimeString = 'Invalid Date'; // Handle invalid timestamp case
            }

            const row = redemptionList.insertRow();
            row.innerHTML = `
                <td>${redemption.voucherCode}</td>
                <td>${redemption.voucherName}</td>
                <td>${redeemTimeString}</td>
            `;
        });
    }).catch(error => {
        console.error('Error fetching redemption history: ', error);
    });
}

// Redeem voucher function
function redeemVoucher(voucherId) {
    // Show confirmation dialog before redeeming
    const confirmRedeem = confirm("Are you sure you want to redeem this voucher?");
    if (!confirmRedeem) {
        return; // Exit if the user does not confirm
    }

    const userRef = db.collection('users').doc(firebase.auth().currentUser.uid); // Get current user
    const voucherRef = db.collection('vouchers').doc(voucherId);

    userRef.get().then(userDoc => {
        const userData = userDoc.data();
        const userCoins = userData.coins;

        voucherRef.get().then(voucherDoc => {
            const voucherData = voucherDoc.data();
            const costOfCoins = voucherData.costOfCoins;
            const stocks = voucherData.stocks;

            // Check conditions separately
            if (userCoins < costOfCoins) {
                alert('You do not have enough coins to complete this transaction.');
            } else if (stocks <= 0) {
                alert('The voucher is currently out of stock.'); 
            } else {
                // Deduct coins and update voucher stocks
                const newCoins = userCoins - costOfCoins;
                const newStocks = stocks - 1;
                const voucherCode = generateVoucherCode();

                // Update user coins and voucher stocks in Firestore
                userRef.update({ coins: newCoins });
                voucherRef.update({ stocks: newStocks });

                // Add redemption record
                db.collection('redemptions').add({
                    userId: firebase.auth().currentUser.uid,
                    voucherCode: voucherCode,
                    voucherName: voucherData.voucherName,
                    redeemTime: new Date()
                }).then(() => {
                    // Show success alert with voucher details
                    alert(`Successfully redeemed! Your voucher '${voucherData.voucherName}' redeem code is: ${voucherCode}`);
                    loadRedemptionHistory(firebase.auth().currentUser.uid); // Refresh history
                }).catch(error => {
                    console.error('Error recording redemption: ', error);
                });
            }
        });
    }).catch(error => {
        console.error('Error fetching user data: ', error);
    });
}


// Generate a unique voucher code
function generateVoucherCode() {
    return 'VC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}
