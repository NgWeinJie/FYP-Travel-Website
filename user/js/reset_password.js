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

document.getElementById('resetPasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;

    if (validateForm(email)) {
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                alert('Password reset email sent! Please check your email.');
                window.location.href = 'login.html';
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
    }
});

function validateForm(email) {
    if (email === '') {
        alert('Email is required.');
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
