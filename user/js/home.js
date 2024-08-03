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

// Reference to Firestore
const db = firebase.firestore();
const auth = firebase.auth(); // Firebase Authentication

// Function to create the media element
function createMediaElement(images) {
    const fallbackIndex = 1;
    if (images.length === 0) {
        return `<img src="fallback-image-url.jpg" class="card-img-top" alt="Fallback Image">`;
    }
    const primarySrc = images[0];
    const extension = primarySrc.split('.').pop().toLowerCase();
    if (extension === 'mp4') {
        return `
            <video class="card-img-top" controls>
                <source src="${primarySrc}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <img src="${images[fallbackIndex] || 'fallback-image-url.jpg'}" class="card-img-top fallback-image" alt="Fallback Image" style="display:none;">
        `;
    } else {
        return `<img src="${primarySrc}" class="card-img-top" alt="Attraction media">`;
    }
}

// Fetch and display attractions
document.addEventListener('DOMContentLoaded', async () => {
    const attractionsContainer = document.getElementById('attractions-container');
    try {
        const snapshot = await db.collection('attractions').get();
        if (snapshot.empty) {
            console.log("No attractions found.");
            attractionsContainer.innerHTML = "<p>No attractions available.</p>";
            return;
        }

        snapshot.forEach(async doc => {
            const data = doc.data();
            const mediaElement = createMediaElement(data.images);
            const attractionId = doc.id;

            // Create the card HTML
            const cardHTML = `
                <div class="col-md-4 mb-4">
                    <div class="card" data-attraction-id="${attractionId}">
                        <a href="attraction_details.html?id=${attractionId}" class="card-link">
                            ${mediaElement}
                        </a>
                        <div class="card-body">
                            <h5 class="card-title">${data.destinationName}</h5>
                            <p class="card-text">From MYR ${data.ticketPriceMalaysianAdult}</p>
                            <div class="like-dislike">
                                <button class="btn btn-light like-button" data-attraction-id="${attractionId}">
                                    <i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>
                                </button>
                                <button class="btn btn-light dislike-button" data-attraction-id="${attractionId}">
                                    <i class="fas fa-thumbs-down"></i> Dislike <span class="dislike-count">0</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            attractionsContainer.innerHTML += cardHTML;

            // Update like and dislike counts
            await updateLikeDislikeCounts(attractionId);

            // Check current user's reaction and update button styles
            await updateReactionStyles(attractionId);
        });

        // Event listeners for like and dislike buttons
        document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
            button.addEventListener('click', handleLikeDislikeClick);
        });

        // Event delegation for card clicks
        attractionsContainer.addEventListener('click', event => {
            const cardLink = event.target.closest('.card-link');
            if (cardLink) {
                // Navigate to the details page
                window.location.href = cardLink.href;
            }
        });

    } catch (error) {
        console.error("Error fetching attractions: ", error);
        attractionsContainer.innerHTML = "<p>Error loading attractions. Please try again later.</p>";
    }
});

// Handle like and dislike button clicks
async function handleLikeDislikeClick(event) {
    event.stopPropagation(); // Prevent click from navigating to the details page
    const button = event.currentTarget;
    const attractionId = button.getAttribute('data-attraction-id');
    const isLike = button.classList.contains('like-button');
    const userId = auth.currentUser ? auth.currentUser.uid : null;

    if (!userId) {
        alert('You must be logged in to like or dislike attractions.');
        return;
    }

    const userReactionRef = db.collection('user_reactions').doc(`${userId}_${attractionId}`);
    const attractionRef = db.collection('attractions').doc(attractionId);

    try {
        const userReactionDoc = await userReactionRef.get();
        if (userReactionDoc.exists) {
            // User has already reacted; toggle reaction
            const currentReaction = userReactionDoc.data().reaction;
            if (currentReaction === (isLike ? 'like' : 'dislike')) {
                // Remove reaction
                await userReactionRef.delete();
                await updateLikeDislikeCounts(attractionId, isLike, -1);
            } else {
                // Update reaction
                await userReactionRef.update({
                    reaction: isLike ? 'like' : 'dislike'
                });
                await updateLikeDislikeCounts(attractionId, isLike, 1);
                await updateLikeDislikeCounts(attractionId, !isLike, -1);
            }
        } else {
            // Add new reaction
            await userReactionRef.set({
                reaction: isLike ? 'like' : 'dislike',
                attractionId: attractionId // Store attraction ID for reference
            });
            await updateLikeDislikeCounts(attractionId, isLike, 1);
        }

        // Update button styles and counts
        await updateReactionStyles(attractionId);
        await updateLikeDislikeCounts(attractionId);

    } catch (error) {
        console.error("Error handling like/dislike: ", error);
    }
}

// Update like and dislike counts
async function updateLikeDislikeCounts(attractionId, isLike = null, change = 0) {
    const userReactionsRef = db.collection('user_reactions');
    
    try {
        // Calculate total likes or dislikes
        const likeSnapshot = await userReactionsRef.where('reaction', '==', 'like').where('attractionId', '==', attractionId).get();
        const dislikeSnapshot = await userReactionsRef.where('reaction', '==', 'dislike').where('attractionId', '==', attractionId).get();

        const likeCount = likeSnapshot.size;
        const dislikeCount = dislikeSnapshot.size;

        // Update UI
        document.querySelector(`.card[data-attraction-id="${attractionId}"] .like-count`).textContent = likeCount;
        document.querySelector(`.card[data-attraction-id="${attractionId}"] .dislike-count`).textContent = dislikeCount;
    } catch (error) {
        console.error("Error updating like/dislike counts: ", error);
    }
}

// Update the styles of like and dislike buttons based on user's reaction
async function updateReactionStyles(attractionId) {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) return;

    const userReactionRef = db.collection('user_reactions').doc(`${userId}_${attractionId}`);
    
    try {
        const userReactionDoc = await userReactionRef.get();
        const card = document.querySelector(`.card[data-attraction-id="${attractionId}"]`);
        if (userReactionDoc.exists) {
            const reaction = userReactionDoc.data().reaction;
            if (reaction === 'like') {
                card.querySelector('.like-button').classList.add('active');
                card.querySelector('.dislike-button').classList.remove('active');
            } else if (reaction === 'dislike') {
                card.querySelector('.like-button').classList.remove('active');
                card.querySelector('.dislike-button').classList.add('active');
            }
        } else {
            card.querySelector('.like-button').classList.remove('active');
            card.querySelector('.dislike-button').classList.remove('active');
        }
    } catch (error) {
        console.error("Error updating button styles: ", error);
    }
}
