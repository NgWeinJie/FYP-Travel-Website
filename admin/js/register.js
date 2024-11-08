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

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    if (validation()) {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const contactNumber = document.getElementById('contactNumber').value;

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(adminCredential => {
                const admin = adminCredential.user;

                // Save user data to Firestore
                return firebase.firestore().collection('admin').doc(admin.uid).set({
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    contactNumber: contactNumber
                });
            })
            .then(() => {
                alert('Registration successful!');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000); // Delay of 1 second
            })
            .catch(error => {
                showError('formError', error.message);
            });
    }
});

function validation() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const contactNumber = document.getElementById('contactNumber').value.trim();

    const emailRegex = email => /\S+@\S+\.\S+/.test(email);
    const passwordRegex = password => password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    const phoneRegex = contactNumber => contactNumber.length >= 10 && /^\d+$/.test(contactNumber);

    const errorMessages = {
        firstName: 'First Name must not be empty.',
        lastName: 'Last Name must not be empty.',
        email: 'Invalid email.',
        password: 'Password must be at least 6 characters long and contain at least one letter, one number and one symbol.',
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
    const isValidPassword = validateField('password', passwordRegex, errorMessages.password);
    const isValidContactNumber = validateField('contactNumber', phoneRegex, errorMessages.contactNumber);

    return isValidFirstName && isValidLastName && isValidEmail && isValidPassword && isValidContactNumber;
}

function showError(elementId, message) {
    const errorField = document.getElementById(elementId);
    errorField.textContent = message;
    errorField.classList.remove('d-none');
}
