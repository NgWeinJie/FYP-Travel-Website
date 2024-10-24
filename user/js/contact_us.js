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

document.addEventListener('DOMContentLoaded', function() {
    let userName = '';
    let userEmail = '';
    let currentTicketId = '';
    let isTicketOpen = false;

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userDoc = db.collection('users').doc(user.uid);
            userDoc.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    userName = `${data.firstName} ${data.lastName}`;
                    userEmail = data.email;
                }
            }).catch(error => console.error("Error fetching user data:", error));

            fetchUserTickets(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    document.getElementById('contactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        if (validateForm(subject, message)) {
            try {
                await db.collection('tickets').add({
                    userId: firebase.auth().currentUser.uid,
                    userName: userName,
                    userEmail: userEmail,
                    subject: subject,
                    messages: [{ sender: 'user', message: message, timestamp: new Date() }],
                    status: 'open',
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                showSuccessMessage();
            } catch (error) {
                showErrorMessage('Error submitting ticket. Please try again.');
                console.error('Error submitting contact message:', error);
            }
        }
    });

    function fetchUserTickets(userId) {
        db.collection('tickets')
          .where('userId', '==', userId)
          .onSnapshot(snapshot => {
            const ticketList = document.getElementById('ticket-list');
            const closedTicketsList = document.getElementById('closed-tickets-list');
            ticketList.innerHTML = '';
            closedTicketsList.innerHTML = '';

            snapshot.forEach(doc => {
                const ticket = doc.data();
                const ticketItem = document.createElement('button');
                ticketItem.classList.add('list-group-item', 'list-group-item-action');
                ticketItem.textContent = `${ticket.subject} - ${new Date(ticket.created_at?.seconds * 1000).toLocaleString()}`;
                ticketItem.onclick = () => openChat(doc.id, ticket.status === 'open');

                if (ticket.status === 'open') {
                    ticketList.appendChild(ticketItem);
                } else {
                    closedTicketsList.appendChild(ticketItem);
                }
            });
        });
    }

    function openChat(ticketId, isOpen) {
        currentTicketId = ticketId;
        isTicketOpen = isOpen;
        $('#chatModal').modal('show');
        
        const chatMessages = document.getElementById('chat-messages');
        const chatInputSection = document.getElementById('chat-input-section');
        const userMessage = document.getElementById('userMessage');
        const sendUserMessage = document.getElementById('sendUserMessage');
        const closeTicketButton = document.getElementById('closeTicket');
        
        // Fetch and display messages for the selected ticket
        db.collection('tickets').doc(ticketId).onSnapshot(doc => {
            const ticket = doc.data();
            chatMessages.innerHTML = '';
    
            let lastDate = '';
    
            ticket.messages.forEach(msg => {
                const messageDate = new Date(msg.timestamp.seconds * 1000).toLocaleDateString();
                const messageTime = new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
                // Display the date if it's different from the last message's date
                if (messageDate !== lastDate) {
                    const dateDiv = document.createElement('div');
                    dateDiv.classList.add('date-divider');
                    dateDiv.textContent = messageDate;
                    chatMessages.appendChild(dateDiv);
                    lastDate = messageDate;
                }
    
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('message', msg.sender === 'admin' ? 'admin' : 'user', 'mb-2');
                msgDiv.innerHTML = `<div>${msg.message}</div><div class="message-time">${messageTime}</div>`;
                chatMessages.appendChild(msgDiv);
            });
    
            // Show or hide the input section based on the ticket status
            if (isTicketOpen) {
                chatInputSection.style.display = 'flex';
                userMessage.disabled = false;
                sendUserMessage.style.display = 'inline-block';
                closeTicketButton.style.display = 'inline-block';
            } else {
                chatInputSection.style.display = 'none';
                sendUserMessage.style.display = 'none';
                closeTicketButton.style.display = 'none';
            }
        });
    
        // Sending message logic
        sendUserMessage.onclick = async () => {
            if (!isTicketOpen) return;
    
            const message = userMessage.value;
            if (message.trim()) {
                await db.collection('tickets').doc(ticketId).update({
                    messages: firebase.firestore.FieldValue.arrayUnion({
                        sender: 'user',
                        message,
                        timestamp: new Date()
                    })
                });
                userMessage.value = '';
            }
        };
    
        // Closing ticket logic
        closeTicketButton.onclick = async () => {
            if (!isTicketOpen) return;
    
            await db.collection('tickets').doc(ticketId).update({ status: 'closed' });
            $('#chatModal').modal('hide');
        };
    }
    
    function validateForm(subject, message) {
        let isValid = true;
        if (!subject) {
            showError('subjectError', 'Subject is required.');
            isValid = false;
        } else hideError('subjectError');
        if (!message) {
            showError('messageError', 'Message is required.');
            isValid = false;
        } else hideError('messageError');
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
        alert('Ticket created successfully!');
        document.getElementById('contactForm').reset();
    }
    

    function showErrorMessage(message) {
        alert(message);
    }
    
});