// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, increment, arrayUnion, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3QwaEeJjEddfLgHzc760FYmwrdeZnxAE",
    authDomain: "valencearousal.firebaseapp.com",
    projectId: "valencearousal",
    storageBucket: "valencearousal.appspot.com",
    messagingSenderId: "545440359385",
    appId: "1:545440359385:web:9c9855769597b27629900d",
    measurementId: "G-ER37JNBVFB"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentWordIndex = 0;
const totalAdjectives = 15;
let words = [];
let currentValence = null;
let currentArousal = null;

// Fetch adjectives from Firestore and sort them based on evaluations
async function fetchAdjectives() {
    try {
        const querySnapshot = await getDocs(collection(db, 'adjektiva'));
        const allWords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const groupedByEvaluations = groupByEvaluations(allWords);
        const sortedAndShuffledWords = sortAndShuffleGroups(groupedByEvaluations);

        words = sortedAndShuffledWords.slice(0, totalAdjectives);
        displayWord();
    } catch (error) {
        console.error("Error fetching adjectives: ", error);
        displayErrorMessage("Failed to fetch adjectives. Please check your network connection and try again.");
    }
}

// Group adjectives by their number of evaluations
function groupByEvaluations(words) {
    return words.reduce((groups, word) => {
        const count = word.evaluations || 0; // Default to 0 if evaluations is not set
        if (!groups[count]) {
            groups[count] = [];
        }
        groups[count].push(word);
        return groups;
    }, {});
}

// Sort groups and shuffle within each group
function sortAndShuffleGroups(groups) {
    const sortedKeys = Object.keys(groups).sort((a, b) => a - b);
    let sortedAndShuffledWords = [];

    sortedKeys.forEach(key => {
        const group = groups[key];
        shuffleArray(group);
        sortedAndShuffledWords = sortedAndShuffledWords.concat(group);
    });

    return sortedAndShuffledWords;
}

// Shuffle array to randomize words within a group
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Display the current word or a completion message
function displayWord() {
    currentValence = null;
    currentArousal = null;

    const adjectiveDisplay = document.getElementById('adjectiveDisplay');
    const ratingButtons = document.querySelectorAll('.rating-button');

    // Remove selected class from all buttons
    ratingButtons.forEach(button => {
        button.classList.remove('selected');
    });

    if (adjectiveDisplay) {
        if (currentWordIndex < totalAdjectives) {
            adjectiveDisplay.innerHTML = `<h2>${words[currentWordIndex].word}</h2>`;
        } else {
            adjectiveDisplay.innerHTML = `<h2>Děkujeme za vaše hodnocení!</h2>`;
        }
    } else {
        console.error("Element with ID 'adjectiveDisplay' not found.");
    }
}

// Display error message
function displayErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerText = message;
    document.body.appendChild(errorMessage);
    setTimeout(() => {
        errorMessage.remove();
    }, 5000); // Remove error message after 5 seconds
}

// Show feedback message
function showFeedbackMessage(message) {
    const feedbackMessage = document.createElement('div');
    feedbackMessage.className = 'feedback-message';
    feedbackMessage.innerText = message;
    document.body.appendChild(feedbackMessage);
    setTimeout(() => {
        feedbackMessage.remove();
    }, 2000); // Remove feedback message after 2 seconds
}

// Handle rating button clicks or touches
async function rateWord(valence, arousal, button) {
    const group = button.closest('.control-group');
    const buttonsInGroup = group.querySelectorAll('.rating-button');

    // Toggle the selected class
    button.classList.toggle('selected');

    // Remove selected class from other buttons in the same group
    buttonsInGroup.forEach(btn => {
        if (btn !== button) {
            btn.classList.remove('selected');
        }
    });

    if (button.classList.contains('selected')) {
        if (valence) currentValence = valence;
        if (arousal) currentArousal = arousal;
    } else {
        if (valence) currentValence = null;
        if (arousal) currentArousal = null;
    }

    if (currentValence && currentArousal) {
        const word = words[currentWordIndex];
        const wordRef = doc(db, 'adjektiva', word.id.toString());

        try {
            // Get the current document
            const docSnapshot = await getDoc(wordRef);
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();

                // Only update if the new rating is different from the default valence and arousal
                if (data.valence !== currentValence || data.arousal !== currentArousal) {
                    await updateDoc(wordRef, {
                        evaluations: increment(1),
                        ratings: arrayUnion({ valence: currentValence, arousal: currentArousal })
                    });

                    showFeedbackMessage("Rating submitted successfully!");
                }
            }

            currentWordIndex++;
            displayWord();
        } catch (error) {
            console.error("Error updating word: ", error);
            displayErrorMessage("Failed to submit rating. Please check your network connection and try again.");
        }
    }
}

// Set up event listeners for rating buttons
function setupEventListeners() {
    const arousalButtons = document.querySelectorAll(".control-group:nth-child(1) .rating-button");
    const valenceButtons = document.querySelectorAll(".control-group:nth-child(2) .rating-button");

    arousalButtons.forEach(button => {
        button.addEventListener("click", () => rateWord(null, button.innerText.toLowerCase(), button));
        button.addEventListener("touchstart", () => rateWord(null, button.innerText.toLowerCase(), button));
    });

    valenceButtons.forEach(button => {
        button.addEventListener("click", () => rateWord(button.innerText.toLowerCase(), null, button));
        button.addEventListener("touchstart", () => rateWord(button.innerText.toLowerCase(), null, button));
    });
}

// Function to check if the device is mobile
function isMobileDevice() {
    const userAgentData = navigator.userAgentData;
    if (userAgentData) {
        return userAgentData.mobile;
    }
    return /Mobi|Android/i.test(navigator.userAgent);
}

// Fetch and display adjectives when the page loads
window.onload = () => {
    fetchAdjectives();
    setupEventListeners();
};
