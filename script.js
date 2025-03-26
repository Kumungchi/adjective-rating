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

// Sloučený DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM plně načten!");

    // Inicializace formuláře pro demografické údaje
    const demographicForm = document.getElementById("demographicForm");
    const submitButton = document.getElementById("submitDemographicButton");
    
    if (demographicForm) {
        // Přidání různých typů event listenerů pro lepší kompatibilitu
        demographicForm.addEventListener("submit", handleFormSubmit);
        
        // Přidáme touch eventy pro mobilní zařízení
        if (submitButton) {
            submitButton.addEventListener("touchstart", handleButtonTouch);
            submitButton.addEventListener("click", handleButtonClick);
        }
    }

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

    if (confirmPracticeButton1) {
        confirmPracticeButton1.addEventListener("click", confirmPracticeRating);
        confirmPracticeButton1.addEventListener("touchstart", confirmPracticeRating);
    }
    
    if (confirmPracticeButton2) {
        confirmPracticeButton2.addEventListener("click", confirmPracticeRating);
        confirmPracticeButton2.addEventListener("touchstart", confirmPracticeRating);
    }

    syncRatingsWithFirestore();
});

// Funkce pro zpracování odeslání formuláře
function handleFormSubmit(event) {
    event.preventDefault();
    saveUserData();
}

// Funkce pro zpracování kliknutí na tlačítko
function handleButtonClick(event) {
    event.preventDefault();
    const form = event.target.closest("form");
    if (form) saveUserData();
}

// Funkce pro zpracování dotyku na tlačítko
function handleButtonTouch(event) {
    event.preventDefault();
    const form = event.target.closest("form");
    if (form) saveUserData();
}

async function saveUserData() {
    const age = document.getElementById('age')?.value;
    const gender = document.getElementById('gender')?.value;
    const education = document.getElementById('education')?.value;
    const occupation = document.getElementById('occupation')?.value;
    const nativeLanguage = document.getElementById('nativeLanguage')?.value;

    if (age && gender && education && occupation && nativeLanguage) {
        showVisualFeedback("Odesílání údajů...", "info");
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
            showVisualFeedback("Nastala chyba při ukládání dat. Zkuste prosím znovu.", "error");
        }
    } else {
        showVisualFeedback("Vyplňte prosím všechna pole.", "error");
    }
}

async function fetchAdjectives() {
    try {
        console.log("⏳ Načítání slov z Firestore...");
        const querySnapshot = await getDocs(collection(db, "adjectives"));
        words = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("✅ Načtená slova:", words);

        if (words.length === 0) {
            document.getElementById("adjectiveDisplay").innerHTML = "<h2>Chyba: Nebyla nalezena žádná slova.</h2>";
            return;
        }
        shuffleArray(words);
        displayWord();
    } catch (error) {
        console.error("❌ Chyba při načítání slov:", error);
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
        const controlGroups = container.querySelectorAll('.control-group');
        controlGroups.forEach(group => {
            if (!group.dataset.selectedValue) {
                allRated = false;
            }
        });
    });

    if (allRated) {
        showVisualFeedback('✅ Hodnocení testovacích slov bylo potvrzeno. Pokračujte k dotazníku.', "success");

        const form = document.getElementById("demographicSurvey");
        if (form) {
            form.scrollIntoView({ behavior: "smooth" });
        }
    } else {
        showVisualFeedback('❗ Prosím, ohodnoťte obě testovací slova "Šťastný" a "Smutný" před potvrzením.', "error");
    }
}

function showVisualFeedback(message, type = "success") {
    const oldMessage = document.querySelector('.feedback-message');
    if (oldMessage) oldMessage.remove(); // Odstraníme starou zprávu, pokud existuje

    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'feedback-message';
    feedbackElement.innerText = message;

    feedbackElement.style.backgroundColor = type === "success" ? "#4caf50" : "#e53935"; // Zelená nebo červená
    feedbackElement.style.color = 'white';
    feedbackElement.style.padding = '14px 24px';
    feedbackElement.style.borderRadius = '8px';
    feedbackElement.style.position = 'fixed';
    feedbackElement.style.top = '10px';
    feedbackElement.style.left = '50%';
    feedbackElement.style.transform = 'translateX(-50%)';
    feedbackElement.style.zIndex = '9999';
    feedbackElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    feedbackElement.style.fontSize = '1rem';
    feedbackElement.style.maxWidth = '90vw';
    feedbackElement.style.textAlign = 'center';

    document.body.appendChild(feedbackElement);

    setTimeout(() => {
        feedbackElement.remove();
    }, 4000); // Zpráva zmizí po 4 sekundách
}

window.selectOption = selectOption;
window.confirmPracticeRating = confirmPracticeRating;

function selectOption(button) {
    const group = button.closest(".control-group"); // Najdeme rodičovskou skupinu (valence nebo arousal)
    if (!group) return;

    const buttons = group.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));

    button.classList.add('selected');
    group.dataset.selectedValue = button.dataset.value; // Nastavíme hodnotu dataset.selectedValue
}

function setupConfirmButton() {
    const confirmButton = document.getElementById("confirmButton");
    if (confirmButton) {
        confirmButton.addEventListener("click", () => {
            if (currentValence && currentArousal) {
                rateWord(currentValence, currentArousal);
            } else {
                alert("Musíte vybrat jak valenci, tak arousal.");
            }
        });
    } else {
        console.warn("❗ Tlačítko potvrdit nebylo nalezeno.");
    }
}
