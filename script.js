document.addEventListener("DOMContentLoaded", function() {
    console.log("✅ DOM plně načten!");

    if (window.location.pathname.includes("adjectiverating.html")) {
        const adjectiveDisplay = document.getElementById('adjectiveDisplay');
        if (!adjectiveDisplay) {
            console.error("❌ Element 'adjectiveDisplay' nebyl nalezen v DOMu!");
            return;
        }
        console.log("✅ Element 'adjectiveDisplay' nalezen:", adjectiveDisplay);

        setupConfirmButton();
        setupEventListeners();
        
        // Přidáme event listenery pro všechna rating tlačítka
        const ratingButtons = document.querySelectorAll('.rating-button');
        ratingButtons.forEach(button => {
            button.addEventListener('click', () => selectOption(button));
            button.addEventListener('touchstart', () => selectOption(button));
        });

        // Přidání event listeneru pro tlačítko odeslání demografických dat
        const submitDemographicButton = document.getElementById("submitDemographicButton");
        if (submitDemographicButton) {
            submitDemographicButton.addEventListener("click", saveUserData);
        }

        // Zavření modal okna
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

        // Načtení slov z Firestore
        fetchAdjectives();
    }
});

// Import Firebase modules from CDN
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

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function() {
    let userId = localStorage.getItem("userId"); // Získání uživatelského ID z LocalStorage

    if (!userId) {
        alert("Nebyl nalezen identifikátor účastníka. Pravděpodobně jste přeskočili dotazník.");
        window.location.href = "index.html";
    }
});

let currentWordIndex = 0;
const totalAdjectives = 15;
let words = [];
let currentValence = null;
let currentArousal = null;

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
            console.error("Chyba při ukládání do Firestore:", error);
        }
    } else {
        alert("Vyplňte všechna pole.");
    }
}

// Načtení slov z Firestore
async function fetchAdjectives() {
    console.log("✅ Načítám slova z Firestore...");
    try {
        const querySnapshot = await getDocs(collection(db, "adjectives"));
        console.log("🔍 Získaná data:", querySnapshot.docs.map(doc => doc.data())); // Debugging

        words = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (words.length === 0) {
            console.warn("⚠️ Nebyla načtena žádná slova!");
            document.getElementById("adjectiveDisplay").innerHTML = "<h2>Chyba: Nebyla nalezena žádná slova.</h2>";
            return;
        }

        shuffleArray(words); // Zamíchání slov
        displayWord();
    } catch (error) {
        console.error("❌ Chyba při načítání slov:", error);
        document.getElementById("adjectiveDisplay").innerHTML = "<h2>Chyba při načítání slov!</h2>";
    }
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
    if (words.length === 0) {
        console.error("❌ Žádná slova nejsou načtena!");
        document.getElementById("adjectiveDisplay").innerHTML = "<h2>Žádná dostupná slova!</h2>";
        return;
    }

    if (currentWordIndex < totalAdjectives) {
        const wordObj = words[currentWordIndex];
        console.log(`📝 Zobrazuji slovo: ${wordObj.word}`);

        document.getElementById("adjectiveDisplay").innerHTML = `<h2>${wordObj.word}</h2>`;
        document.getElementById("progress-text").innerText = `${currentWordIndex + 1}/${totalAdjectives}`;
    } else {
        console.log("✅ Všechna slova byla ohodnocena.");
        document.getElementById("adjectiveDisplay").innerHTML = `<h2>Děkujeme za hodnocení!</h2><p>Kontakt: Matias.Bunnik.s01@osu.cz</p>`;
        syncRatingsWithFirestore();
    }
}

// Hodnocení slov a uložení do LocalStorage
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
    ratings.push({ 
        userId,
        wordId: word.id,
        word: word.word,
        valence, 
        arousal, 
        timestamp: new Date().toISOString() 
    });

    localStorage.setItem("ratings", JSON.stringify(ratings));

    console.log(`Uloženo: ${word.word} - Valence: ${valence}, Arousal: ${arousal}`);

    nextWord();
}

// Synchronizace hodnocení s Firestore
async function syncRatingsWithFirestore() {
    const ratings = JSON.parse(localStorage.getItem('ratings')) || [];
    if (ratings.length === 0) return;

    try {
        for (let rating of ratings) {
            await addDoc(collection(db, "ratings"), rating);

            // Aktualizace počtu hodnocení v kolekci adjectives
            const wordRef = doc(db, "adjectives", rating.wordId);
            await updateDoc(wordRef, { evaluations: increment(1) });
        }

        localStorage.removeItem("ratings"); // Vyčištění po synchronizaci
        console.log("Hodnocení byla úspěšně synchronizována s Firestore.");
    } catch (error) {
        console.error("Chyba při synchronizaci hodnocení:", error);
    }
}

// Další slovo
function nextWord() {
    currentWordIndex++;
    if (currentWordIndex < totalAdjectives) {
        displayWord();
    } else {
        document.getElementById("adjectiveDisplay").innerHTML = `<h2>Děkujeme za účast!</h2><p>V případě dotazů mě kontaktujte na Matias.Bunnik.s01@osu.cz</p>`;
        submitRatingsToFirestore();
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
    button.parentElement.dataset.selectedValue = button.dataset.value; // Nastavení dataset.selectedValue
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
function selectOption(button) {
    // Resetuje výběr ve skupině tlačítek
    const buttons = button.parentElement.querySelectorAll('.rating-button');
    buttons.forEach(btn => btn.classList.remove('selected'));

    // Zvýrazní vybranou možnost
    button.classList.add('selected');
    button.parentElement.dataset.selectedValue = button.dataset.value; // Nastavení dataset.selectedValue
}

// Ujistíme se, že funkce je dostupná v `window`
window.selectOption = selectOption;

function confirmPracticeRating() {
    const practiceContainers = document.querySelectorAll('.practiceWordContainer');
    let allRated = true;

    practiceContainers.forEach(container => {
        const arousalGroup = container.querySelector('.control-group:nth-child(2)'); // Opraveno na správný index
        const valenceGroup = container.querySelector('.control-group:nth-child(1)'); // Opraveno na správný index

        if (!arousalGroup.dataset.selectedValue || !valenceGroup.dataset.selectedValue) {
            allRated = false;
        }
    });

    if (allRated) {
        showVisualFeedback('Hodnocení testovacích slov "Šťastný" a "Smutný" bylo úspěšně potvrzeno. Nyní můžete pokračovat k dotazníku.');
    } else {
        showVisualFeedback('Prosím, ohodnoťte obě testovací slova "Šťastný" a "Smutný" před potvrzením.');
    }
}

// Funkce pro zobrazení vizuální zpětné vazby
function showVisualFeedback(message) {
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'feedback-message';
    feedbackElement.innerText = message;
    document.body.appendChild(feedbackElement);

    setTimeout(() => {
        feedbackElement.remove();
    }, 3000);
}

// Explicitně nastavení funkcí do window
window.selectOption = selectOption;
window.confirmPracticeRating = confirmPracticeRating;

// Volání synchronizace při načtení stránky
window.addEventListener('load', syncRatingsWithFirestore);

async function submitRatingsToFirestore() {
    const ratings = JSON.parse(localStorage.getItem('ratings')) || [];
    if (ratings.length === 0) return;

    console.log("Odesílání hodnocení do Firestore:", ratings);

    for (const rating of ratings) {
        try {
            await addDoc(collection(db, "ratings"), rating);
        } catch (error) {
            console.error("Chyba při odesílání hodnocení:", error);
        }
    }

    // Vymažeme localStorage po odeslání
    localStorage.removeItem('ratings');

    // Zobrazení modálního okna
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'block';
    }
}
