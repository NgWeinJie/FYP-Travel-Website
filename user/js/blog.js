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
const storage = firebase.storage();

document.getElementById('postButton').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to post.');
        return;
    }

    const content = document.getElementById('postContent').value;
    if (!content) {
        alert('Please enter some content.');
        return;
    }

    const files = document.getElementById('postMedia').files;
    const mediaUrls = [];
    for (const file of files) {
        const fileRef = storage.ref().child(`blogs/${Date.now()}_${file.name}`);
        await fileRef.put(file);
        const url = await fileRef.getDownloadURL();
        mediaUrls.push(url);
    }

    const post = {
        userId: user.uid,
        content,
        timestamp: firebase.firestore.Timestamp.now(),
        mediaUrls,
        comments: []
    };

    try {
        await db.collection('blogs').add(post);
        document.getElementById('postContent').value = '';
        document.getElementById('postMedia').value = '';
        fetchPosts();
    } catch (error) {
        console.error("Error adding post: ", error);
        alert('Failed to post. Please try again later.');
    }
});

async function createMediaElement(mediaUrls) {
    let mediaHTML = '';
    const count = mediaUrls.length;

    if (count === 1) {
        mediaHTML = `<div class="single-img-container"><img src="${mediaUrls[0]}" class="img-fluid single-img" alt="Media Image"></div>`;
    } else if (count === 2) {
        mediaHTML = `
            <div class="row img-row">
                <div class="col-6"><img src="${mediaUrls[0]}" class="img-fluid" alt="Media Image"></div>
                <div class="col-6"><img src="${mediaUrls[1]}" class="img-fluid" alt="Media Image"></div>
            </div>`;
    } else if (count === 3) {
        mediaHTML = `
            <div class="row img-row">
                <div class="col-12"><img src="${mediaUrls[0]}" class="img-fluid" alt="Media Image"></div>
            </div>
            <div class="row img-row">
                <div class="col-6"><img src="${mediaUrls[1]}" class="img-fluid" alt="Media Image"></div>
                <div class="col-6"><img src="${mediaUrls[2]}" class="img-fluid" alt="Media Image"></div>
            </div>`;
    } else if (count === 4) {
        mediaHTML = `
            <div class="row img-row">
                <div class="col-6"><img src="${mediaUrls[0]}" class="img-fluid" alt="Media Image"></div>
                <div class="col-6"><img src="${mediaUrls[1]}" class="img-fluid" alt="Media Image"></div>
            </div>
            <div class="row img-row">
                <div class="col-6"><img src="${mediaUrls[2]}" class="img-fluid" alt="Media Image"></div>
                <div class="col-6"><img src="${mediaUrls[3]}" class="img-fluid" alt="Media Image"></div>
            </div>`;
    }

    return mediaHTML;
}

async function createPostElement(post) {
    const date = post.timestamp.toDate();
    const userDoc = await db.collection('users').doc(post.userId).get();
    const userName = userDoc.exists ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User';
    const userAvatar = userDoc.exists ? userDoc.data().avatarUrl || '../image/avatar.jpg' : '../image/avatar.jpg';
    return `
        <div class="card mb-4">
            <div class="card-body">
                <div class="media mb-3">
                    <img src="${userAvatar}" class="mr-3 rounded-circle avatar" alt="User Avatar">
                    <div class="media-body">
                        <h5>${userName} <small>${date.toLocaleString()}</small></h5>
                    </div>
                </div>
                <p class="card-text">${post.content}</p>
                ${await createMediaElement(post.mediaUrls)}
                <button class="btn btn-sm btn-link comment-button" data-post-id="${post.id}">Comment</button>
                <div class="comments ml-4">
                    ${post.comments.map(comment => createCommentElement(comment)).join('')}
                </div>
            </div>
        </div>
    `;
}

function createCommentElement(comment) {
    const date = comment.timestamp.toDate();
    return `
        <div class="media mt-3">
            <img src="${comment.userAvatar || '../image/avatar.jpg'}" class="mr-3 rounded-circle avatar" alt="User Avatar">
            <div class="media-body">
                <h6>${comment.userName} <small>${date.toLocaleString()}</small></h6>
                <p>${comment.content}</p>
            </div>
        </div>
    `;
}

async function fetchPosts() {
    const postsSnapshot = await db.collection('blogs').orderBy('timestamp', 'desc').get();
    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const postsHTML = await Promise.all(posts.map(post => createPostElement(post)));
    document.getElementById('posts').innerHTML = postsHTML.join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();

    document.getElementById('posts').addEventListener('click', event => {
        if (event.target.classList.contains('comment-button')) {
            const postId = event.target.dataset.postId;
            const commentContent = prompt('Enter your comment:');
            if (commentContent) {
                addComment(postId, commentContent);
            }
        }
    });
});

async function addComment(postId, content) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to comment.');
        return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        alert('User information not found.');
        return;
    }

    const { firstName, lastName, avatarUrl } = userDoc.data();

    const comment = {
        userName: `${firstName} ${lastName}`,
        userAvatar: avatarUrl || '../image/avatar.jpg',
        content,
        timestamp: firebase.firestore.Timestamp.now()
    };

    try {
        const postRef = db.collection('blogs').doc(postId);
        await postRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(comment)
        });
        fetchPosts();
    } catch (error) {
        console.error("Error adding comment: ", error);
        alert('Failed to add comment. Please try again later.');
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('No user logged in.');
    }
});
