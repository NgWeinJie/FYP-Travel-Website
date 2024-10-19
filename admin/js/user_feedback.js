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

// Function to load user feedback
function loadUserFeedback() {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = ''; // Clear existing feedback

    db.collection('feedback').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            feedbackList.innerHTML = '<p>No feedback available.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const feedback = doc.data();
            const feedbackItem = document.createElement('div');
            feedbackItem.className = 'feedback-item card mb-3 shadow';
            feedbackItem.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${feedback.subject}</h5>
                    <p class="card-text">${feedback.message}</p>
                    <div class="feedback-details">
                        <p class="text-muted mb-0">Submitted by: <strong>${feedback.name}</strong></p>
                        <p class="text-muted mb-0">Email: <strong>${feedback.email}</strong></p>
                        <p class="text-muted mb-0">Submitted on: <strong>${feedback.timestamp.toDate().toLocaleString()}</strong></p>
                    </div>
                </div>
            `;
            feedbackList.appendChild(feedbackItem);
        });
    }, error => {
        console.error("Error loading feedback:", error);
    });
}

// Load feedback on page load
loadUserFeedback();
