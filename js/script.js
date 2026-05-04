const firebaseConfig = {
  apiKey: "AIzaSyDMaiqzAS8EKTDjFbhYY9d6Fex4O0IOLoM",
  authDomain: "travelbuddy-2c9a8.firebaseapp.com",
  projectId: "travelbuddy-2c9a8",
  storageBucket: "travelbuddy-2c9a8.firebasestorage.app",
  messagingSenderId: "832399397945",
  appId: "1:832399397945:web:18b0cbe07bc7663f90e9e8"
};

// 2. Add these two magic lines to initialize it:
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// A Mock Database to test our algorithm before connecting Firebase
const mockDatabase = [
    { firstName: "Aarav", surname: "Sharma", origin: "BOM", dest: "LHR", airline: "British Airways", date: "2026-11-02" },
    { firstName: "Priya", surname: "Gupta", origin: "DEL", dest: "JFK", airline: "Air India", date: "2026-10-24" },
    { firstName: "Rohan", surname: "Patel", origin: "BOM", dest: "LHR", airline: "Virgin Atlantic", date: "2026-11-04" } // 2 days later!
];

// Navigation Logic
function goToPage(pageId) {
    let views = document.getElementsByClassName('view');
    for (let i = 0; i < views.length; i++) {
        views[i].classList.remove('active');
    }
    document.getElementById(pageId).classList.add('active');
}

function handleLogin(event) {
    event.preventDefault(); 
    goToPage('page-dashboard');
}

// Algorithm: Input Layer 1 (Data Entry to Firebase)
function submitEntryForm(event) {
    event.preventDefault(); 
    
    // 1. Change the button text so the user knows it's working
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Saving to Cloud...";
    submitBtn.disabled = true;

    // 2. Tell Firebase to go into the "travelers" folder and add a new document
    db.collection("travelers").add({
        firstName: document.getElementById('entry-fname').value,
        surname: document.getElementById('entry-lname').value,
        origin: document.getElementById('entry-origin').value.toUpperCase(),
        dest: document.getElementById('entry-dest').value.toUpperCase(),
        airline: document.getElementById('entry-airline').value,
        date: document.getElementById('entry-date').value,
        // We save the exact time they created this, just in case we need it later!
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    })
    .then((docRef) => {
        // 3. IF SUCCESSFUL: This code runs!
        alert("Success! Traveler details securely saved to the database.");
        event.target.reset(); // Clear the form
        submitBtn.innerText = "Save to Database"; // Reset button
        submitBtn.disabled = false;
        goToPage('page-dashboard'); // Send them back to the menu
    })
    .catch((error) => {
        // 4. IF IT FAILS: This code runs!
        console.error("Error adding document: ", error);
        alert("Oops! Something went wrong saving to the database. Check the console.");
        submitBtn.innerText = "Save to Database";
        submitBtn.disabled = false;
    });
}

// Algorithm: Input Layer 2 (Search Live Firebase Database)
function performSearch(event) {
    event.preventDefault();
    
    // 1. Get user input
    const searchOrigin = document.getElementById('search-origin').value.toUpperCase();
    const searchDest = document.getElementById('search-dest').value.toUpperCase();
    const searchDateStr = document.getElementById('search-date').value;
    const searchDate = new Date(searchDateStr);

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<h3>Searching Cloud Database...</h3>'; // Loading message

    let matchesFound = false;
    let resultsHTML = '<h3>Potential Matches:</h3>';

    // 2. Ask Firebase for travelers on this exact route
    db.collection("travelers")
      .where("origin", "==", searchOrigin)
      .where("dest", "==", searchDest)
      .get()
      .then((querySnapshot) => {
          
          // 3. Loop through the documents Firebase found
          querySnapshot.forEach((doc) => {
              let traveler = doc.data(); // This unwraps the data from the document
              let travelerDate = new Date(traveler.date);

              // Calculate difference in days locally
              let timeDiff = Math.abs(travelerDate.getTime() - searchDate.getTime());
              let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

              // 4. Apply your 1-day buffer algorithm
              if (diffDays <= 1) {
                  matchesFound = true;
                  let dateMessage = diffDays === 0 ? "(Exact match!)" : "(1 day difference)";
                  
                  // Add this match to our results
                  resultsHTML += `
                      <div class="card trip-card">
                          <p><strong>Name:</strong> ${traveler.firstName} ${traveler.surname}</p>
                          <p><strong>Route:</strong> ${traveler.origin} ➔ ${traveler.dest}</p>
                          <p><strong>Date:</strong> ${traveler.date} <em>${dateMessage}</em></p>
                          <p><strong>Airlines:</strong> ${traveler.airline}</p>
                          <button class="btn-primary">Request to Connect</button>
                      </div>
                  `;
              }
          });

          // 5. Output the final HTML to the screen
          if (matchesFound) {
              resultsContainer.innerHTML = resultsHTML;
          } else {
              resultsContainer.innerHTML = `<h3>Potential Matches:</h3><p>No travelers found matching this route within a 1-day window. Try another date or route!</p>`;
          }
      })
      .catch((error) => {
          console.error("Error getting documents: ", error);
          resultsContainer.innerHTML = `<p>Error searching database. Please try again.</p>`;
      });
}