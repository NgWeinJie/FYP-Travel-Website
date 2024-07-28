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

document.getElementById('attractionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const destinationName = document.getElementById('destinationName').value;
    const ticketPriceMalaysianAdult = document.getElementById('ticketPriceMalaysianAdult').value;
    const ticketPriceMalaysianChild = document.getElementById('ticketPriceMalaysianChild').value;
    const ticketPriceNonMalaysianAdult = document.getElementById('ticketPriceNonMalaysianAdult').value;
    const ticketPriceNonMalaysianChild = document.getElementById('ticketPriceNonMalaysianChild').value;
    const description = document.getElementById('description').value;
    const operatingHours = document.getElementById('operatingHours').value;
    const googleMapLink = document.getElementById('googleMapLink').value;
    const state = document.getElementById('state').value;
    const files = document.getElementById('images').files;

    // Ensure at least one image or video is uploaded
    if (files.length === 0) {
        document.getElementById('statusMessage').textContent = 'Please upload at least one image or video.';
        return;
    }

    // Convert and upload images, then store URLs
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type.startsWith('image/')) {
            // Convert image to JPG if it's not already
            const convertedFile = await convertToJPG(file);
            const fileRef = storage.ref(`attractions/${convertedFile.name}`);
            await fileRef.put(convertedFile);
            const downloadURL = await fileRef.getDownloadURL();
            imageUrls.push(downloadURL);
        } else {
            // Handle non-image files (videos)
            const fileRef = storage.ref(`attractions/${file.name}`);
            await fileRef.put(file);
            const downloadURL = await fileRef.getDownloadURL();
            imageUrls.push(downloadURL);
        }
    }

    // Store attraction data in Firestore
    try {
        await db.collection('attractions').add({
            destinationName,
            ticketPriceMalaysianAdult,
            ticketPriceMalaysianChild,
            ticketPriceNonMalaysianAdult,
            ticketPriceNonMalaysianChild,
            description,
            operatingHours,
            googleMapLink,
            state,
            images: imageUrls
        });
        document.getElementById('statusMessage').textContent = 'Attraction added successfully!';
        alert('Attraction added successfully!'); // Show alert message
        document.getElementById('attractionForm').reset();
    } catch (error) {
        document.getElementById('statusMessage').textContent = `Error: ${error.message}`;
    }
});

// Function to convert image to JPG
async function convertToJPG(file) {
    const img = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            img.src = event.target.result;
        };

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
                resolve(newFile);
            }, 'image/jpeg');
        };

        img.onerror = () => reject('Image conversion failed.');
        reader.readAsDataURL(file);
    });
}
