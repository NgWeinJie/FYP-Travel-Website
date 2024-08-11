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

// References to Firestore and Storage
const db = firebase.firestore();
const storage = firebase.storage();

let selectedFilesOrder = []; // Global array to track file selection order

// Capture the order in which files are selected
document.getElementById('editImages').addEventListener('change', function (e) {
    selectedFilesOrder = Array.from(e.target.files); // Store files in the order they were selected
    console.log('Selected files in order:', selectedFilesOrder);
});

// Display attractions
async function displayAttractions(query = '') {
    const attractionsList = document.getElementById('attractionsList');
    attractionsList.innerHTML = ''; // Clear the container before displaying new results

    try {
        const snapshot = await db.collection('attractions').get();
        const seenAttractions = new Set(); // Track seen attractions by their ID

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;

            // Check if the attraction name includes the search query (case-insensitive)
            if (data.destinationName.toLowerCase().includes(query.toLowerCase())) {
                // Check if this attraction has already been added
                if (!seenAttractions.has(id)) {
                    seenAttractions.add(id); // Mark this attraction as seen

                    const card = document.createElement('div');
                    card.className = 'col-md-4 mb-4';
                    card.innerHTML = `
                        <div class="card">
                            <img src="${data.images[0]}" class="card-img-top" alt="${data.destinationName}">
                            <div class="card-body">
                                <h5 class="card-title">${data.destinationName}</h5>
                                <p class="card-text">${data.description}</p>
                                <a href="#" class="btn btn-primary" onclick="editAttraction('${id}')">Edit</a>
                                <a href="#" class="btn btn-danger" onclick="deleteAttraction('${id}')">Delete</a>
                            </div>
                        </div>
                    `;
                    attractionsList.appendChild(card);
                }
            }
        });
    } catch (error) {
        console.error("Error fetching attractions:", error);
        attractionsList.innerHTML = "<p>Error loading attractions. Please try again later.</p>";
    }
}

// Load attractions on page load
window.onload = () => {
    displayAttractions();

    // Set up search functionality
    document.getElementById('searchBar').addEventListener('input', (e) => {
        const query = e.target.value.trim(); // Trim the search query to avoid any leading/trailing spaces
        displayAttractions(query);
    });
};

// Edit attraction
async function editAttraction(id) {
    try {
        const doc = await db.collection('attractions').doc(id).get();
        const data = doc.data();

        document.getElementById('editAttractionId').value = id;
        document.getElementById('editDestinationName').value = data.destinationName;
        document.getElementById('editTicketPriceMalaysianAdult').value = data.ticketPriceMalaysianAdult;
        document.getElementById('editTicketPriceMalaysianChild').value = data.ticketPriceMalaysianChild;
        document.getElementById('editTicketPriceNonMalaysianAdult').value = data.ticketPriceNonMalaysianAdult;
        document.getElementById('editTicketPriceNonMalaysianChild').value = data.ticketPriceNonMalaysianChild;
        document.getElementById('editDescription').value = data.description;
        document.getElementById('editOperatingHours').value = data.operatingHours;
        document.getElementById('editGoogleMapLink').value = data.googleMapLink;
        document.getElementById('editState').value = data.state;

        // Display current images
        const imageGallery = document.getElementById('currentImages');
        imageGallery.innerHTML = '';
        data.images.forEach((imgUrl, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'mb-2';
            imgContainer.innerHTML = `<img src="${imgUrl}" class="img-fluid" alt="Image ${index + 1}">`;
            imageGallery.appendChild(imgContainer);
        });

        $('#editModal').modal('show');
    } catch (error) {
        console.error("Error retrieving attraction data:", error);
    }
}

// Save edited attraction
document.getElementById('editAttractionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editAttractionId').value;

    const updatedData = {
        destinationName: document.getElementById('editDestinationName').value,
        ticketPriceMalaysianAdult: document.getElementById('editTicketPriceMalaysianAdult').value,
        ticketPriceMalaysianChild: document.getElementById('editTicketPriceMalaysianChild').value,
        ticketPriceNonMalaysianAdult: document.getElementById('editTicketPriceNonMalaysianAdult').value,
        ticketPriceNonMalaysianChild: document.getElementById('editTicketPriceNonMalaysianChild').value,
        description: document.getElementById('editDescription').value,
        operatingHours: document.getElementById('editOperatingHours').value,
        googleMapLink: document.getElementById('editGoogleMapLink').value,
        state: document.getElementById('editState').value,
        images: [] // Initialize the images array
    };

    if (selectedFilesOrder.length !== 3) {
        alert("Please upload exactly 3 images.");
        return;
    }

    try {
        // Create an array of promises for each upload to ensure sequential uploads
        for (let i = 0; i < selectedFilesOrder.length; i++) {
            const file = selectedFilesOrder[i];
            console.log(`Uploading file for image ${i}:`, file);

            // We use async/await in a loop to ensure order is preserved
            const storageRef = storage.ref().child(`attractions/${id}/image_${i}_${Date.now()}`);
            const snapshot = await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            console.log(`New URL for image ${i}: ${url}`);
            updatedData.images[i] = url; // Add the new image URL to the images array in the correct order
        }

        // Log the final images array before updating Firestore
        console.log('Final images array to update:', updatedData.images);

        // Update the document in Firestore with images in the correct order
        await db.collection('attractions').doc(id).update(updatedData);
        console.log(`Document ${id} updated successfully`);
        $('#editModal').modal('hide');
        window.location.reload(); // Force refresh to see updated images
    } catch (error) {
        console.error("Error saving edited attraction:", error);
        alert("An error occurred while saving the attraction. Please try again.");
    }
});

// Delete attraction
function deleteAttraction(id) {
    $('#deleteModal').modal('show');
    document.getElementById('confirmDelete').onclick = async () => {
        try {
            const snapshot = await db.collection('attractions').doc(id).get();
            const data = snapshot.data();
            data.images.forEach(async imgUrl => {
                try {
                    const imgRef = storage.refFromURL(imgUrl);
                    await imgRef.delete();
                } catch (error) {
                    console.error('Error deleting image:', error);
                }
            });

            await db.collection('attractions').doc(id).delete();
            $('#deleteModal').modal('hide');
            displayAttractions();
        } catch (error) {
            console.error("Error deleting attraction:", error);
            alert("An error occurred while deleting the attraction. Please try again.");
        }
    };
}
