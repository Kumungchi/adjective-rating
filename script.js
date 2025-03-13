// Introduction website
document.getElementById('startButton').addEventListener('click', function() {
    window.location.href = 'adjectiverating.html';
});

// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, increment, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Uložení uživatelských dat do Firestore
async function saveUserData() {
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const education = document.getElementById('education').value;
    const occupation = document.getElementById('occupation').value;
    const nativeLanguage = document.getElementById('nativeLanguage').value;

    if (age && gender && education && occupation && nativeLanguage) {
        try {
            const userRef = await addDoc(collection(db, "users"), {
                age,
                gender,
                education,
                occupation,
                nativeLanguage,
                timestamp: new Date().toISOString()
            });
            userId = userRef.id; // Uložení userId pro další použití
            localStorage.setItem('userId', userId); // Uložení userId do LocalStorage
            window.location.href = 'adjectiverating.html'; // Přesměrování na stránku hodnocení
        } catch (error) {
            console.error("Chyba při ukládání uživatelských dat: ", error);
        }
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

// Hodnocení slov a uložení do LocalStorage
function rateWord(valence, arousal) {
    if (!userId) {
        alert("Nejprve vyplňte demografický dotazník.");
        return;
    }

    const word = words[currentWordIndex];
    saveRatingToLocalStorage(word.id, word.word, valence, arousal);

    console.log(`Uloženo do LocalStorage: ${word.word} - Valence: ${valence}, Arousal: ${arousal}`);
    nextWord();
}

// Uložení hodnocení do LocalStorage
function saveRatingToLocalStorage(wordId, word, valence, arousal) {
    const ratings = JSON.parse(localStorage.getItem('ratings')) || [];
    ratings.push({ wordId, word, valence, arousal, timestamp: new Date().toISOString() });
    localStorage.setItem('ratings', JSON.stringify(ratings));
}

// Sledování počtu zápisů v Google Analytics
function trackWriteOperation() {
    if (typeof gtag === 'function') {
        gtag('event', 'write_operation', {
            'event_category': 'Firestore',
            'event_label': 'Write Operation',
            'value': 1
        });
    }
}

// Synchronizace hodnocení s Firestore
async function syncRatingsWithFirestore() {
    const ratings = JSON.parse(localStorage.getItem('ratings')) || [];
    if (ratings.length === 0) return;

    const batch = db.batch();
    ratings.forEach(rating => {
        const ratingRef = doc(collection(db, "ratings"));
        batch.set(ratingRef, rating);

        const wordRef = doc(db, "adjectives", rating.wordId);
        batch.update(wordRef, { evaluations: increment(1) });
    });

    try {
        await batch.commit();
        localStorage.removeItem('ratings');
        console.log('Hodnocení byla úspěšně synchronizována s Firestore.');
        trackWriteOperation();
    } catch (error) {
        console.error('Chyba při synchronizaci hodnocení s Firestore: ', error);
    }
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
            highlightButton(button);
        });
        button.addEventListener("touchstart", () => {
            currentArousal = button.innerText.toLowerCase();
            highlightButton(button);
        });
    });

    valenceButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentValence = button.innerText.toLowerCase();
            highlightButton(button);
        });
        button.addEventListener("touchstart", () => {
            currentValence = button.innerText.toLowerCase();
            highlightButton(button);
        });
    });
}

// Zvýraznění vybraného tlačítka
function highlightButton(button) {
    const buttons = button.parentElement.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Funkce setupConfirmButton
function setupConfirmButton() {
    const confirmButton = document.querySelector('.confirmation-button');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            if (currentValence && currentArousal) {
                rateWord(currentValence, currentArousal);
                showFeedbackMessage("Děkujeme za vaše hodnocení!");
                clearSelections();
            } else {
                displayErrorMessage("Prosím, vyberte hodnocení pro valenci a arousal před potvrzením.");
            }
        });
    }
}

// Vymazání zvýraznění po potvrzení
function clearSelections() {
    const selectedButtons = document.querySelectorAll('.rating-button.selected');
    selectedButtons.forEach(button => button.classList.remove('selected'));
}

// Zobrazení zpětné vazby
function showFeedbackMessage(message) {
    alert(message);
}

// Zobrazení chybové zprávy
function displayErrorMessage(message) {
    alert(message);
}

// Přidání event listenerů po načtení dokumentu
document.addEventListener('DOMContentLoaded', function() {
    setupConfirmButton();
    setupEventListeners();
    
    // Přidáme event listenery pro všechna rating tlačítka
    const ratingButtons = document.querySelectorAll('.rating-button');
    ratingButtons.forEach(button => {
        button.addEventListener('click', () => selectOption(button));
    });

    // Přidání event listeneru pro tlačítko odeslání demografických dat
    document.getElementById("submitDemographicButton").addEventListener("click", saveUserData);
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
});

// Přidání JavaScript kódu pro zvýraznění vybraných tlačítek a zobrazení potvrzovací zprávy
function selectOption(button, value) {
    // Zrušení zvýraznění všech tlačítek ve stejné skupině
    const buttons = button.parentElement.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));

    // Zvýraznění vybraného tlačítka
    button.classList.add('selected');

    // Uložení hodnoty do datasetu tlačítka
    button.parentElement.dataset.selectedValue = value;
}

function confirmPracticeRating() {
    const practiceContainers = document.querySelectorAll('.practiceWordContainer');
    let allRated = true;

    practiceContainers.forEach(container => {
        const arousalGroup = container.querySelector('.control-group:nth-child(2)');
        const valenceGroup = container.querySelector('.control-group:nth-child(3)');

        if (!arousalGroup.dataset.selectedValue || !valenceGroup.dataset.selectedValue) {
            allRated = false;
        }
    });

    if (allRated) {
        alert('Hodnocení bylo úspěšně potvrzeno.');
    } else {
        alert('Prosím, ohodnoťte všechna slova před potvrzením.');
    }
}

// Volání synchronizace při načtení stránky
window.addEventListener('load', syncRatingsWithFirestore);
