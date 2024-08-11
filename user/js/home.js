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
        attachEventListeners(sessionId);
    });

    function attachEventListeners(sessionId) {
        const liveChatBtn = document.getElementById('live-chat-btn');
        const chatHistoryBtn = document.getElementById('chat-history-btn');
        const liveChatSection = document.getElementById('live-chat-section');
        const chatHistorySection = document.getElementById('chat-history-section');

        liveChatBtn.addEventListener('click', () => {
            console.log("Live Chat button clicked.");
            switchToLiveChat(sessionId);
        });

        chatHistoryBtn.addEventListener('click', async () => {
            console.log("Chat History button clicked.");
            await switchToChatHistory(sessionId);
        });

        document.getElementById('send-chat-btn').addEventListener('click', async () => {
            const message = document.getElementById('chat-input').value;
            if (message.trim() !== '') {
                await createOrUpdateChatSession(sessionId);
                await sendMessage(sessionId, message);
            }
        });

        document.getElementById('end-chat-btn').addEventListener('click', async () => {
            await endChatSession(sessionId);
        });
    }

    function switchToLiveChat(sessionId) {
        stopLiveChatListener(); 
        clearMessages('chat-messages'); 

        const liveChatSection = document.getElementById('live-chat-section');
        const chatHistorySection = document.getElementById('chat-history-section');
        liveChatSection.classList.add('active');
        chatHistorySection.classList.remove('active');
        liveChatSection.style.display = 'block';
        chatHistorySection.style.display = 'none';

        startLiveChatListener(sessionId); 
    }

    async function switchToChatHistory(sessionId) {
        stopLiveChatListener(); 
        clearMessages('chat-history'); 

        const liveChatSection = document.getElementById('live-chat-section');
        const chatHistorySection = document.getElementById('chat-history-section');
        liveChatSection.classList.remove('active');
        chatHistorySection.classList.add('active');
        liveChatSection.style.display = 'none';
        chatHistorySection.style.display = 'block';

        await loadChatHistory(sessionId); 
    }

    function startLiveChatListener(sessionId) {
        const chatMessages = document.getElementById('chat-messages');

        liveChatListener = db.collection('messages')
            .where('sessionId', '==', sessionId)
            .orderBy('timestamp')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const msg = change.doc.data();
                        appendMessage(chatMessages, msg);
                    }
                });
            });
    }

    function stopLiveChatListener() {
        if (liveChatListener) {
            liveChatListener(); 
        }
    }

    async function loadChatHistory(sessionId) {
        const chatHistoryContainer = document.getElementById('chat-history');

        try {
            const snapshot = await db.collection('messages')
                                     .where('sessionId', '==', sessionId)
                                     .orderBy('timestamp', 'asc')
                                     .get();

            if (snapshot.empty) {
                console.log("No chat history found for session:", sessionId);
                chatHistoryContainer.textContent = 'No chat history found.';
                return;
            }

            snapshot.forEach(doc => {
                const msg = doc.data();
                appendMessage(chatHistoryContainer, msg);
            });

        } catch (error) {
            console.error("Error loading chat history for session:", sessionId, "Error:", error);
            chatHistoryContainer.textContent = 'Unable to load chat history at the moment.';
        }
    }

    async function createOrUpdateChatSession(sessionId) {
        const chatSessionRef = db.collection('chat_sessions').doc(sessionId);
        const chatSessionDoc = await chatSessionRef.get();

        if (!chatSessionDoc.exists) {
            await chatSessionRef.set({
                sessionId: sessionId,
                status: 'active',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await chatSessionRef.update({
                status: 'active',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    async function sendMessage(sessionId, message) {
        await db.collection('messages').add({
            text: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            sender: 'user',
            sessionId: sessionId
        });
        document.getElementById('chat-input').value = '';
        updateQueueLength(sessionId);
    }

    async function endChatSession(sessionId) {
        await db.collection('chat_sessions').doc(sessionId).update({
            status: 'ended',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('chat-box').classList.add('d-none');
        stopLiveChatListener(); 
    }

    function updateQueueLength(sessionId) {
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

    function appendMessage(container, msg) {
        const msgElement = document.createElement('div');
        msgElement.classList.add('chat-message');
        msgElement.textContent = msg.sender === 'user' 
            ? `You: ${msg.text}` 
            : `Admin: ${msg.text}`;
        container.appendChild(msgElement);
        container.scrollTop = container.scrollHeight;
    }

    function clearMessages(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    let inactivityTimeout;
    function resetInactivityTimeout() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            document.getElementById('end-chat-btn').click();
        }, 600000);
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
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        try {
            // Fetch user's favorite attractions
            const userFavoritesSnapshot = await db.collection('user_favorites').where('userId', '==', userId).get();
            const favoriteAttractionIds = userFavoritesSnapshot.docs.map(doc => doc.data().attractionId);

            // If no favorites, recommend popular attractions
            if (favoriteAttractionIds.length === 0) {
                recommendPopularAttractions();
                return;
            }

            // Fetch details of favorite attractions
            const favoriteAttractions = await Promise.all(favoriteAttractionIds.map(async id => {
                const attractionDoc = await db.collection('attractions').doc(id).get();
                return attractionDoc.data();
            }));

            // Recommend similar attractions based on favorites
            recommendSimilarAttractions(favoriteAttractions);
        } catch (error) {
            console.error("Error fetching recommendations: ", error);
        }
    }

    // Recommend popular attractions
    async function recommendPopularAttractions() {
        try {
            const snapshot = await db.collection('attractions').orderBy('popularity', 'desc').limit(5).get();
            const recommendationsContainer = document.getElementById('recommendations');

            if (snapshot.empty) {
                console.log('No popular attractions found.');
                recommendationsContainer.innerHTML = "<p>No recommendations available.</p>";
                return;
            }

            let htmlContent = '';
            snapshot.forEach(doc => {
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

            recommendationsContainer.innerHTML = htmlContent;

            // Event listeners for like, dislike, and favorite buttons
            document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
                button.addEventListener('click', handleLikeDislikeClick);
            });

            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });

        } catch (error) {
            console.error("Error recommending popular attractions: ", error);
        }
    }

    // Recommend similar attractions based on user's favorites
    async function recommendSimilarAttractions(favoriteAttractions) {
        try {
            const recommendationsContainer = document.getElementById('recommendations');
            recommendationsContainer.innerHTML = ""; // Clear previous recommendations

            // Fetch similar attractions (for simplicity, recommending other attractions in the same state)
            const favoriteStates = [...new Set(favoriteAttractions.map(attraction => attraction.state))];
            const similarAttractionsSnapshot = await db.collection('attractions').where('state', 'in', favoriteStates).limit(5).get();

            if (similarAttractionsSnapshot.empty) {
                console.log('No similar attractions found.');
                recommendationsContainer.innerHTML = "<p>No recommendations available.</p>";
                return;
            }

            let htmlContent = '';
            similarAttractionsSnapshot.forEach(doc => {
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

            recommendationsContainer.innerHTML = htmlContent;

            // Event listeners for like, dislike, and favorite buttons
            document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
                button.addEventListener('click', handleLikeDislikeClick);
            });

            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });

        } catch (error) {
            console.error("Error recommending similar attractions: ", error);
        }
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

        if (!query) {
            searchResultsSection.style.display = 'none';
            recommendationsSection.style.display = 'block';
            kualaLumpurSection.style.display = 'block';
            penangSection.style.display = 'block';
            return;
        }

        searchResultsSection.style.display = 'block';
        recommendationsSection.style.display = 'none';
        kualaLumpurSection.style.display = 'none';
        penangSection.style.display = 'none';
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
});
