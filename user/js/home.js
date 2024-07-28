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

// Function to create the media element
function createMediaElement(images) {
    console.log("Media URLs:", images); // Log the URLs to debug

    // Fallback image index
    const fallbackIndex = 1;

    // Ensure there's at least one image
    if (images.length === 0) {
        return `<img src="fallback-image-url.jpg" class="card-img-top" alt="Fallback Image">`;
    }

    const primarySrc = images[0];
    const extension = primarySrc.split('.').pop().toLowerCase();

    // Create the media element based on the type
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

// Function to handle media fallbacks
function handleMediaFallbacks() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.addEventListener('error', () => {
            const fallbackImage = video.nextElementSibling;
            if (fallbackImage) {
                video.style.display = 'none';
                fallbackImage.style.display = 'block';
            }
        });
    });
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

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log("Attraction data:", data); // Log data to debug

            const mediaElement = createMediaElement(data.images);

            const cardHTML = `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        ${mediaElement}
                        <div class="card-body">
                            <h5 class="card-title">${data.destinationName}</h5>
                            <p class="card-text">${data.description}</p>
                        </div>
                        <div class="card-footer">
                            <small>Malaysian Adult: ${data.ticketPriceMalaysianAdult} MYR</small><br>
                            <small>Non-Malaysian Adult: ${data.ticketPriceNonMalaysianAdult} MYR</small><br>
                            <a href="${data.googleMapLink}" class="btn btn-light btn-sm text-dark" target="_blank">View on Map</a>
                        </div>
                    </div>
                </div>
            `;
            attractionsContainer.innerHTML += cardHTML;
        });

        // Handle media fallbacks after the DOM is updated
        handleMediaFallbacks();

    } catch (error) {
        console.error("Error fetching attractions: ", error);
        attractionsContainer.innerHTML = "<p>Error loading attractions. Please try again later.</p>";
    }
});
