// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// Paste your copied config from the Firebase Console here:
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase App, Database, and Auth
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. APP NAVIGATION LOGIC
// ==========================================
function goToPage(pageId) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    // Show target view
    const target = document.getElementById(pageId);
    target.classList.add('active');
    target.style.display = 'block';

    // Show/hide back button
    const backBtn = document.getElementById('back-btn');
    if (pageId === 'page-login' || pageId === 'page-dashboard') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'inline-block';
    }
}

// ==========================================
// 3. MAGIC LINK AUTHENTICATION LOGIC
// ==========================================
function sendMagicLink(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const btn = document.getElementById('login-btn');
    
    btn.innerText = "Sending...";
    btn.disabled = true;

    // Configuration for the email link
    const actionCodeSettings = {
        // IMPORTANT: Ensure this exactly matches your live GitHub Pages URL!
        url: 'https://kiransiddeshwar.github.io/TravelBuddy/', 
        handleCodeInApp: true,
    };

    auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(() => {
            window.localStorage.setItem('emailForSignIn', email);
            alert('Magic link sent! Check your email inbox (and spam folder) to log in.');
            btn.innerText = "Check your email!";
        })
        .catch((error) => {
            console.error("Error sending link", error);
            alert("Oops! " + error.message);
            btn.innerText = "Send Magic Link";
            btn.disabled = false;
        });
}

function checkLoginOnLoad() {
    // Check if the current URL contains the Firebase magic link code
    if (auth.isSignInWithEmailLink(window.location.href)) {
        
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
            email = window.prompt('Please confirm your email address to complete sign-in:');
        }
        
        auth.signInWithEmailLink(email, window.location.href)
            .then((result) => {
                window.localStorage.removeItem('emailForSignIn'); 
                alert("Successfully logged in!");
                goToPage('page-dashboard'); // Send them to the main menu
            })
            .catch((error) => {
                console.error("Error signing in", error);
                alert("Error logging in. The link might have expired. Please try again.");
            });
    }
}

// Run the auth check every time the app loads
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
        
        // MVP Fields
        intent: document.getElementById('entry-intent').value,
        comments: document.getElementById('entry-comments').value,
        flexibleDate: document.getElementById('entry-flex-date').checked,
        
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    })
    .then((docRef) => {
        alert("Success! Traveler details securely saved to the database.");
        event.target.reset(); // Clear the form
        submitBtn.innerText = "Save to Cloud..."; // Reset button
        submitBtn.disabled = false;
        goToPage('page-dashboard');
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        alert("Oops! Something went wrong saving to the database. Check the console.");
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
    const searchDateStr = document.getElementById('search-date').value;
    const searchDate = new Date(searchDateStr);

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

              // Calculate difference in days locally
              let timeDiff = Math.abs(travelerDate.getTime() - searchDate.getTime());
              let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

              // Check flexibility
              let isFlexible = traveler.flexibleDate || false;
              let bufferDays = isFlexible ? 3 : 1; 

              // Apply dynamic date algorithm
              if (diffDays <= bufferDays) {
                  matchesFound = true;
                  let dateMessage = diffDays === 0 ? "(Exact match!)" : `(${diffDays} day difference)`;
                  let intentColor = traveler.intent === "I can help" ? "green" : "#0056b3"; // Color coding based on intent
                  
                  resultsHTML += `
                      <div class="card trip-card" style="border-left: 5px solid ${intentColor};">
                          <h4 style="color: ${intentColor}; margin-top: 0;">${traveler.intent}</h4>
                          <p><strong>Name:</strong> ${traveler.firstName} ${traveler.surname}</p>
                          <p><strong>Route:</strong> ${traveler.origin} ➔ ${traveler.dest}</p>
                          <p><strong>Date:</strong> ${traveler.date} <em>${dateMessage}</em></p>
                          <p><strong>Airlines:</strong> ${traveler.airline}</p>
                          <div style="background: #f1f3f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                              <p style="margin: 0; font-size: 0.9em;"><strong>Notes:</strong> ${traveler.comments || "None"}</p>
                          </div>
                          <button class="btn-primary" onclick="alert('Connection request logic coming soon!')">Request to Connect</button>
                      </div>
                  `;
              }
          });

          if (matchesFound) {
              resultsContainer.innerHTML = resultsHTML;
          } else {
              resultsContainer.innerHTML = `<h3>Potential Matches:</h3><p>No travelers found matching this route within the date window. Try another date or route!</p>`;
          }
      })
      .catch((error) => {
          console.error("Error getting documents: ", error);
          resultsContainer.innerHTML = `<p>Error searching database. Please try again.</p>`;
      });
}