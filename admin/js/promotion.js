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
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', function() {
    // Function to delete a promotion
    window.deletePromotion = function(id) {
        db.collection('promotions').doc(id).get().then(doc => {
            const slideImageUrl = doc.data().slideImageUrl;
            const imageRef = storage.refFromURL(slideImageUrl);

            imageRef.delete().then(() => {
                db.collection('promotions').doc(id).delete().then(() => {
                    renderPromotions(); // Refresh the promotions list after deletion
                }).catch(error => {
                    console.error('Error deleting promotion: ', error);
                });
            }).catch(error => {
                console.error('Error deleting image from storage: ', error);
            });
        }).catch(error => {
            console.error('Error getting promotion: ', error);
        });
    }

    // Function to render promotions from Firestore
    function renderPromotions() {
        const promotionList = document.getElementById('promotionList').getElementsByTagName('tbody')[0];
        promotionList.innerHTML = ''; // Clear the table body
        const currentDate = new Date();

        db.collection('promotions').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const promo = doc.data();

                // Check if startDateTime and endDateTime exist
                const startDateTime = promo.startDateTime ? promo.startDateTime.toDate() : null;
                const endDateTime = promo.endDateTime ? promo.endDateTime.toDate() : null;

                if (endDateTime && endDateTime <= currentDate) {
                    // Delete expired promotion
                    deletePromotion(doc.id);
                } else {
                    // Add promotion to table if the dates are valid
                    const row = promotionList.insertRow();
                    row.innerHTML = `
                        <td>${promo.promoCode}</td>
                        <td>${promo.discountAmount}</td>
                        <td>${promo.minSpend}</td>
                        <td>${startDateTime ? startDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }) : 'N/A'}</td>
                        <td>${endDateTime ? endDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }) : 'N/A'}</td>
                        <td><img src="${promo.slideImageUrl}" alt="Slide Image" width="100"></td>
                        <td>
                            <button class="btn btn-sm btn-warning mr-2" onclick="editPromotion('${doc.id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deletePromotion('${doc.id}')">Delete</button>
                        </td>
                    `;
                }
            });
        }).catch(error => {
            console.error('Error fetching promotions: ', error);
        });
    }

    // Function to edit a promotion
    window.editPromotion = function(id) {
        const docRef = db.collection('promotions').doc(id);
        docRef.get().then(doc => {
            if (doc.exists) {
                const promo = doc.data();

                // Make sure the date and time fields are valid before using them
                const startDateTime = promo.startDateTime ? promo.startDateTime.toDate() : null;
                const endDateTime = promo.endDateTime ? promo.endDateTime.toDate() : null;

                document.getElementById('editPromoCode').value = promo.promoCode;
                document.getElementById('editDiscountAmount').value = promo.discountAmount;
                document.getElementById('editMinSpend').value = promo.minSpend;
                document.getElementById('editStartDateTime').value = startDateTime ? startDateTime.toISOString().substring(0, 16) : '';
                document.getElementById('editEndDateTime').value = endDateTime ? endDateTime.toISOString().substring(0, 16) : '';

                editPromotionId = id; // Track the ID being edited
                $('#editPromotionModal').modal('show');
            }
        }).catch(error => {
            console.error('Error fetching promotion for edit: ', error);
            alert('Failed to load promotion for editing. Please try again later.');
        });
    }

    // Add new promotion
    document.getElementById('promotionForm').addEventListener('submit', function(event) {
        event.preventDefault();

        // Get form data
        const promoCode = document.getElementById('promoCode').value;
        const discountAmount = document.getElementById('discountAmount').value;
        const minSpend = document.getElementById('minSpend').value;
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
        const slideImage = document.getElementById('slideImage').files[0];

        const submitPromotion = slideImage ? 
            uploadSlideImage(slideImage).then(slideImageUrl => {
                return { slideImageUrl };
            }) : Promise.resolve({ slideImageUrl: null });

        submitPromotion.then(({ slideImageUrl }) => {
            const promotionData = {
                promoCode: promoCode,
                discountAmount: parseFloat(discountAmount),
                minSpend: parseFloat(minSpend),
                startDateTime: firebase.firestore.Timestamp.fromDate(new Date(startDateTime)),
                endDateTime: firebase.firestore.Timestamp.fromDate(new Date(endDateTime)),
                ...(slideImageUrl && { slideImageUrl }) // Only update slideImageUrl if provided
            };

            db.collection('promotions').add(promotionData)
                .then(() => {
                    alert('Promotion added successfully!');
                    document.getElementById('promotionForm').reset(); // Clear form
                    renderPromotions(); // Refresh promotions list
                }).catch(error => {
                    console.error('Error saving promotion: ', error);
                    alert('Failed to save promotion. Please try again later.');
                });
        });
    });

    // Save edited promotion
    document.getElementById('editPromotionForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const promoCode = document.getElementById('editPromoCode').value;
        const discountAmount = document.getElementById('editDiscountAmount').value;
        const minSpend = document.getElementById('editMinSpend').value;
        const startDateTime = document.getElementById('editStartDateTime').value;
        const endDateTime = document.getElementById('editEndDateTime').value;
        const slideImage = document.getElementById('editSlideImage').files[0];

        const updatePromotion = slideImage ?
            uploadSlideImage(slideImage).then(slideImageUrl => {
                return { slideImageUrl };
            }) : Promise.resolve({ slideImageUrl: null });

        updatePromotion.then(({ slideImageUrl }) => {
            const promotionData = {
                promoCode: promoCode,
                discountAmount: parseFloat(discountAmount),
                minSpend: parseFloat(minSpend),
                startDateTime: firebase.firestore.Timestamp.fromDate(new Date(startDateTime)),
                endDateTime: firebase.firestore.Timestamp.fromDate(new Date(endDateTime)),
                ...(slideImageUrl && { slideImageUrl }) // Only update slideImageUrl if provided
            };

            db.collection('promotions').doc(editPromotionId).update(promotionData)
                .then(() => {
                    alert('Promotion updated successfully!');
                    $('#editPromotionModal').modal('hide');
                    renderPromotions(); // Refresh promotions list
                    editPromotionId = null; // Reset after edit
                }).catch(error => {
                    console.error('Error updating promotion: ', error);
                    alert('Failed to update promotion. Please try again later.');
                });
        });
    });

    renderPromotions(); // Initial render

    // Function to upload slide image
    function uploadSlideImage(slideImage) {
        const storageRef = storage.ref().child(`promotions/${Date.now()}_${slideImage.name}`);
        return storageRef.put(slideImage).then(snapshot => snapshot.ref.getDownloadURL());
    }
});
