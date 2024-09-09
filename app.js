// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDtvLoOcHidUSwnbDHMWn89VLOck3Ap5QE",
    authDomain: "raw-upload-app.firebaseapp.com",
    projectId: "raw-upload-app",
    storageBucket: "raw-upload-app.appspot.com",
    messagingSenderId: "664365885134",
    appId: "1:664365885134:web:7fbd81e390bcd00a22129f",
    measurementId: "G-BB49BK4YZV"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// App state
let currentUser = null;
let currentPage = 'login';

// DOM elements
const app = document.getElementById('app');

// Router
function navigate(page) {
    currentPage = page;
    renderApp();
}

// Render function
function renderApp() {
    let content = '';

    if (currentUser) {
        content += `
            <nav>
                <ul>
                    <li><a href="#" onclick="navigate('upload')">Upload Raw Image</a></li>
                    <li><a href="#" onclick="navigate('edit')">Upload Edit</a></li>
                    <li><a href="#" onclick="navigate('gallery')">Gallery</a></li>
                    <li><a href="#" onclick="logout()">Logout</a></li>
                </ul>
            </nav>
        `;

        switch (currentPage) {
            case 'upload':
                content += renderUploadPage();
                break;
            case 'edit':
                content += renderEditPage();
                break;
            case 'gallery':
                content += renderGalleryPage();
                break;
            default:
                content += renderUploadPage();
        }
    } else {
        content += renderLoginPage();
    }

    app.innerHTML = content;
}

// Login page
function renderLoginPage() {
    return `
        <div class="container">
            <h1>Login / Sign Up</h1>
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button onclick="login()">Login</button>
            <button onclick="signup()">Sign Up</button>
            <p id="auth-message"></p>
        </div>
    `;
}

// Upload page
function renderUploadPage() {
    return `
        <div class="container">
            <h2>Upload Raw Image</h2>
            <input type="file" id="raw-image" accept=".raw,.arw,.cr2,.nef" required>
            <input type="text" id="image-title" placeholder="Image Title" required>
            <button onclick="uploadRawImage()">Upload</button>
            <p id="upload-message"></p>
        </div>
    `;
}

// Edit page
function renderEditPage() {
    return `
        <div class="container">
            <h2>Upload Edit</h2>
            <input type="file" id="edited-image" accept="image/*" required>
            <input type="text" id="original-image-id" placeholder="Original Image ID" required>
            <input type="text" id="editor-name" placeholder="Your Name" required>
            <button onclick="uploadEdit()">Upload Edit</button>
            <p id="edit-message"></p>
        </div>
    `;
}

// Gallery page
function renderGalleryPage() {
    return `
        <div class="container">
            <h2>Image Gallery</h2>
            <div id="image-grid" class="image-grid"></div>
            <div class="pagination">
                <button onclick="changePage(-1)">Previous</button>
                <button onclick="changePage(1)">Next</button>
            </div>
        </div>
    `;
}

// Authentication functions
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('auth-message');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            authMessage.textContent = 'Login successful!';
            authMessage.className = 'success';
            navigate('upload');
        })
        .catch((error) => {
            authMessage.textContent = `Error: ${error.message}`;
            authMessage.className = 'error';
        });
}

function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('auth-message');

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            authMessage.textContent = 'Sign up successful!';
            authMessage.className = 'success';
            navigate('upload');
        })
        .catch((error) => {
            authMessage.textContent = `Error: ${error.message}`;
            authMessage.className = 'error';
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            navigate('login');
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

// Upload functions
function uploadRawImage() {
    const fileInput = document.getElementById('raw-image');
    const titleInput = document.getElementById('image-title');
    const uploadMessage = document.getElementById('upload-message');

    if (fileInput.files.length === 0 || !titleInput.value) {
        uploadMessage.textContent = 'Please select a file and enter a title.';
        uploadMessage.className = 'error';
        return;
    }

    const file = fileInput.files[0];
    const title = titleInput.value;
    const fileName = `${Date.now()}_${file.name}`;

    const storageRef = storage.ref(`raw_images/${fileName}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress function
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadMessage.textContent = `Upload is ${progress.toFixed(2)}% done`;
        },
        (error) => {
            // Error function
            uploadMessage.textContent = `Upload failed: ${error.message}`;
            uploadMessage.className = 'error';
        },
        () => {
            // Complete function
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                db.collection('raw_images').add({
                    title: title,
                    url: downloadURL,
                    uploadedBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    uploadMessage.textContent = 'Upload successful!';
                    uploadMessage.className = 'success';
                    fileInput.value = '';
                    titleInput.value = '';
                })
                .catch((error) => {
                    uploadMessage.textContent = `Database error: ${error.message}`;
                    uploadMessage.className = 'error';
                });
            });
        }
    );
}

function uploadEdit() {
    const fileInput = document.getElementById('edited-image');
    const originalImageIdInput = document.getElementById('original-image-id');
    const editorNameInput = document.getElementById('editor-name');
    const editMessage = document.getElementById('edit-message');

    if (fileInput.files.length === 0 || !originalImageIdInput.value || !editorNameInput.value) {
        editMessage.textContent = 'Please fill in all fields and select a file.';
        editMessage.className = 'error';
        return;
    }

    const file = fileInput.files[0];
    const originalImageId = originalImageIdInput.value;
    const editorName = editorNameInput.value;
    const fileName = `${Date.now()}_${file.name}`;

    const storageRef = storage.ref(`edited_images/${fileName}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress function
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            editMessage.textContent = `Upload is ${progress.toFixed(2)}% done`;
        },
        (error) => {
            // Error function
            editMessage.textContent = `Upload failed: ${error.message}`;
            editMessage.className = 'error';
        },
        () => {
            // Complete function
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                db.collection('edited_images').add({
                    originalImageId: originalImageId,
                    url: downloadURL,
                    editorName: editorName,
                    uploadedBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    editMessage.textContent = 'Edit upload successful!';
                    editMessage.className = 'success';
                    fileInput.value = '';
                    originalImageIdInput.value = '';
                    editorNameInput.value = '';
                })
                .catch((error) => {
                    editMessage.textContent = `Database error: ${error.message}`;
                    editMessage.className = 'error';
                });
            });
        }
    );
}



// Gallery functions
let currentGalleryPage = 1;
const imagesPerPage = 12;

function loadGalleryImages() {
    const imageGrid = document.getElementById('image-grid');
    imageGrid.innerHTML = 'Loading...';

    db.collection('raw_images')
        .orderBy('createdAt', 'desc')
        .limit(imagesPerPage)
        .get()
        .then((querySnapshot) => {
            imageGrid.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const imageData = doc.data();
                const imageElement = document.createElement('div');
                imageElement.className = 'image-item';
                imageElement.innerHTML = `
                    <img src="${imageData.url}" alt="${imageData.title}">
                    <p>${imageData.title}</p>
                    <p>ID: ${doc.id}</p>
                    <button onclick="downloadImage('${imageData.url}', '${imageData.title}')">Download</button>
                `;
                imageGrid.appendChild(imageElement);
            });
        })
        .catch((error) => {
            imageGrid.innerHTML = `Error loading images: ${error.message}`;
        });
}

function downloadImage(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(error => {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        });
}

function changePage(direction) {
    currentGalleryPage += direction;
    if (currentGalleryPage < 1) currentGalleryPage = 1;
    loadGalleryImages();
}



// Event listeners
auth.onAuthStateChanged((user) => {
    currentUser = user;
    renderApp();
    if (user && currentPage === 'gallery') {
        loadGalleryImages();
    }
});

// Initial render
renderApp();
