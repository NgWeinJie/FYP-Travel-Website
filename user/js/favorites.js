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

document.addEventListener('DOMContentLoaded', () => {
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

    // Fetch and display favorite attractions
    async function fetchFavoriteAttractions() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            alert('You must be logged in to view your favorites.');
            return;
        }

        const favoritesContainer = document.getElementById('favorites');

        try {
            const userFavoritesSnapshot = await db.collection('user_favorites').where('userId', '==', userId).get();

            if (userFavoritesSnapshot.empty) {
                console.log('No favorite attractions found.');
                favoritesContainer.innerHTML = "<p>No favorites available.</p>";
                return;
            }

            let htmlContent = '';
            for (const doc of userFavoritesSnapshot.docs) {
                const favoriteAttractionId = doc.data().attractionId;
                const attractionDoc = await db.collection('attractions').doc(favoriteAttractionId).get();
                const data = attractionDoc.data();
                const mediaElement = createMediaElement(data.images);

                const cardHTML = `
                    <div class="col-md-4 mb-4">
                        <div class="card" data-attraction-id="${favoriteAttractionId}">
                            <a href="attraction_details.html?id=${favoriteAttractionId}" class="card-link">
                                ${mediaElement}
                            </a>
                            <div class="card-body">
                                <h5 class="card-title">${data.destinationName}</h5>
                                <p class="card-text">From MYR ${data.ticketPriceMalaysianAdult}</p>
                                <div class="like-dislike">
                                    <button class="btn btn-light favorite-button active" data-attraction-id="${favoriteAttractionId}">
                                        <i class="fas fa-heart favorite-icon"></i> Remove from Favorites
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                htmlContent += cardHTML;
            }

            favoritesContainer.innerHTML = htmlContent;

            // Event listener for removing favorite
            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });

        } catch (error) {
            console.error('Error fetching favorite attractions: ', error);
            favoritesContainer.innerHTML = "<p>Error loading favorites. Please try again later.</p>";
        }
    }

    // Handle favorite button click to remove favorite
    async function handleFavoriteClick(event) {
        event.stopPropagation(); // Prevent click from navigating to the details page
        const button = event.currentTarget;
        const attractionId = button.getAttribute('data-attraction-id');
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (!userId) {
            alert('You must be logged in to remove from favorites.');
            return;
        }

        const favoriteRef = db.collection('user_favorites').doc(`${userId}_${attractionId}`);

        try {
            await favoriteRef.delete();
            button.closest('.card').remove();
            console.log(`Attraction ${attractionId} removed from favorites.`);
        } catch (error) {
            console.error('Error removing favorite: ', error);
        }
    }

    // Fetch favorites on page load
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchFavoriteAttractions();
        } else {
            console.log('No user is signed in.');
        }
    });
});
