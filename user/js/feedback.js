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
    let userName = '';
    let userEmail = '';

    // Fetch current user details
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userDoc = firebase.firestore().collection('users').doc(user.uid);
            userDoc.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    userName = `${data.firstName} ${data.lastName}`;
                    userEmail = data.email;
                }
            }).catch(error => {
                console.error("Error fetching user data:", error);
            });
        } else {
            window.location.href = 'login.html'; // Redirect if not authenticated
        }
    });

    document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        if (validateFeedback(subject, message)) {
            try {
                await firebase.firestore().collection('feedback').add({
                    name: userName,
                    email: userEmail,
                    subject: subject,
                    message: message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                showSuccessMessage();
            } catch (error) {
                showErrorMessage('Error submitting feedback. Please try again.');
                console.error('Error submitting feedback:', error);
            }
        }
    });

    function validateFeedback(subject, message) {
        let isValid = true;

        if (!subject) {
            showError('subjectError', 'Subject is required.');
            isValid = false;
        } else {
            hideError('subjectError');
        }

        if (!message) {
            showError('messageError', 'Feedback message is required.');
            isValid = false;
        } else {
            hideError('messageError');
        }

        return isValid;
    }

    function showError(fieldId, message) {
        const errorField = document.getElementById(fieldId);
        errorField.textContent = message;
        errorField.classList.remove('d-none');
    }

    function hideError(fieldId) {
        const errorField = document.getElementById(fieldId);
        errorField.textContent = '';
        errorField.classList.add('d-none');
    }

    function showSuccessMessage() {
        document.getElementById('successMessage').classList.remove('d-none');
        setTimeout(() => {
            document.getElementById('successMessage').classList.add('d-none');
            document.getElementById('feedbackForm').reset();
        }, 3000);
    }

    function showErrorMessage(message) {
        const errorField = document.getElementById('formError');
        errorField.textContent = message;
        errorField.classList.remove('d-none');
    }
});
