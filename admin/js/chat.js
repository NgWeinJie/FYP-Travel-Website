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

let adminName = '';

// Function to get admin name from Firestore
function getAdminName(admin) {
    return db.collection('admin').doc(admin.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            return `${data.firstName} ${data.lastName}`;
        } else {
            return 'Admin';  // Default fallback if admin document doesn't exist
        }
    }).catch(() => 'Admin');
}

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch admin data
    firebase.auth().onAuthStateChanged(async function (admin) {
        if (admin) {
            adminName = await getAdminName(admin);
        }
    });

    fetchTickets();
    showOngoingChats(); // Show ongoing chats by default
});

// Show Ongoing Chats Section
function showOngoingChats() {
    document.getElementById('ongoing-chats-section').classList.remove('d-none');
    document.getElementById('closed-chats-section').classList.add('d-none');
    document.getElementById('ongoing-tab').classList.add('active');
    document.getElementById('closed-tab').classList.remove('active');

    fetchTickets(); // Fetch tickets again to reset the display for ongoing chats
}

// Show Closed Chats Section
function showClosedChats() {
    document.getElementById('closed-chats-section').classList.remove('d-none');
    document.getElementById('ongoing-chats-section').classList.add('d-none');
    document.getElementById('closed-tab').classList.add('active');
    document.getElementById('ongoing-tab').classList.remove('active');

    fetchTickets();
}

// Fetch and display tickets
function fetchTickets() {
    db.collection('tickets').orderBy('created_at', 'asc').onSnapshot(snapshot => {
        const ongoingChats = document.getElementById('ongoing-chats');
        const closedChats = document.getElementById('closed-chats');
        ongoingChats.innerHTML = '';
        closedChats.innerHTML = '';

        let firstOngoingChatId = null;
        let firstClosedChatId = null;

        const closedTickets = []; // Array to store closed tickets for sorting

        snapshot.forEach(doc => {
            const ticket = doc.data();
            const ticketItem = document.createElement('div');
            ticketItem.classList.add('ticket-item', 'border', 'p-2', 'mb-2');
            ticketItem.textContent = `${ticket.subject} - ${new Date(ticket.created_at?.seconds * 1000).toLocaleString()}`;
            ticketItem.onclick = () => openChat(doc.id, ticket.status === 'open');

            if (ticket.status === 'open') {
                ongoingChats.appendChild(ticketItem);
                if (!firstOngoingChatId) {
                    firstOngoingChatId = doc.id;
                }
            } else {
                closedTickets.push({ docId: doc.id, ticketItem });
            }
        });

        // Sort the closed tickets by created_at in descending order (newest first)
        closedTickets.sort((a, b) => {
            const timeA = new Date(a.ticketItem.textContent.split(' - ')[1]).getTime();
            const timeB = new Date(b.ticketItem.textContent.split(' - ')[1]).getTime();
            return timeB - timeA;
        });

        // Append the sorted closed tickets
        closedTickets.forEach(ticket => {
            closedChats.appendChild(ticket.ticketItem);
            if (!firstClosedChatId) {
                firstClosedChatId = ticket.docId;
            }
        });

        // Automatically open the first ongoing or closed chat based on the active tab
        if (document.getElementById('ongoing-tab').classList.contains('active') && firstOngoingChatId) {
            openChat(firstOngoingChatId, true);
        } else if (document.getElementById('closed-tab').classList.contains('active') && firstClosedChatId) {
            openChat(firstClosedChatId, false);
        }
    });
}

// Open chat for a specific ticket
function openChat(ticketId, isOpen) {
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const adminMessage = document.getElementById('adminMessage');
    const sendAdminMessage = document.getElementById('sendAdminMessage');
    const closeTicketButton = document.getElementById('closeTicket');

    chatWindow.style.display = 'block';
    db.collection('tickets').doc(ticketId).onSnapshot(doc => {
        const ticket = doc.data();
        chatMessages.innerHTML = ''; // Clear the chat messages before rendering
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
            const senderName = msg.sender === 'admin' ? `${msg.senderName} (admin)` : `${msg.senderName} (user)`;
            msgDiv.innerHTML = `<div><span class="admin-name">${senderName}</span>:</div> <div class="message-text">${msg.message}</div> <div class="message-time">${messageTime}</div>`;
            chatMessages.appendChild(msgDiv);
        });

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Enable or disable admin interaction based on chat status
        if (isOpen) {
            adminMessage.disabled = false;
            sendAdminMessage.style.display = 'inline-block';
            closeTicketButton.style.display = 'inline-block';
        } else {
            adminMessage.disabled = true;
            sendAdminMessage.style.display = 'none';
            closeTicketButton.style.display = 'none';
        }
    });

    // Sending a message
    sendAdminMessage.onclick = async () => {
        if (!adminName) {
            alert("Admin name not available, please try again.");
            return;
        }

        const message = adminMessage.value;
        if (message.trim()) {
            await db.collection('tickets').doc(ticketId).update({
                messages: firebase.firestore.FieldValue.arrayUnion({
                    sender: 'admin',
                    message,
                    timestamp: new Date(),
                    senderName: adminName
                })
            });
            adminMessage.value = ''; // Clear input after sending
        }
    };

    // Closing a ticket
    closeTicketButton.onclick = async () => {
        await db.collection('tickets').doc(ticketId).update({ status: 'closed' });
        chatWindow.style.display = 'none'; // Hide the chat window after closing
    };
}
