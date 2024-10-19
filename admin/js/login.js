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

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (validateForm(email, password)) {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('Login successful!');
                window.location.href = 'dashboard.html';
            })
            .catch(error => {
                handleLoginError(error);
            });
    }
});

function validateForm(email, password) {
    if (email === '' || password === '') {
        alert('All fields are required.');
        return false;
    }
    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return false;
    }
    return true;
}

function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
    return re.test(String(email).toLowerCase());
}

function handleLoginError(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            alert('No user found with this email.');
            break;
        case 'auth/wrong-password':
            alert('Incorrect password. Please try again.');
            break;
        case 'auth/invalid-email':
            alert('Invalid email format.');
            break;
        case 'auth/internal-error':
            alert('Invalid email or password.');
            break;
        default:
            alert('Error: ' + error.message);
    }
}
