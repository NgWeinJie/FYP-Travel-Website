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
    
    function renderVouchers() {
        const voucherList = document.getElementById('voucherList').getElementsByTagName('tbody')[0];
        voucherList.innerHTML = ''; 

        db.collection('vouchers').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const voucher = doc.data();
                const row = voucherList.insertRow();
                row.innerHTML = `
                    <td>${voucher.voucherName}</td>
                    <td>${voucher.costOfCoins}</td>
                    <td>${voucher.stocks}</td>
                    <td>${voucher.stepsToUse}</td>
                    <td>${voucher.termsConditions}</td>
                    <td><img src="${voucher.voucherImageUrl}" alt="Voucher Image" width="100"></td>
                    <td>
                        <button class="btn btn-sm btn-warning mr-2" onclick="editVoucher('${doc.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVoucher('${doc.id}')">Delete</button>
                    </td>
                `;
            });
        }).catch(error => {
            console.error('Error fetching vouchers: ', error);
        });
    }

    // Add new voucher
    document.getElementById('voucherForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const voucherName = document.getElementById('voucherName').value;
        const costOfCoins = document.getElementById('costOfCoins').value;
        const stocks = document.getElementById('stocks').value;
        const stepsToUse = document.getElementById('stepsToUse').value;
        const termsConditions = document.getElementById('termsConditions').value;
        const voucherImage = document.getElementById('voucherImage').files[0];

        if (voucherImage) {
            uploadVoucherImage(voucherImage).then(voucherImageUrl => {
                const voucherData = {
                    voucherName,
                    costOfCoins: parseFloat(costOfCoins),
                    stocks: parseInt(stocks),
                    stepsToUse,
                    termsConditions,
                    voucherImageUrl
                };

                db.collection('vouchers').add(voucherData).then(() => {
                    alert('Voucher added successfully!');
                    document.getElementById('voucherForm').reset();
                    renderVouchers(); // Refresh vouchers list
                }).catch(error => {
                    console.error('Error adding voucher: ', error);
                    alert('Failed to add voucher. Please try again later.');
                });
            });
        }
    });

    function uploadVoucherImage(voucherImage) {
        const storageRef = storage.ref().child(`vouchers/${Date.now()}_${voucherImage.name}`);
        return storageRef.put(voucherImage).then(snapshot => snapshot.ref.getDownloadURL());
    }

    window.editVoucher = function(id) {
        // Fetch the voucher data based on the document ID
        db.collection('vouchers').doc(id).get().then(doc => {
            if (doc.exists) {
                const voucher = doc.data();
    
                // Populate the modal form with the voucher data
                document.getElementById('editVoucherName').value = voucher.voucherName;
                document.getElementById('editCostOfCoins').value = voucher.costOfCoins;
                document.getElementById('editStocks').value = voucher.stocks;
                document.getElementById('editStepsToUse').value = voucher.stepsToUse;
                document.getElementById('editTermsConditions').value = voucher.termsConditions;
    
                // Show the edit modal
                $('#editVoucherModal').modal('show');
    
                // Handle save changes
                document.getElementById('saveChangesButton').onclick = function() {
                    // Update the voucher data in Firestore
                    db.collection('vouchers').doc(id).update({
                        voucherName: document.getElementById('editVoucherName').value,
                        costOfCoins: parseFloat(document.getElementById('editCostOfCoins').value),
                        stocks: parseInt(document.getElementById('editStocks').value),
                        stepsToUse: document.getElementById('editStepsToUse').value,
                        termsConditions: document.getElementById('editTermsConditions').value
                    }).then(() => {
                        $('#editVoucherModal').modal('hide');
                        alert('Voucher updated successfully!');
                        renderVouchers(); // Refresh vouchers list
                    }).catch(error => {
                        console.error('Error updating voucher: ', error);
                        alert('Failed to update voucher. Please try again later.');
                    });
                };
            } else {
                console.error('No such document!');
            }
        }).catch(error => {
            console.error('Error fetching voucher: ', error);
        });
    };
    
    window.deleteVoucher = function(id) {
        db.collection('vouchers').doc(id).get().then(doc => {
            const voucherImageUrl = doc.data().voucherImageUrl;
            const imageRef = storage.refFromURL(voucherImageUrl);

            imageRef.delete().then(() => {
                // Delete the voucher document after the image is deleted
                db.collection('vouchers').doc(id).delete().then(() => {
                    renderVouchers(); // Refresh vouchers list
                }).catch(error => {
                    console.error('Error deleting voucher: ', error);
                });
            }).catch(error => {
                console.error('Error deleting voucher image, but proceeding to delete document.', error);
                // Proceed to delete the document even if the image deletion fails
                db.collection('vouchers').doc(id).delete().then(() => {
                    renderVouchers(); // Refresh vouchers list
                }).catch(error => {
                    console.error('Error deleting voucher: ', error);
                });
            });
        }).catch(error => {
            console.error('Error getting voucher: ', error);
        });
    }

    renderVouchers(); // Initial render
});
