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
const auth = firebase.auth();

console.log("Firebase initialized"); // Debugging log

let currentSessionId = null;

// Function to load user sessions in real-time with queue numbers
function loadUserSessions() {
    console.log("Loading user sessions"); // Debugging log
    const userSessionsContainer = document.getElementById('user-sessions');
    userSessionsContainer.innerHTML = '';

    db.collection('chat_sessions')
        .where('status', '==', 'active')
        .orderBy('lastMessageAt', 'asc') // Order by last message timestamp (queue system)
        .onSnapshot(snapshot => {
            console.log("Sessions snapshot: ", snapshot); // Debugging log
            userSessionsContainer.innerHTML = ''; // Clear the current sessions

            if (snapshot.empty) {
                console.log("No active sessions found");
                userSessionsContainer.innerHTML = '<p>No active sessions.</p>';
                return;
            }

            let queueNumber = 1;
            snapshot.forEach(doc => {
                const session = doc.data();
                console.log("Loaded session: ", session); // Debugging log
                const sessionElement = document.createElement('div');
                sessionElement.textContent = `Queue ${queueNumber}: Session ${session.sessionId}`;
                sessionElement.className = 'session-item';
                sessionElement.addEventListener('click', () => {
                    currentSessionId = session.sessionId;
                    loadChatMessages(currentSessionId);
                });
                userSessionsContainer.appendChild(sessionElement);
                queueNumber++;
            });
        }, error => {
            console.error("Error loading user sessions: ", error);
        });
}

// Function to load chat messages for a session in real-time
function loadChatMessages(sessionId) {
    console.log("Loading chat messages for session: ", sessionId); // Debugging log
    console.log("Admin sessionId: ", currentSessionId);
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    db.collection('messages')
        .where('sessionId', '==', sessionId)
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            console.log("Messages snapshot: ", snapshot); // Debugging log

            chatMessages.innerHTML = ''; // Clear current messages

            if (snapshot.empty) {
                console.log("No messages found for this session");
                chatMessages.innerHTML = '<p>No messages found.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const msg = doc.data();
                console.log("Loaded message: ", msg); // Debugging log
                const msgElement = document.createElement('div');
                msgElement.textContent = msg.sender === 'user' ? `User: ${msg.text}` : `You: ${msg.text}`;
                chatMessages.appendChild(msgElement);
            });
        }, error => {
            console.error("Error loading chat messages: ", error);
        });
}

// Admin send message
document.getElementById('send-chat-btn').addEventListener('click', async () => {
    const message = document.getElementById('chat-input').value;
    
    // Initialize imageUrl (in case there is no image uploaded)
    let imageUrl = null;

    // If there's a valid message and session ID
    if (message.trim() !== '' && currentSessionId) {
        console.log("Sending message: ", message);
        console.log("Admin sessionId: ", currentSessionId);

        const now = new Date();

        // Prepare message data
        const messageData = {
            text: message,
            timestamp: now,
            sender: 'admin',
            sessionId: currentSessionId,
            status: 'active'
        };

        // Only include imageUrl if it's defined (optional: add image handling)
        if (imageUrl) {
            messageData.imageUrl = imageUrl;
        }

        // Send the message to Firestore
        await db.collection('messages').add(messageData);

        // Update lastMessageAt in chat_sessions
        await db.collection('chat_sessions').doc(currentSessionId).update({
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Clear the chat input field after sending
        document.getElementById('chat-input').value = '';
    }
});


document.getElementById('end-chat-btn').addEventListener('click', async () => {
    if (currentSessionId) {
        console.log("Ending chat session: ", currentSessionId); // Debugging log
        await db.collection('chat_sessions').doc(currentSessionId).update({
            status: 'ended',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentSessionId = null;
        document.getElementById('chat-messages').innerHTML = '';
    }
});

// Load user sessions on page load
loadUserSessions();
