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
const storage = firebase.storage();  // Initialize Firebase Storage

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

function createMediaElementFromUrls(urls) {
    return urls.map(url => `
        <div class="media-item" style="padding-bottom: 15px;">
            ${url.endsWith('.mp4') ? `<video controls src="${url}" class="video-fluid" style="width: 300px; height: 200px;"></video>` : `<img src="${url}" class="img-fluid" style="width: 300px; height: 200px;" alt="Media Image">`}
        </div>
    `).join('');
}

function createReviewElement(review) {
    const date = review.timestamp.toDate();  // Convert Firestore Timestamp to JS Date
    return `
        <div class="media mb-3">
            <img src="../image/avatar.jpg" class="mr-3 rounded-circle avatar" alt="User Avatar">
            <div class="media-body">
                <h5 class="mt-0">${review.userName} <small class="text-muted">${date.toLocaleString()}</small></h5>
                <p>${review.comment}</p>
                ${createMediaElementFromUrls(review.mediaUrls || [])}
                <button class="btn btn-sm btn-link reply-button" data-review-id="${review.id}">Reply</button>
                <div class="replies ml-4">
                    ${review.replies.map(reply => createReplyElement(reply)).join('')}
                </div>
            </div>
        </div>
    `;
}

function createReplyElement(reply) {
    const date = reply.timestamp.toDate();  // Convert Firestore Timestamp to JS Date
    return `
        <div class="media mt-3">
            <img src="../image/avatar.jpg" class="mr-3 rounded-circle avatar" alt="User Avatar">
            <div class="media-body">
                <h6 class="mt-0">${reply.userName} <small class="text-muted">${date.toLocaleString()}</small></h6>
                <p>${reply.comment}</p>
            </div>
        </div>
    `;
}

async function fetchReviews(attractionId) {
    const reviewsSnapshot = await db.collection('reviews').where('attractionId', '==', attractionId).orderBy('timestamp', 'desc').get();
    const reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const reviewsHTML = reviews.map(review => createReviewElement(review)).join('');
    document.getElementById('reviews').innerHTML = reviewsHTML;
}

async function addReview() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to publish a review.');
        return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        alert('User information not found.');
        return;
    }

    const { firstName, lastName } = userDoc.data();

    const attractionId = new URLSearchParams(window.location.search).get('id');
    const comment = document.getElementById('reviewComment').value;
    if (!comment) {
        alert('Please enter a comment.');
        return;
    }

    // Handle file upload
    const files = document.getElementById('reviewFiles').files;
    const mediaUrls = [];
    for (const file of files) {
        const fileRef = storage.ref().child(`reviews/${Date.now()}_${file.name}`);
        await fileRef.put(file);
        const url = await fileRef.getDownloadURL();
        mediaUrls.push(url);
    }

    const review = {
        attractionId,
        userName: `${firstName} ${lastName}`,
        comment,
        timestamp: firebase.firestore.Timestamp.now(),  // Use Firestore Timestamp
        mediaUrls,  // Store media URLs
        replies: []
    };

    try {
        await db.collection('reviews').add(review);
        document.getElementById('reviewComment').value = '';
        document.getElementById('reviewFiles').value = ''; // Clear file input
        fetchReviews(attractionId);
    } catch (error) {
        console.error("Error adding review: ", error);
        alert('Failed to publish review. Please try again later.');
    }
}

async function addReply(reviewId, comment) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to reply to a comment.');
        return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        alert('User information not found.');
        return;
    }

    const { firstName, lastName } = userDoc.data();

    const reply = {
        userName: `${firstName} ${lastName}`,
        comment,
        timestamp: firebase.firestore.Timestamp.now()  // Use Firestore Timestamp
    };

    try {
        const reviewRef = db.collection('reviews').doc(reviewId);
        await reviewRef.update({
            replies: firebase.firestore.FieldValue.arrayUnion(reply)
        });
        fetchReviews(new URLSearchParams(window.location.search).get('id'));
    } catch (error) {
        console.error("Error adding reply: ", error);
        alert('Failed to reply to comment. Please try again later.');
    }
}

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
            <div class="card mb-3">
                <div class="card-header text-white" style="background-color: #FFAA33;">Description</div>
                <div class="card-body">
                    <p id="attractionDescription">${data.description}</p>
                </div>
            </div>
            <div class="card mb-3">
                <div class="card-header text-white" style="background-color: #FFAA33;">Operating Hours</div>
                <div class="card-body">
                    <p id="operatingHours">${data.operatingHours}</p>
                </div>
            </div>
            <div class="card mb-3">
                <div class="card-header text-white" style="background-color: #FFAA33;">Reviews</div>
                <div class="card-body">
                    <div class="form-group mt-4">
                        <textarea class="form-control" id="reviewComment" rows="3" placeholder="Share your experience..."></textarea>
                        <input type="file" id="reviewFiles" multiple>
                        <button class="btn btn-primary mt-2" onclick="addReview()" style="background-color: #FFAA33; border-color: #FFAA33;">Publish Review</button>
                    </div>
                    <div id="reviews">
                    </div>
                </div>
            </div>
            <div class="card mb-3">
                <div class="card-header text-white" style="background-color: #FFAA33;">Location</div>
                <div class="card-body">
                    ${data.googleMapLink}
                </div>
            </div>
        `;
        document.getElementById('attraction-details').innerHTML = detailsHTML;

        fetchReviews(attractionId);

        // Date restriction logic
        const visitDateInput = document.getElementById('visitDate');
        const today = new Date();
        const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());

        // Format dates to YYYY-MM-DD
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        visitDateInput.setAttribute('min', formatDate(today));
        visitDateInput.setAttribute('max', formatDate(threeMonthsLater));

        document.getElementById('visitDate').addEventListener('change', calculateTotal);
        document.querySelectorAll('#ticketing .form-control').forEach(el => {
            el.addEventListener('change', calculateTotal);
        });

        document.getElementById('attraction-details').addEventListener('click', event => {
            if (event.target.classList.contains('reply-button')) {
                const reviewId = event.target.dataset.reviewId;
                const replyComment = prompt('Enter your reply:');
                if (replyComment) {
                    addReply(reviewId, replyComment);
                }
            }
        });
    } catch (error) {
        console.error("Error fetching attraction details: ", error);
        document.getElementById('attraction-details').innerHTML = "<p class='text-danger'>Error loading details. Please try again later.</p>";
    }
});

function adjustQuantity(type, delta) {
    const qtyInput = document.getElementById(`qty${type}`);
    let currentValue = parseInt(qtyInput.value) || 0;
    currentValue += delta;
    if (currentValue < 0) currentValue = 0;
    qtyInput.value = currentValue;
    calculateTotal();
}

async function addToCart() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to add items to your cart.');
        return;
    }

    const attractionId = new URLSearchParams(window.location.search).get('id');
    const visitDate = document.getElementById('visitDate').value;

    if (!visitDate) {
        alert('Please select a date for your visit.');
        return;
    }

    const qtyMalaysianAdult = parseInt(document.getElementById('qtyMalaysianAdult').value) || 0;
    const qtyMalaysianChild = parseInt(document.getElementById('qtyMalaysianChild').value) || 0;
    const qtyNonMalaysianAdult = parseInt(document.getElementById('qtyNonMalaysianAdult').value) || 0;
    const qtyNonMalaysianChild = parseInt(document.getElementById('qtyNonMalaysianChild').value) || 0;
    const totalQuantity = qtyMalaysianAdult + qtyMalaysianChild + qtyNonMalaysianAdult + qtyNonMalaysianChild;

    // Check if the total quantity is greater than 0
    if (totalQuantity === 0) {
        alert('Please select at least one ticket.');
        return;
    }

    const totalAmount = parseFloat(document.getElementById('totalAmount').innerText.replace('Total: ', '').replace(' MYR', ''));

    const cartItem = {
        attractionId,
        visitDate,
        quantities: {
            MalaysianAdult: qtyMalaysianAdult,
            MalaysianChild: qtyMalaysianChild,
            NonMalaysianAdult: qtyNonMalaysianAdult,
            NonMalaysianChild: qtyNonMalaysianChild
        },
        totalAmount,
        userId: user.uid,
        timestamp: firebase.firestore.Timestamp.now()  // Use Firestore Timestamp
    };

    try {
        await db.collection('carts').add(cartItem);
        alert('Added to cart successfully!');
    } catch (error) {
        console.error("Error adding to cart: ", error);
        alert('Failed to add to cart. Please try again later.');
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('No user logged in.');
    }
});
