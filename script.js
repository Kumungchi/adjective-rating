// Introduction website
document.getElementById('startButton').addEventListener('click', function() {
    window.location.href = 'adjectiverating.html';
});

// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, increment, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4H21ACGMoYAnK5_Rmy2l_Xb5mn4OwoSg",
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
let userId = null;

// Uložení uživatelských dat
function saveUserData() {
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const education = document.getElementById('education').value;
    const occupation = document.getElementById('occupation').value;
    const nativeLanguage = document.getElementById('nativeLanguage').value;

    if (age && gender && education && occupation && nativeLanguage) {
        const userRef = doc(collection(db, "users"));
        setDoc(userRef, {
            age: age,
            gender: gender,
            education: education,
            occupation: occupation,
            nativeLanguage: nativeLanguage,
            timestamp: new Date().toISOString()
        }).then(() => {
            userId = userRef.id;
            document.getElementById("startButton").style.display = "block";
            console.log("Uživatel uložen s ID:", userId);
        }).catch(error => {
            console.error("Chyba při ukládání uživatele: ", error);
        });
    } else {
        alert("Vyplňte všechna pole.");
    }
}

// Načtení slov z Firestore
async function fetchAdjectives() {
    try {
        const querySnapshot = await getDocs(collection(db, "adjectives"));
        let allWords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Skupinování podle počtu hodnocení
        const groupedWords = groupByEvaluations(allWords);
        words = sortAndShuffleGroups(groupedWords);

        displayWord();
    } catch (error) {
        console.error("Chyba při načítání slov: ", error);
    }
}

// Skupinování slov podle počtu hodnocení
function groupByEvaluations(words) {
    return words.reduce((groups, word) => {
        const count = word.evaluations || 0;
        if (!groups[count]) {
            groups[count] = [];
        }
        groups[count].push(word);
        return groups;
    }, {});
}

// Řazení skupin podle nejméně hodnocených a náhodné míchání uvnitř
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

// Fisher-Yates míchání pole
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Zobrazení aktuálního slova
function displayWord() {
    currentValence = null;
    currentArousal = null;

    if (currentWordIndex < totalAdjectives) {
        document.getElementById("adjectiveDisplay").innerHTML = `<h2>${words[currentWordIndex].word}</h2>`;
        document.getElementById("progress-text").innerText = `${currentWordIndex + 1}/${totalAdjectives}`;
    } else {
        document.getElementById("adjectiveDisplay").innerHTML = `<h2>Děkujeme za hodnocení!</h2>`;
    }
}

// Hodnocení slov a uložení do Firestore
async function rateWord(valence, arousal) {
    if (!userId) {
        alert("Nejprve vyplňte demografický dotazník.");
        return;
    }

    const word = words[currentWordIndex];

    // Uložíme hodnocení do kolekce "ratings"
    const ratingRef = doc(collection(db, "ratings"));
    await setDoc(ratingRef, {
        userId: userId,
        wordId: word.id,
        word: word.word,
        valence: valence,
        arousal: arousal,
        timestamp: new Date().toISOString()
    });

    // Aktualizujeme počet hodnocení v kolekci "adjectives"
    const wordRef = doc(db, "adjectives", word.id);
    await updateDoc(wordRef, {
        evaluations: increment(1)
    });

    console.log(`Uloženo: ${word.word} - Valence: ${valence}, Arousal: ${arousal}`);
    nextWord();
}

// Další slovo
function nextWord() {
    currentWordIndex++;
    if (currentWordIndex < totalAdjectives) {
        displayWord();
    } else {
        document.getElementById("adjectiveDisplay").innerHTML = `<h2>Děkujeme za účast!</h2>`;
        document.getElementById("modal").style.display = 'block';
    }
}

// Set up event listeners for rating buttons
function setupEventListeners() {
    const arousalButtons = document.querySelectorAll(".control-group:nth-child(1) .rating-button");
    const valenceButtons = document.querySelectorAll(".control-group:nth-child(2) .rating-button");

    arousalButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentArousal = button.innerText.toLowerCase();
            rateWord(currentValence, currentArousal);
        });
        button.addEventListener("touchstart", () => {
            currentArousal = button.innerText.toLowerCase();
            rateWord(currentValence, currentArousal);
        });
    });

    valenceButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentValence = button.innerText.toLowerCase();
            rateWord(currentValence, currentArousal);
        });
        button.addEventListener("touchstart", () => {
            currentValence = button.innerText.toLowerCase();
            rateWord(currentValence, currentArousal);
        });
    });
}

// Funkce setupConfirmButton
function setupConfirmButton() {
    const confirmButton = document.querySelector('.confirmation-button');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            if (currentValence && currentArousal) {
                showFeedbackMessage("Děkujeme za vaše hodnocení!");
                currentAdjective++;
                updateProgress();
                if (currentAdjective >= totalAdjectives) {
                    finishRating();
                }
            } else {
                displayErrorMessage("Prosím, vyberte hodnocení pro valenci a arousal před potvrzením.");
            }
        });
    }
}

// Fetch and display adjectives when the page loads
window.onload = () => {
    fetchAdjectives();
    setupEventListeners();
};

// Přidání event listenerů po načtení dokumentu
document.addEventListener('DOMContentLoaded', function() {
    setupConfirmButton();
    
    // Přidáme event listenery pro všechna rating tlačítka
    const ratingButtons = document.querySelectorAll('.rating-button');
    ratingButtons.forEach(button => {
        button.addEventListener('click', () => selectOption(button));
    });
});

// Zavření modal okna
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('closeButton');
    const modal = document.getElementById('modal');

    if (closeButton && modal) {
        closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });

        // Zavření modal při kliknutí mimo něj
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const confirmPracticeButton1 = document.getElementById("confirmPracticeButton1");
    const confirmPracticeButton2 = document.getElementById("confirmPracticeButton2");

    if (confirmPracticeButton1) {
        confirmPracticeButton1.addEventListener("click", confirmPracticeRating);
    }

    if (confirmPracticeButton2) {
        confirmPracticeButton2.addEventListener("click", confirmPracticeRating);
    }

    // ...existing code...
});

document.getElementById("submitDemographicButton").addEventListener("click", saveUserData);
document.getElementById("startButton").addEventListener("click", fetchAdjectives);
document.querySelectorAll(".rating-button").forEach(button => {
    button.addEventListener("click", () => rateWord(button.dataset.valence, button.dataset.arousal));
});
