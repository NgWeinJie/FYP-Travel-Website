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

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userDoc = firebase.firestore().collection('users').doc(user.uid);
            userDoc.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    document.getElementById('firstName').value = data.firstName;
                    document.getElementById('lastName').value = data.lastName;
                    document.getElementById('email').value = data.email;
                    document.getElementById('contactNumber').value = data.contactNumber;
                }
            }).catch(error => {
                console.error("Error fetching user data:", error);
            });
        } else {
            window.location.href = 'login.html'; // Redirect if not authenticated
        }
    });

    const editButton = document.getElementById('editButton');
    const saveButton = document.getElementById('saveButton');
    const inputs = document.querySelectorAll('#profileForm input');

    editButton.addEventListener('click', function() {
        inputs.forEach(input => input.removeAttribute('readonly'));
        saveButton.classList.remove('d-none');
        editButton.classList.add('d-none');
    });

    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateProfile()) {
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const contactNumber = document.getElementById('contactNumber').value;

            const user = firebase.auth().currentUser;

            if (user) {
                firebase.firestore().collection('users').doc(user.uid).update({
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    contactNumber: contactNumber
                }).then(() => {
                    alert('Profile updated successfully!');
                    // Hide save button and show edit button
                    saveButton.classList.add('d-none');
                    editButton.classList.remove('d-none');
                    inputs.forEach(input => input.setAttribute('readonly', true));
                }).catch(error => {
                    showError('formError', error.message);
                });
            }
        }
    });

    function validateProfile() {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const contactNumber = document.getElementById('contactNumber').value.trim();

        const emailRegex = email => /\S+@\S+\.\S+/.test(email);
        const phoneRegex = contactNumber => contactNumber.length >= 10 && /^\d+$/.test(contactNumber);

        const errorMessages = {
            firstName: 'First Name must not be empty.',
            lastName: 'Last Name must not be empty.',
            email: 'Invalid email.',
            contactNumber: 'Contact Number must be numeric and at least 10 digits long.'
        };

        function validateField(fieldId, validationFunction, errorMessage) {
            const value = document.getElementById(fieldId).value.trim();
            const errorField = document.getElementById(fieldId + 'Error');
            if (!validationFunction(value)) {
                errorField.textContent = errorMessage;
                errorField.classList.remove('d-none');
                return false;
            } else {
                errorField.textContent = '';
                errorField.classList.add('d-none');
                return true;
            }
        }

        const isValidFirstName = validateField('firstName', value => value !== '', errorMessages.firstName);
        const isValidLastName = validateField('lastName', value => value !== '', errorMessages.lastName);
        const isValidEmail = validateField('email', emailRegex, errorMessages.email);
        const isValidContactNumber = validateField('contactNumber', phoneRegex, errorMessages.contactNumber);

        return isValidFirstName && isValidLastName && isValidEmail && isValidContactNumber;
    }

    function showError(elementId, message) {
        const errorField = document.getElementById(elementId);
        errorField.textContent = message;
        errorField.classList.remove('d-none');
    }
});
