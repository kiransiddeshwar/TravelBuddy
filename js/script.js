// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// IMPORTANT: Paste your REAL keys here from your Firebase Console!
const firebaseConfig = {
    apiKey: "PASTE_YOUR_ACTUAL_KEY_HERE",
    authDomain: "PASTE_YOUR_ACTUAL_DOMAIN_HERE",
    projectId: "PASTE_YOUR_ACTUAL_ID_HERE",
    storageBucket: "PASTE_YOUR_ACTUAL_BUCKET_HERE",
    messagingSenderId: "PASTE_YOUR_ACTUAL_SENDER_ID_HERE",
    appId: "PASTE_YOUR_ACTUAL_APP_ID_HERE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. APP NAVIGATION LOGIC
// ==========================================
function goToPage(pageId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    const target = document.getElementById(pageId);
    target.classList.add('active');
    target.style.display = 'block';

    const backBtn = document.getElementById('back-btn');
    if (pageId === 'page-login' || pageId === 'page-dashboard') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'inline-block';
    }
}

// ==========================================
// 3. SECURE LINK AUTHENTICATION LOGIC
// ==========================================
function sendMagicLink(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const btn = document.getElementById('login-btn');
    
    btn.innerText = "Sending...";
    btn.disabled = true;

    const actionCodeSettings = {
        url: 'https://kiransiddeshwar.github.io/TravelBuddy/', 
        handleCodeInApp: true,
    };

    auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(() => {
            window.localStorage.setItem('emailForSignIn', email);
            // Updated terminology here:
            alert('Secure link sent! Check your email inbox (and spam folder) to log in.');
            btn.innerText = "Check your email!";
        })
        .catch((error) => {
            console.error("Error sending link", error);
            alert("Oops! " + error.message);
            btn.innerText = "Send Secure Link"; // Updated terminology
            btn.disabled = false;
        });
}

function checkLoginOnLoad() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Please confirm your email address to complete sign-in:');
        }
        
        auth.signInWithEmailLink(email, window.location.href)
            .then((result) => {
                window.localStorage.removeItem('emailForSignIn'); 
                alert("Successfully logged in!");
                goToPage('page-dashboard');
            })
            .catch((error) => {
                console.error("Error signing in", error);
                alert("Error logging in. The link might have expired. Please try again.");
            });
    }
}

window.onload = () => {
    checkLoginOnLoad();
};

// ==========================================
// 4. DATA ENTRY TO FIREBASE
// ==========================================
function submitEntryForm(event) {
    event.preventDefault(); 
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Saving to Cloud...";
    submitBtn.disabled = true;

    db.collection("travelers").add({
        firstName: document.getElementById('entry-fname').value,
        surname: document.getElementById('entry-lname').value,
        origin: document.getElementById('entry-origin').value.toUpperCase(),
        dest: document.getElementById('entry-dest').value.toUpperCase(),
        airline: document.getElementById('entry-airline').value,
        date: document.getElementById('entry-date').value,
        intent: document.getElementById('entry-intent').value,
        comments: document.getElementById('entry-comments').value,
        flexibleDate: document.getElementById('entry-flex-date').checked,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    })
    .then(() => {
        alert("Success! Traveler details securely saved.");
        event.target.reset();
        submitBtn.innerText = "Save to Cloud...";
        submitBtn.disabled = false;
        goToPage('page-dashboard');
    })
    .catch((error) => {
        console.error("Error: ", error);
        alert("Oops! Check the console for errors.");
        submitBtn.innerText = "Save to Cloud...";
        submitBtn.disabled = false;
    });
}

// ==========================================
// 5. SEARCH FIREBASE DATABASE
// ==========================================
function performSearch(event) {
    event.preventDefault();
    const searchOrigin = document.getElementById('search-origin').value.toUpperCase();
    const searchDest = document.getElementById('search-dest').value.toUpperCase();
    const searchDate = new Date(document.getElementById('search-date').value);

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<h3>Searching Cloud Database...</h3>';

    let matchesFound = false;
    let resultsHTML = '<h3>Potential Matches:</h3>';

    db.collection("travelers")
      .where("origin", "==", searchOrigin)
      .where("dest", "==", searchDest)
      .get()
      .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
              let traveler = doc.data(); 
              let travelerDate = new Date(traveler.date);
              let diffDays = Math.ceil(Math.abs(travelerDate - searchDate) / (1000 * 3600 * 24));

              let bufferDays = traveler.flexibleDate ? 3 : 1; 

              if (diffDays <= bufferDays) {
                  matchesFound = true;
                  let dateMsg = diffDays === 0 ? "(Exact match!)" : `(${diffDays} day diff)`;
                  let color = traveler.intent === "I can help" ? "green" : "#0056b3";
                  
                  resultsHTML += `
                      <div class="card trip-card" style="border-left: 5px solid ${color};">
                          <h4 style="color: ${color}; margin-top: 0;">${traveler.intent}</h4>
                          <p><strong>Name:</strong> ${traveler.firstName} ${traveler.surname}</p>
                          <p><strong>Route:</strong> ${traveler.origin} ➔ ${traveler.dest}</p>
                          <p><strong>Date:</strong> ${traveler.date} <em>${dateMsg}</em></p>
                          <p><strong>Airlines:</strong> ${traveler.airline}</p>
                          <div style="background: #f1f3f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                              <p style="margin: 0; font-size: 0.9em;"><strong>Notes:</strong> ${traveler.comments || "None"}</p>
                          </div>
                          <button class="btn-primary" onclick="alert('Connection request coming soon!')">Request to Connect</button>
                      </div>
                  `;
              }
          });
          resultsContainer.innerHTML = matchesFound ? resultsHTML : `<h3>Potential Matches:</h3><p>No travelers found.</p>`;
      });
}