import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, increment, doc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let userId = localStorage.getItem("userId");
let currentWordIndex = 0;
const totalAdjectives = 15;
let words = [];
let currentValence = null;
let currentArousal = null;

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM plně načten!");

    // Pouze na stránce hodnocení
    if (window.location.pathname.includes("adjectiverating.html")) {
        if (!userId) {
            alert("Nebyl nalezen identifikátor účastníka. Pravděpodobně jste přeskočili dotazník.");
            window.location.href = "index.html";
            return;
        }

        const adjectiveDisplay = document.getElementById('adjectiveDisplay');
        if (!adjectiveDisplay) {
            console.error("❌ Element 'adjectiveDisplay' nebyl nalezen v DOMu!");
            return;
        }

        setupConfirmButton();
        setupEventListeners();

        const ratingButtons = document.querySelectorAll('.rating-button');
        ratingButtons.forEach(button => {
            button.addEventListener('click', () => selectOption(button));
            button.addEventListener('touchstart', () => selectOption(button));
        });

        fetchAdjectives();
    }

    // Společné pro všechny stránky (practice buttons)
    const confirmPracticeButton1 = document.getElementById("confirmPracticeButton1");
    const confirmPracticeButton2 = document.getElementById("confirmPracticeButton2");

    if (confirmPracticeButton1) confirmPracticeButton1.addEventListener("click", confirmPracticeRating);
    if (confirmPracticeButton2) confirmPracticeButton2.addEventListener("click", confirmPracticeRating);

    syncRatingsWithFirestore();
});

async function saveUserData() {
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const education = document.getElementById('education').value;
    const occupation = document.getElementById('occupation').value;
    const nativeLanguage = document.getElementById('nativeLanguage').value;

    if (age && gender && education && occupation && nativeLanguage) {
        try {
            const userRef = await addDoc(collection(db, "users"), {
                age, gender, education, occupation, nativeLanguage,
                timestamp: new Date().toISOString()
            });
            userId = userRef.id;
            localStorage.setItem('userId', userId);
            window.location.href = 'adjectiverating.html';
        } catch (error) {
            console.error("Chyba při ukládání do Firestore:", error);
        }
    } else {
        alert("Vyplňte všechna pole.");
    }
}

async function fetchAdjectives() {
    try {
        const querySnapshot = await getDocs(collection(db, "adjectives"));
        words = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (words.length === 0) {
            document.getElementById("adjectiveDisplay").innerHTML = "<h2>Chyba: Nebyla nalezena žádná slova.</h2>";
            return;
        }
        shuffleArray(words);
        displayWord();
    } catch (error) {
        document.getElementById("adjectiveDisplay").innerHTML = "<h2>Chyba při načítání slov!</h2>";
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function displayWord() {
    const display = document.getElementById("adjectiveDisplay");
    if (currentWordIndex < totalAdjectives) {
        const wordObj = words[currentWordIndex];
        display.innerHTML = `<h2>${wordObj.word}</h2>`;
        document.getElementById("progress-text").innerText = `${currentWordIndex + 1}/${totalAdjectives}`;
    } else {
        display.innerHTML = `<h2>Děkujeme za hodnocení!</h2><p>Kontakt: Matias.Bunnik.s01@osu.cz</p>`;
        syncRatingsWithFirestore();
    }
}

function rateWord(valence, arousal) {
    if (!userId) {
        alert("Nejprve vyplňte demografický dotazník.");
        return;
    }
    if (!valence || !arousal) {
        alert("Musíte vybrat jak valenci, tak arousal.");
        return;
    }
    const word = words[currentWordIndex];
    const ratings = JSON.parse(localStorage.getItem("ratings")) || [];
    ratings.push({ userId, wordId: word.id, word: word.word, valence, arousal, timestamp: new Date().toISOString() });
    localStorage.setItem("ratings", JSON.stringify(ratings));
    nextWord();
}

async function syncRatingsWithFirestore() {
    const ratings = JSON.parse(localStorage.getItem('ratings')) || [];
    if (ratings.length === 0) return;
    try {
        for (let rating of ratings) {
            await addDoc(collection(db, "ratings"), rating);
            const wordRef = doc(db, "adjectives", rating.wordId);
            await updateDoc(wordRef, { evaluations: increment(1) });
        }
        localStorage.removeItem("ratings");
    } catch (error) {
        console.error("Chyba při synchronizaci hodnocení:", error);
    }
}

function nextWord() {
    currentWordIndex++;
    if (currentWordIndex < totalAdjectives) displayWord();
    else submitRatingsToFirestore();
}

function submitRatingsToFirestore() {
    showVisualFeedback("Děkujeme za účast!", "success");
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'block';
    localStorage.removeItem('ratings');
}

function setupEventListeners() {
    const arousalButtons = document.querySelectorAll(".control-group:nth-child(2) .rating-button");
    const valenceButtons = document.querySelectorAll(".control-group:nth-child(1) .rating-button");
    arousalButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentArousal = button.innerText.toLowerCase();
            highlightButton(button);
        });
    });
    valenceButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentValence = button.innerText.toLowerCase();
            highlightButton(button);
        });
    });
}

function highlightButton(button) {
    const buttons = button.parentElement.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    button.parentElement.dataset.selectedValue = button.dataset.value;
}

function confirmPracticeRating() {
    const practiceContainers = document.querySelectorAll('.practiceWordContainer');
    let allRated = true;

    practiceContainers.forEach(container => {
        const valenceGroup = container.querySelector('.control-group:nth-child(1)');
        const arousalGroup = container.querySelector('.control-group:nth-child(2)');

        // Kontrola, zda je dataset.selectedValue nastaven pro obě skupiny
        if (!valenceGroup?.dataset?.selectedValue || !arousalGroup?.dataset?.selectedValue) {
            allRated = false;
        }
    });

    if (allRated) {
        showVisualFeedback('Hodnocení testovacích slov "Šťastný" a "Smutný" bylo úspěšně potvrzeno. Pokračujte k dotazníku.', "success");

        const form = document.getElementById("demographicSurvey");
        if (form) {
            form.scrollIntoView({ behavior: "smooth" });
        }
    } else {
        showVisualFeedback('❗ Prosím, ohodnoťte obě testovací slova "Šťastný" a "Smutný" před potvrzením.', "error");
    }
}

function showVisualFeedback(message, type = "success") {
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'feedback-message';
    feedbackElement.innerText = message;

    // Nastavení barvy podle typu zprávy
    feedbackElement.style.backgroundColor = type === "success" ? "#4caf50" : "#e53935"; // zelená nebo červená

    document.body.appendChild(feedbackElement);

    // Automatické odstranění zprávy po 4 sekundách
    setTimeout(() => {
        feedbackElement.remove();
    }, 4000);
}

window.selectOption = selectOption;
window.confirmPracticeRating = confirmPracticeRating;

function selectOption(button) {
    const buttons = button.parentElement.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    button.parentElement.dataset.selectedValue = button.dataset.value;
}
