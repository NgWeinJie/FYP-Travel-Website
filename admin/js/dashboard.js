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

// Display attractions
async function displayAttractions(query = '') {
  const attractionsList = document.getElementById('attractionsList');
  attractionsList.innerHTML = '';

  try {
      const snapshot = await db.collection('attractions').get();
      snapshot.forEach(doc => {
          const data = doc.data();
          if (data.destinationName.toLowerCase().includes(query.toLowerCase())) {
              const id = doc.id;
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
      const query = e.target.value;
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

      // Display existing images
      const imageGallery = document.getElementById('editImageGallery');
      imageGallery.innerHTML = '';
      data.images.forEach((imgUrl, index) => {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'mb-2';
          imgContainer.innerHTML = `
              <img src="${imgUrl}" class="img-fluid" alt="Image ${index + 1}">
              <input type="file" class="form-control-file mt-2" id="replaceImage${index}" accept="image/*,video/*" data-index="${index}">
          `;
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
  };

  const imageElements = document.querySelectorAll('#editImageGallery img');
  const imageInputs = document.querySelectorAll('#editImageGallery input[type="file"]');
  const newImages = new Array(imageInputs.length); // Initialize with the length of image inputs

  try {
      // Upload new images
      for (const imageInput of imageInputs) {
          const file = imageInput.files[0];
          const index = imageInput.dataset.index;
          if (file) {
              const storageRef = storage.ref().child(`attractions/${id}/image_${index}`);
              console.log(`Uploading image ${index} to ${storageRef.fullPath}`); // Debugging log
              const snapshot = await storageRef.put(file);
              console.log(`Image ${index} upload snapshot:`, snapshot); // Debugging log
              const url = await storageRef.getDownloadURL();
              console.log(`Image ${index} uploaded successfully. URL: ${url}`); // Debugging log
              newImages[index] = url; // Update the new image URLs array
          }
      }

      // Fetch existing image URLs from the document
      const doc = await db.collection('attractions').doc(id).get();
      const existingImages = doc.data().images;

      // Replace existing images with new images
      updatedData.images = existingImages.map((imgUrl, index) => {
          return newImages[index] || imgUrl; // Use new image if available, otherwise keep existing
      });

      // Add new images if any
      for (let i = existingImages.length; i < newImages.length; i++) {
          if (newImages[i]) {
              updatedData.images.push(newImages[i]);
          }
      }

      console.log('Updated image URLs:', updatedData.images); // Debugging log

      // Update the document in Firestore
      await db.collection('attractions').doc(id).update(updatedData);
      console.log(`Document ${id} updated successfully`); // Debugging log
      $('#editModal').modal('hide');
      displayAttractions();
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
