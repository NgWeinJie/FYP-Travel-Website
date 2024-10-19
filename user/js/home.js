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

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    let sessionId;
    let liveChatListener = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            sessionId = user.uid;
            console.log("Authenticated user session ID:", sessionId);
        } else {
            sessionId = new Date().getTime().toString();
            console.log("Guest user session ID:", sessionId);
        }
        console.log("User sessionId: ", sessionId);
        attachEventListeners(sessionId);
    });

    function attachEventListeners(sessionId) {
        const liveChatBtn = document.getElementById('live-chat-btn');
        const chatHistoryBtn = document.getElementById('chat-history-btn');

        liveChatBtn.addEventListener('click', () => {
            console.log("Live chat button clicked.");
            switchToLiveChat(sessionId);
        });

        chatHistoryBtn.addEventListener('click', async () => {
            console.log("Chat history button clicked.");
            await switchToChatHistory(sessionId);
        });

        document.getElementById('send-chat-btn').addEventListener('click', async () => {
            const message = document.getElementById('chat-input').value;
            const imageFile = document.getElementById('chat-image-input').files[0]; // Get the selected image file
            
            if (message.trim() !== '' || imageFile) {
                console.log("Send message button clicked.");
                await createOrUpdateChatSession(sessionId);
        
                if (imageFile) {
                    // If there is an image file, upload it
                    const imageUrl = await uploadImage(sessionId, imageFile);
                    await sendMessage(sessionId, message, imageUrl);
                } else {
                    await sendMessage(sessionId, message);
                }
            }
        });

        async function uploadImage(sessionId, imageFile) {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`chat_images/${sessionId}/${imageFile.name}`);
            
            try {
                // Upload the file to Firebase Storage
                const snapshot = await fileRef.put(imageFile);
                // Get the URL of the uploaded file
                const imageUrl = await snapshot.ref.getDownloadURL();
                console.log('Uploaded image URL:', imageUrl);
                return imageUrl;
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
        

        document.getElementById('end-chat-btn').addEventListener('click', async () => {
            console.log("End chat button clicked.");
            await endChatSession(sessionId);
        });

        document.getElementById('attach-image-btn').addEventListener('click', () => {
            document.getElementById('chat-image-input').click();  // Trigger file input click
        });
    }

    let lastMessageTimestamp = null;

    function switchToLiveChat(sessionId) {
        console.log("Switching to live chat for session ID:", sessionId);
        console.log("User sessionId: ", sessionId);
    
        stopLiveChatListener(); // Stop any existing listener
        clearMessages('chat-messages'); // Clear old messages
    
        // Hide chat history and show live chat
        document.getElementById('chat-history-section').classList.add('d-none');
        document.getElementById('chat-history-section').classList.remove('active');
        document.getElementById('live-chat-section').classList.remove('d-none');
        document.getElementById('live-chat-section').classList.add('active');
    
        // Check the session status
        db.collection('chat_sessions').doc(sessionId).get().then((doc) => {
            if (doc.exists) {
                const sessionData = doc.data();
    
                if (sessionData.status === 'ended') {
                    console.log("Previous chat session is ended. Creating a new chat session.");
    
                    // Create a new chat session with a new sessionId
                    const newSessionId = new Date().getTime().toString();  // Generate a new session ID
                    createNewChatSession(newSessionId);  // Create a new session
                    sessionId = newSessionId;  // Update sessionId to the new one
                } else {
                    startLiveChatListener(sessionId);  // Continue with the active session
                }
            } else {
                createNewChatSession(sessionId);  // If no session exists, create a new one
            }
        }).catch((error) => {
            console.error("Error fetching chat session:", error);
        });
    }
    
    
    let activeSessionId = null;  // Store the active session ID globally

    async function createNewChatSession(userId) {
        const uniqueSessionId = new Date().getTime().toString();  // Generate a unique session ID
        const sessionId = `${userId}_${uniqueSessionId}`;  // Concatenate user ID and session ID
    
        console.log("Creating a new chat session for session ID:", sessionId);
    
        const sessionStartTime = firebase.firestore.FieldValue.serverTimestamp();
    
        // Create a new chat session in Firestore
        await db.collection('chat_sessions').doc(sessionId).set({
            sessionId: sessionId,
            userId: userId,
            status: 'active',
            startedAt: sessionStartTime,
            lastMessageAt: sessionStartTime
        });
    
        activeSessionId = sessionId;  // Store the active session ID globally
        return sessionId;  // Return the session ID
    }
    
    

    
    async function switchToChatHistory(sessionId) {
        console.log("Switching to chat history for session ID:", sessionId);
    
        stopLiveChatListener(); // Stop live chat listener
        clearMessages('chat-history'); // Clear chat history messages
        
        // Hide live chat and show chat history
        document.getElementById('live-chat-section').classList.add('d-none');
        document.getElementById('live-chat-section').classList.remove('active');
        document.getElementById('chat-history-section').classList.remove('d-none');
        document.getElementById('chat-history-section').classList.add('active');
        
        // Load chat history
        await loadChatHistory(sessionId);
    }
    
    
    function startLiveChatListener(sessionId) {
        console.log("Starting live chat listener for session ID:", sessionId);
    
        liveChatListener = db.collection('messages')
            .where('sessionId', '==', sessionId)
            .orderBy('timestamp')  // Order by timestamp to ensure message sequence
            .onSnapshot(snapshot => {
                console.log("Snapshot size:", snapshot.size); // Log snapshot size
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const msg = change.doc.data();
                        console.log("New message received:", msg);  // Log the received message
                        appendMessage(document.getElementById('chat-messages'), msg);  // Add message to the UI
                    }
                });
                // Auto-scroll to the latest message
                document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
            }, error => {
                console.error("Error in live chat listener: ", error);
            });
    }
    

    function stopLiveChatListener() {
        if (liveChatListener) {
            liveChatListener();
            liveChatListener = null;
        }
    }
    

    // Load the chat history messages
    async function loadChatHistory(sessionId) {
        const chatHistoryContainer = document.getElementById('chat-history');
        if (!chatHistoryContainer) {
            console.error("Chat history container not found in DOM.");
            return;
        }
    
        try {
            const snapshot = await db.collection('messages')
                .where('sessionId', '==', sessionId)
                .orderBy('timestamp', 'asc')
                .get();
    
            console.log("Chat history snapshot size:", snapshot.size);
    
            if (snapshot.empty) {
                chatHistoryContainer.textContent = 'No chat history found.';
                console.log("No chat history found for session ID:", sessionId);
                return;
            }
    
            // Clear previous content
            chatHistoryContainer.innerHTML = '';
    
            snapshot.forEach(doc => {
                const msg = doc.data();
                appendMessage(chatHistoryContainer, msg);  // Append messages to the chat history
            });
    
            chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;  // Auto-scroll to bottom
        } catch (error) {
            chatHistoryContainer.textContent = 'Unable to load chat history at the moment.';
            console.error("Error loading chat history:", error);
        }
    }
    

    async function createOrUpdateChatSession(userId) {
        // Check if an active session already exists for the user
        const chatSessions = await db.collection('chat_sessions')
            .where('status', '==', 'active')
            .where('userId', '==', userId)
            .limit(1)  // Only get the first matching session
            .get();
    
        if (!chatSessions.empty) {
            // If an active session exists, use it
            activeSessionId = chatSessions.docs[0].id;
            console.log("Reusing existing session ID:", activeSessionId);
    
            // Update the timestamp for the last message
            await db.collection('chat_sessions').doc(activeSessionId).update({
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // If no active session exists, create a new one
            activeSessionId = await createNewChatSession(userId);
        }
    
        return activeSessionId;  // Return the session ID
    }

    async function sendMessage(userId, message, imageUrl = null) {
        const sessionId = await createOrUpdateChatSession(userId);
        
        console.log("Sending message for session ID:", sessionId);
        
        const messageData = {
            text: message,
            imageUrl: imageUrl,  // Save image URL if present
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            sender: 'user',
            sessionId: sessionId,
            status: 'active'
        };
        
        // Optimistically append message to the UI
        appendMessage(document.getElementById('chat-messages'), messageData);
    
        // Send the message to Firestore
        await db.collection('messages').add(messageData);
        
        // Update the session's last message timestamp
        await db.collection('chat_sessions').doc(sessionId).update({
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Updated session's lastMessageAt successfully.");
        }).catch(error => {
            console.error("Error updating lastMessageAt: ", error);
        });
    
        // Clear the input fields
        document.getElementById('chat-input').value = '';
        document.getElementById('chat-image-input').value = '';  // Clear the file input
    }
    

    async function endChatSession() {
        if (!activeSessionId) {
            console.error('Invalid session ID:', activeSessionId);
            return;
        }
    
        console.log("Ending chat session for session ID:", activeSessionId);
    
        const chatSessionRef = db.collection('chat_sessions').doc(activeSessionId);
    
        // Check if the session document exists
        const chatSessionDoc = await chatSessionRef.get();
    
        if (!chatSessionDoc.exists) {
            console.error(`No document found for session ID: ${activeSessionId}`);
            return;  // Exit if the session document doesn't exist
        }
    
        const batch = db.batch();  // Create a batch for atomic writes
    
        // Update the chat session status to "ended"
        batch.update(chatSessionRef, {
            status: 'ended',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    
        // Get all active messages in this session and mark them as ended
        const messagesSnapshot = await db.collection('messages')
            .where('sessionId', '==', activeSessionId)
            .where('status', '==', 'active')
            .get();
    
        messagesSnapshot.forEach(doc => {
            const messageRef = db.collection('messages').doc(doc.id);
            batch.update(messageRef, { status: 'ended' });
        });
    
        // Commit the batch to Firestore
        await batch.commit();
    
        // Stop listening to live chat
        stopLiveChatListener();
        document.getElementById('chat-box').classList.add('d-none');
    }
    
    

    function updateQueueLength(sessionId) {
        console.log("Updating queue length for session ID:", sessionId);
        const queueInfoElement = document.getElementById('queue-info');

        db.collection('chat_sessions')
            .where('status', '==', 'active')
            .orderBy('lastMessageAt', 'asc')
            .onSnapshot(snapshot => {
                const sessions = snapshot.docs.map(doc => doc.data());
                const positionInQueue = sessions.findIndex(session => session.sessionId === sessionId) + 1;
                if (positionInQueue > 1) {
                    queueInfoElement.textContent = `There are ${positionInQueue - 1} user(s) ahead of you in the queue.`;
                    queueInfoElement.style.display = 'block';
                } else {
                    queueInfoElement.style.display = 'none';
                }
            }, error => {
                console.error("Error loading chat queue: ", error);
                queueInfoElement.textContent = 'Unable to load queue info at the moment.';
                queueInfoElement.style.display = 'block';
            });
    }

    // Append a message to the chat container
    function appendMessage(container, msg) {
        const msgElement = document.createElement('div');
        msgElement.classList.add('chat-message');
    
        // Log message data for debugging
        console.log('Appending message from:', msg.sender, 'Message:', msg.text);
    
        // Check if it's an image message
        if (msg.imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = msg.imageUrl;
            imgElement.alt = 'Uploaded Image';
            imgElement.style.maxWidth = '200px';
            msgElement.appendChild(imgElement);
        }
    
        // Display the message text with the correct sender prefix
        const textElement = document.createElement('p');
        const senderPrefix = msg.sender === 'user' ? 'You: ' : 'Admin: ';
        textElement.textContent = senderPrefix + msg.text;
        msgElement.appendChild(textElement);
    
        container.appendChild(msgElement);
        container.scrollTop = container.scrollHeight; // Scroll to the latest message
    }
    
    
    // Clear messages from the container
    function clearMessages(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            console.log(`Clearing messages from container: ${containerId}`);
            container.innerHTML = ''; // Clear previous messages
        } else {
            console.error(`Container with ID ${containerId} not found`);
        }
}

    let inactivityTimeout;
    function resetInactivityTimeout() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            document.getElementById('end-chat-btn').click();
        }, 600000); // 10 minutes of inactivity
    }

    document.addEventListener('mousemove', resetInactivityTimeout);
    document.addEventListener('keypress', resetInactivityTimeout);
    resetInactivityTimeout();

    // Function to create the media element
    function createMediaElement(images) {
        const fallbackIndex = 1;
        if (images.length === 0) {
            return `<img src="fallback-image-url.jpg" class="card-img-top" alt="Fallback Image">`;
        }
        const primarySrc = images[0];
        const extension = primarySrc.split('.').pop().toLowerCase();
        if (extension === 'mp4') {
            return `
                <video class="card-img-top" controls>
                    <source src="${primarySrc}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <img src="${images[fallbackIndex] || 'fallback-image-url.jpg'}" class="card-img-top fallback-image" alt="Fallback Image" style="display:none;">
            `;
        } else {
            return `<img src="${primarySrc}" class="card-img-top" alt="Attraction media">`;
        }
    }

    // Fetch and display attractions by state
    async function fetchAttractionsByState(state, containerId) {
        const container = document.getElementById(containerId);
        try {
            const snapshot = await db.collection('attractions').where('state', '==', state).get();
            if (snapshot.empty) {
                console.log(`No attractions found in ${state}.`);
                container.innerHTML = "<p>No attractions available.</p>";
                return;
            }

            let htmlContent = '';
            snapshot.forEach(async doc => {
                const data = doc.data();
                const mediaElement = createMediaElement(data.images);
                const attractionId = doc.id;

                // Create the card HTML
                const cardHTML = `
                    <div class="col-md-4 mb-4">
                        <div class="card" data-attraction-id="${attractionId}">
                            <a href="attraction_details.html?id=${attractionId}" class="card-link">
                                ${mediaElement}
                            </a>
                            <div class="card-body">
                                <h5 class="card-title">${data.destinationName}</h5>
                                <p class="card-text">From MYR ${data.ticketPriceMalaysianAdult}</p>
                                <div class="like-dislike">
                                    <button class="btn btn-light like-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>
                                    </button>
                                    <button class="btn btn-light dislike-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-down"></i> Dislike <span class="dislike-count">0</span>
                                    </button>
                                    <button class="btn btn-light favorite-button" data-attraction-id="${attractionId}">
                                        <i class="far fa-heart favorite-icon"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                htmlContent += cardHTML;

                // Update like, dislike counts, and favorite status
                await updateLikeDislikeCounts(attractionId);
                await updateFavoriteStatus(attractionId);
                await updateReactionStyles(attractionId);
            });

            container.innerHTML = htmlContent;

            // Event listeners for like, dislike, and favorite buttons
            document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
                button.addEventListener('click', handleLikeDislikeClick);
            });

            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });

            // Event delegation for card clicks
            container.addEventListener('click', event => {
                const cardLink = event.target.closest('.card-link');
                if (cardLink) {
                    // Navigate to the details page
                    window.location.href = cardLink.href;
                }
            });

        } catch (error) {
            console.error(`Error fetching attractions for ${state}: `, error);
            container.innerHTML = "<p>Error loading attractions. Please try again later.</p>";
        }
    }

    // Handle like and dislike button clicks
    async function handleLikeDislikeClick(event) {
        event.stopPropagation(); // Prevent click from navigating to the details page
        const button = event.currentTarget;
        const attractionId = button.getAttribute('data-attraction-id');
        const isLike = button.classList.contains('like-button');
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (!userId) {
            alert('You must be logged in to like or dislike attractions.');
            return;
        }

        const userReactionRef = db.collection('user_reactions').doc(`${userId}_${attractionId}`);
        const attractionRef = db.collection('attractions').doc(attractionId);

        try {
            const userReactionDoc = await userReactionRef.get();
            if (userReactionDoc.exists) {
                // User has already reacted; toggle reaction
                const currentReaction = userReactionDoc.data().reaction;
                if (currentReaction === (isLike ? 'like' : 'dislike')) {
                    // Remove reaction
                    await userReactionRef.delete();
                    await updateLikeDislikeCounts(attractionId, isLike, -1);
                } else {
                    // Update reaction
                    await userReactionRef.update({
                        reaction: isLike ? 'like' : 'dislike'
                    });
                    await updateLikeDislikeCounts(attractionId, isLike, 1);
                    await updateLikeDislikeCounts(attractionId, !isLike, -1);
                }
            } else {
                // Add new reaction
                await userReactionRef.set({
                    reaction: isLike ? 'like' : 'dislike',
                    attractionId: attractionId // Store attraction ID for reference
                });
                await updateLikeDislikeCounts(attractionId, isLike, 1);
            }

            // Update button styles and counts
            await updateReactionStyles(attractionId);
            await updateLikeDislikeCounts(attractionId);

        } catch (error) {
            console.error("Error handling like/dislike: ", error);
        }
    }

    // Handle favorite button click
    async function handleFavoriteClick(event) {
        event.stopPropagation(); // Prevent click from navigating to the details page
        const button = event.currentTarget;
        const attractionId = button.getAttribute('data-attraction-id');
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (!userId) {
            alert('You must be logged in to add to favorites.');
            return;
        }

        const favoriteRef = db.collection('user_favorites').doc(`${userId}_${attractionId}`);

        try {
            const favoriteDoc = await favoriteRef.get();
            const card = document.querySelector(`.card[data-attraction-id="${attractionId}"]`);
            const favoriteIcon = card.querySelector('.favorite-icon');

            if (favoriteDoc.exists) {
                // Remove from favorites
                await favoriteRef.delete();
                favoriteIcon.classList.remove('fas');
                favoriteIcon.classList.add('far');
                button.classList.remove('active'); // Remove active class from button
            } else {
                // Add to favorites
                await favoriteRef.set({
                    attractionId: attractionId,
                    userId: userId
                });
                favoriteIcon.classList.remove('far');
                favoriteIcon.classList.add('fas');
                button.classList.add('active'); // Add active class to button
            }

        } catch (error) {
            console.error("Error handling favorite: ", error);
        }
    }

    // Update like and dislike counts
    async function updateLikeDislikeCounts(attractionId, isLike = null, change = 0) {
        const userReactionsRef = db.collection('user_reactions');
        
        try {
            // Calculate total likes or dislikes
            const likeSnapshot = await userReactionsRef.where('reaction', '==', 'like').where('attractionId', '==', attractionId).get();
            const dislikeSnapshot = await userReactionsRef.where('reaction', '==', 'dislike').where('attractionId', '==', attractionId).get();

            const likeCount = likeSnapshot.size;
            const dislikeCount = dislikeSnapshot.size;

            // Update UI
            document.querySelector(`.card[data-attraction-id="${attractionId}"] .like-count`).textContent = likeCount;
            document.querySelector(`.card[data-attraction-id="${attractionId}"] .dislike-count`).textContent = dislikeCount;
        } catch (error) {
            console.error("Error updating like/dislike counts: ", error);
        }
    }

    // Update the styles of like and dislike buttons based on user's reaction
    async function updateReactionStyles(attractionId) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        const userReactionRef = db.collection('user_reactions').doc(`${userId}_${attractionId}`);
        
        try {
            const userReactionDoc = await userReactionRef.get();
            const card = document.querySelector(`.card[data-attraction-id="${attractionId}"]`);
            if (userReactionDoc.exists) {
                const reaction = userReactionDoc.data().reaction;
                if (reaction === 'like') {
                    card.querySelector('.like-button').classList.add('active');
                    card.querySelector('.dislike-button').classList.remove('active');
                } else if (reaction === 'dislike') {
                    card.querySelector('.like-button').classList.remove('active');
                    card.querySelector('.dislike-button').classList.add('active');
                }
            } else {
                card.querySelector('.like-button').classList.remove('active');
                card.querySelector('.dislike-button').classList.remove('active');
            }
        } catch (error) {
            console.error("Error updating button styles: ", error);
        }
    }

    // Update favorite icon based on user's favorite status
    async function updateFavoriteStatus(attractionId) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        const favoriteRef = db.collection('user_favorites').doc(`${userId}_${attractionId}`);
        
        try {
            const favoriteDoc = await favoriteRef.get();
            const card = document.querySelector(`.card[data-attraction-id="${attractionId}"]`);
            const favoriteIcon = card.querySelector('.favorite-icon');
            const favoriteButton = card.querySelector('.favorite-button');
            if (favoriteDoc.exists) {
                favoriteIcon.classList.add('fas');
                favoriteIcon.classList.remove('far');
                favoriteButton.classList.add('active'); // Add active class if in favorites
            } else {
                favoriteIcon.classList.add('far');
                favoriteIcon.classList.remove('fas');
                favoriteButton.classList.remove('active'); // Remove active class if not in favorites
            }
        } catch (error) {
            console.error("Error updating favorite status: ", error);
        }
    }

    // Scroll to the specified section
    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    const kualaLumpurLink = document.getElementById('kuala-lumpur-link');
    if (kualaLumpurLink) {
        kualaLumpurLink.addEventListener('click', () => {
            scrollToSection('kuala-lumpur-section');
        });
    }

    const penangLink = document.getElementById('penang-link');
    if (penangLink) {
        penangLink.addEventListener('click', () => {
            scrollToSection('penang-section');
        });
    }

    // Fetch attractions on page load
    fetchAttractionsByState('KL', 'kuala-lumpur-attractions');
    fetchAttractionsByState('Penang', 'penang-attractions');
    getRecommendations();

    // Fetch recommendations for the user
    async function getRecommendations() {
        try {
            // Fetch all attractions
            const attractionsData = await fetchAllAttractions();
    
            // Fetch ticket sales data
            const salesData = await fetchTicketSalesData(attractionsData);
    
            // Process sales data to determine the most popular attractions
            const { topAttractions } = processSalesData(salesData);
    
            const recommendationsContainer = document.getElementById('recommendations');
            if (topAttractions.length === 0) {
                console.log('No popular attractions found.');
                recommendationsContainer.innerHTML = "<p>No recommendations available.</p>";
                return;
            }
    
            // Generate HTML for the top attractions
            let htmlContent = '';
            topAttractions.forEach(attraction => {
                const attractionId = attraction[0]; // Attraction ID
                const attractionData = attractionsData[attractionId]; // Get the corresponding attraction data
                const mediaElement = createMediaElement(attractionData.images); // Media element (image or video)
    
                // Create the card HTML
                const cardHTML = `
                    <div class="col-md-4 mb-4">
                        <div class="card" data-attraction-id="${attractionId}">
                            <a href="attraction_details.html?id=${attractionId}" class="card-link">
                                ${mediaElement}
                            </a>
                            <div class="card-body">
                                <h5 class="card-title">${attractionData.destinationName}</h5>
                                <p class="card-text">From MYR ${attractionData.ticketPriceMalaysianAdult}</p>
                                <div class="like-dislike">
                                    <button class="btn btn-light like-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>
                                    </button>
                                    <button class="btn btn-light dislike-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-down"></i> Dislike <span class="dislike-count">0</span>
                                    </button>
                                    <button class="btn btn-light favorite-button" data-attraction-id="${attractionId}">
                                        <i class="far fa-heart favorite-icon"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                htmlContent += cardHTML;
            });
    
            recommendationsContainer.innerHTML = htmlContent;
    
            // Add event listeners for like, dislike, and favorite buttons
            document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
                button.addEventListener('click', handleLikeDislikeClick);
            });
    
            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });
    
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            const recommendationsContainer = document.getElementById('recommendations');
            recommendationsContainer.innerHTML = "<p>Error loading recommendations. Please try again later.</p>";
        }
    }

    // Fetch all attractions data
    async function fetchAllAttractions() {
        const attractionsSnapshot = await db.collection('attractions').get();
        const attractionsData = {};
        attractionsSnapshot.forEach(doc => {
            attractionsData[doc.id] = doc.data();
        });
        return attractionsData;
    }

    // Fetch ticket sales data and link to attractions
    async function fetchTicketSalesData(attractionsData) {
        const ordersSnapshot = await db.collection('orders').get();
        const salesData = [];

        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            const processedItems = [];

            orderData.items.forEach(item => {
                const attractionData = attractionsData[item.attractionId];
                if (attractionData) {
                    processedItems.push({
                        ...item,
                        state: attractionData.state
                    });
                }
            });

            salesData.push({
                ...orderData,
                items: processedItems
            });
        });

        return salesData;
    }

    // Process sales data to determine the most popular attractions
    function processSalesData(salesData) {
        const attractionSales = {};

        salesData.forEach(order => {
            order.items.forEach(item => {
                const { attractionId, quantity } = item;
                if (!attractionSales[attractionId]) {
                    attractionSales[attractionId] = 0;
                }
                attractionSales[attractionId] += quantity; // Accumulate tickets sold
            });
        });

        // Sort attractions by number of tickets sold
        const topAttractions = Object.entries(attractionSales)
            .sort(([, a], [, b]) => b - a) // Sort by quantity sold
            .slice(0, 3); // Take top 3 attractions

        return { topAttractions };
    }


    // Normalize string for search
    function normalizeString(str) {
        return str.trim().toLowerCase().replace(/\s+/g, '');
    }

    // Search for attractions
    async function searchAttractions(query) {
        const searchResultsSection = document.getElementById('search-results-section');
        const searchResultsContainer = document.getElementById('search-results');
        const recommendationsSection = document.getElementById('recommendations-section');
        const kualaLumpurSection = document.getElementById('kuala-lumpur-section');
        const penangSection = document.getElementById('penang-section');
        const promotionSlide = document.getElementById('promotion-slide'); // Reference to the promotion slide
    
        if (!query) {
            searchResultsSection.style.display = 'none';
            recommendationsSection.style.display = 'block';
            kualaLumpurSection.style.display = 'block';
            penangSection.style.display = 'block';
            promotionSlide.style.display = 'block'; // Show promotion slide if no query
            return;
        }
    
        searchResultsSection.style.display = 'block';
        recommendationsSection.style.display = 'none';
        kualaLumpurSection.style.display = 'none';
        penangSection.style.display = 'none';
        promotionSlide.style.display = 'none'; // Hide promotion slide when searching
        searchResultsContainer.innerHTML = ""; // Clear previous search results
    
        const normalizedQuery = normalizeString(query);
    
        try {
            const snapshot = await db.collection('attractions').get();
    
            const searchResults = snapshot.docs.filter(doc => {
                const data = doc.data();
                const normalizedDestinationName = normalizeString(data.destinationName);
                return normalizedDestinationName.includes(normalizedQuery);
            });
    
            if (searchResults.length === 0) {
                console.log('No search results found.');
                searchResultsContainer.innerHTML = "<p>No search results found.</p>";
                return;
            }
    
            let htmlContent = '';
            searchResults.forEach(doc => {
                const data = doc.data();
                const mediaElement = createMediaElement(data.images);
                const attractionId = doc.id;
    
                const cardHTML = `
                    <div class="col-md-4 mb-4">
                        <div class="card" data-attraction-id="${attractionId}">
                            <a href="attraction_details.html?id=${attractionId}" class="card-link">
                                ${mediaElement}
                            </a>
                            <div class="card-body">
                                <h5 class="card-title">${data.destinationName}</h5>
                                <p class="card-text">From MYR ${data.ticketPriceMalaysianAdult}</p>
                                <div class="like-dislike">
                                    <button class="btn btn-light like-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>
                                    </button>
                                    <button class="btn btn-light dislike-button" data-attraction-id="${attractionId}">
                                        <i class="fas fa-thumbs-down"></i> Dislike <span class="dislike-count">0</span>
                                    </button>
                                    <button class="btn btn-light favorite-button" data-attraction-id="${attractionId}">
                                        <i class="far fa-heart favorite-icon"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                htmlContent += cardHTML;
            });
    
            searchResultsContainer.innerHTML = htmlContent;
    
            // Add event listeners for like, dislike, and favorite buttons in search results
            document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
                button.addEventListener('click', handleLikeDislikeClick);
            });
    
            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });
    
        } catch (error) {
            console.error("Error searching attractions: ", error);
            searchResultsContainer.innerHTML = "<p>Error loading search results. Please try again later.</p>";
        }
    }

    // Handle search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            searchAttractions(query);
        });
    }

    // User chat widget toggle
    document.getElementById('open-chat-btn').addEventListener('click', () => {
        document.getElementById('chat-box').classList.toggle('d-none');
    });

// Fetch and display the promotion slide
async function loadPromotionSlide() {
    try {
        const promotionsRef = db.collection('promotions');
        const promotionSnapshot = await promotionsRef.get(); // Fetch all promotion slides

        if (!promotionSnapshot.empty) {
            let slideContent = '';
            let isActive = true;
            let validSlidesCount = 0;

            const currentTime = new Date(); // Get current time

            promotionSnapshot.forEach((doc) => {
                const promotionData = doc.data();
                const slideImageUrl = promotionData.slideImageUrl;
                const endDateTime = promotionData.endDateTime ? new Date(promotionData.endDateTime.toDate()) : null;

                // Check if endDateTime is not present or has not passed
                if (!endDateTime || endDateTime > currentTime) {
                    slideContent += `
                        <div class="carousel-item ${isActive ? 'active' : ''}">
                            <img src="${slideImageUrl}" class="d-block w-100" alt="Promotion Slide">
                        </div>
                    `;
                    isActive = false; // Only the first slide should be active
                    validSlidesCount++; // Count valid slides
                }
            });

            if (validSlidesCount > 0) {
                // Insert the slides into the carousel
                const carouselItemsContainer = document.getElementById('carouselItems');
                carouselItemsContainer.innerHTML = slideContent;

                const promotionCarousel = document.getElementById('promotionCarousel');
                if (validSlidesCount > 1) {
                    // Enable auto-scroll if more than one slide
                    $(promotionCarousel).carousel({
                        interval: 5000 // 5 seconds interval
                    });
                }
            } else {
                // Hide the carousel if no valid slides
                document.getElementById('promotion-slide').style.display = 'none';
            }
        } else {
            // Hide the carousel if there are no slides at all
            document.getElementById('promotion-slide').style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading promotion slide:", error);
        document.getElementById('promotion-slide').style.display = 'none'; // Hide in case of error
    }
}

// Call the function to load the promotion slide
loadPromotionSlide();

});

// Show the Back to Top button when the user scrolls down
window.onscroll = function() { scrollFunction(); };

function scrollFunction() {
    const backToTopButton = document.getElementById("backToTop");
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
}

// Scroll to top when the button is clicked
document.getElementById("backToTop").addEventListener("click", function() {
    window.scrollTo({top: 0, behavior: 'smooth'});
});
