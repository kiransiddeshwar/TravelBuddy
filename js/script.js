// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// IMPORTANT: Paste your REAL keys here from your Firebase Console!
const firebaseConfig = {
    apiKey: "AIzaSyDMaiqzAS8EKTDjFbhYY9d6Fex4O0IOLoM",
    authDomain: "travelbuddy-2c9a8.firebaseapp.com",
    projectId: "travelbuddy-2c9a8",
    storageBucket: "travelbuddy-2c9a8.firebasestorage.app",
    messagingSenderId: "832399397945",
    appId: "1:832399397945:web:18b0cbe07bc7663f90e9e8"
};

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
            alert('Secure link sent! Check your email inbox (and spam folder) to log in.');
            btn.innerText = "Check your email!";
        })
        .catch((error) => {
            console.error("Error sending link", error);
            alert("Oops! " + error.message);
            btn.innerText = "Send Secure Link";
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

// ==========================================
// 4. DATA ENTRY & DYNAMIC ITINERARY
// ==========================================
function toggleAirline() {
    const isChecked = document.getElementById('same-airline').checked;
    const arrAirlineInput = document.getElementById('arr-airline');
    const depAirlineInput = document.getElementById('dep-airline').value;

    if (isChecked) {
        arrAirlineInput.value = depAirlineInput;
        arrAirlineInput.readOnly = true;
        arrAirlineInput.style.opacity = "0.7";
    } else {
        arrAirlineInput.value = '';
        arrAirlineInput.readOnly = false;
        arrAirlineInput.style.opacity = "1";
    }
}

let transitCount = 0;
function addTransit() {
    transitCount++;
    const container = document.getElementById('transit-container');
    
    const transitBlock = document.createElement('div');
    transitBlock.classList.add('transit-leg');
    transitBlock.innerHTML = `
        <span style="font-weight: bold; min-width: 80px;">Transit ${transitCount}:</span>
        <input type="text" placeholder="City Code (e.g., DXB)" class="t-city">
        <input type="text" placeholder="Flight Code" class="t-flight">
        <input type="text" placeholder="Airline" class="t-airline">
        <button type="button" style="background:#dc3545; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(transitBlock);
}

function submitEntryForm(event) {
    event.preventDefault(); 
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    let transitsArray = [];
    document.querySelectorAll('.transit-leg').forEach(leg => {
        transitsArray.push({
            city: leg.querySelector('.t-city').value.toUpperCase(),
            flight: leg.querySelector('.t-flight').value,
            airline: leg.querySelector('.t-airline').value
        });
    });

    db.collection("travelers").add({
        firstName: document.getElementById('entry-fname').value,
        surname: document.getElementById('entry-lname').value,
        origin: document.getElementById('dep-city').value.toUpperCase(),
        dest: document.getElementById('arr-city').value.toUpperCase(),
        date: document.getElementById('entry-date').value,
        departure: {
            time: document.getElementById('dep-time').value,
            flight: document.getElementById('dep-flight').value,
            airline: document.getElementById('dep-airline').value
        },
        arrival: {
            time: document.getElementById('arr-time').value,
            flight: document.getElementById('arr-flight').value,
            airline: document.getElementById('arr-airline').value
        },
        transits: transitsArray,
        intent: document.getElementById('entry-intent').value,
        comments: document.getElementById('entry-comments').value,
        flexibleDate: document.getElementById('entry-flex-date').checked,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    })
    .then(() => {
        alert("Success! Your detailed itinerary is securely saved.");
        event.target.reset();
        document.getElementById('transit-container').innerHTML = ''; 
        transitCount = 0;
        submitBtn.innerText = "Save";
        submitBtn.disabled = false;
        goToPage('page-dashboard');
    })
    .catch((error) => {
        console.error("Error: ", error);
        alert("Oops! Check the console for errors.");
        submitBtn.innerText = "Save";
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
                  let color = traveler.intent === "I can help someone" ? "green" : "#0056b3";
                  
                  resultsHTML += `
                      <div class="card trip-card" style="border-left: 5px solid ${color};">
                          <h4 style="color: ${color}; margin-top: 0;">${traveler.intent}</h4>
                          <p><strong>Name:</strong> ${traveler.firstName} ${traveler.surname}</p>
                          <p><strong>Route:</strong> ${traveler.origin} ➔ ${traveler.dest}</p>
                          <p><strong>Date:</strong> ${traveler.date} <em>${dateMsg}</em></p>
                          <p><strong>Primary Airline:</strong> ${traveler.departure.airline}</p>
                          <div style="background: var(--bg-alt, #f1f3f5); padding: 10px; border-radius: 5px; margin: 10px 0;">
                              <p style="margin: 0; font-size: 0.9em; color: var(--text-dark, #333);"><strong>Notes:</strong> ${traveler.comments || "None"}</p>
                          </div>
                          <button class="btn-primary" onclick="alert('Connection request coming soon!')">Request to Connect</button>
                      </div>
                  `;
              }
          });
          resultsContainer.innerHTML = matchesFound ? resultsHTML : `<h3>Potential Matches:</h3><p>No travelers found.</p>`;
      });
}

// ==========================================
// 6. DARK MODE TOGGLE LOGIC
// ==========================================
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeBtn.innerText = "☀️ Light Mode";
    } else {
        localStorage.setItem('theme', 'light');
        themeBtn.innerText = "🌙 Dark Mode";
    }
}

function checkThemeOnLoad() {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if(themeBtn) themeBtn.innerText = "☀️ Light Mode";
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = () => {
    checkLoginOnLoad();
    checkThemeOnLoad();
};