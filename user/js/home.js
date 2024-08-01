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

        snapshot.forEach(doc => {
            const data = doc.data();
            const mediaElement = createMediaElement(data.images);
            const attractionId = doc.id;

            const cardHTML = `
                <div class="col-md-4 mb-4">
                    <a href="attraction_details.html?id=${attractionId}" class="card-link">
                        <div class="card">
                            ${mediaElement}
                            <div class="card-body">
                                <h5 class="card-title">${data.destinationName}</h5>
                                <p class="card-text">From MYR ${data.ticketPriceMalaysianAdult}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            attractionsContainer.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error fetching attractions: ", error);
        attractionsContainer.innerHTML = "<p>Error loading attractions. Please try again later.</p>";
    }
});
