let currentStreak = 0;
let characters = [];
let currentCharacter = null;
let selectedSeries = localStorage.getItem("selectedSeries") || "all";
let selectedCategory = localStorage.getItem("selectedCategory") || "mixed";
let usedCharacters = new Set();
let longestStreaks = JSON.parse(localStorage.getItem("longestStreaks") || "{}");
let emojiHistory = [];

async function loadCharacters() {
  try {
    characters = [];
    usedCharacters.clear();
    const urls = [];

    if (selectedCategory === "eastern") {
      urls.push("eastern_media_characters.json");
    } else if (selectedCategory === "gaming") {
      urls.push("gaming_characters.json");
    } else if (selectedCategory === "western") {
      urls.push("western_media_characters.json");
    } else {
      urls.push(
        "eastern_media_characters.json",
        "gaming_characters.json",
        "western_media_characters.json"
      );
    }

    for (const url of urls) {
      const response = await fetch(url);
      const data = await response.json();
      characters.push(...data.characters);
    }

    populateSeriesDropdown();

    currentCharacter = getRandomCharacter();

    displayCharacter(currentCharacter.name);

    await fetchPostCount();

  } catch (error) {
    console.error("Error loading characters:", error);
  }
}



function populateSeriesDropdown() {
  const select = document.getElementById("series-filter");
  select.innerHTML = '<option value="all">All</option>';

  const seriesCount = {};

  characters.forEach(c => {
    if (!seriesCount[c.series]) {
      seriesCount[c.series] = 0;
    }
    seriesCount[c.series]++;
  });

  Object.keys(seriesCount)
    .filter(series => seriesCount[series] > 15)
    .sort((a, b) => a.localeCompare(b))
    .forEach(series => {
      const option = document.createElement("option");
      option.value = series;
      option.textContent = series;
      select.appendChild(option);
    });

  select.value = selectedSeries;
}

function getRandomCharacter() {
  const filtered = characters.filter(c => selectedSeries === "all" || c.series === selectedSeries);
  const unused = filtered.filter(c => !usedCharacters.has(c.name));

  if (unused.length === 0) {
    document.getElementById("feedback").textContent = `You've guessed all characters in "${selectedSeries}". Streak has been reset!`;
    currentStreak = 0;
    usedCharacters.clear();
    updateStreakDisplay();
    return getRandomCharacter();
  }

  const pick = unused[Math.floor(Math.random() * unused.length)];
  usedCharacters.add(pick.name);
  return pick;
}

selectedCategory = "mixed";
function getDailyCharacter() {
    if (characters.length === 0) return null;
  
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = daySeed % characters.length;
  
    return characters[index];
  }
  

  function displayCharacter(name) {
    const display = document.getElementById("character-name");
    const seriesDisplay = document.getElementById("character-series");
  
    const character = characters.find(c => c.name === name);
  
    display.innerHTML = `
      ${name.replace(/_/g, " ")}
    `;
  
    seriesDisplay.textContent = character ? `Series: ${character.series}` : "";
  

  
    const longestDisplay = document.getElementById("longest");
    if (character) {
      const streak = longestStreaks[character.series] || 0;
      longestDisplay.textContent = `Longest (${character.series}): ${streak}`;
    } else {
      longestDisplay.textContent = "";
    }
  }

async function fetchPostCount() {
  const searchName = currentCharacter.alias || currentCharacter.name;
  const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(searchName)}&limit=1`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/<posts count="(\d+)"/);
    if (!match) {
      document.getElementById("feedback").textContent = `No data found for "${searchName}"`;
      return;
    }

    const postCount = parseInt(match[1], 10);
    setupPostCountGame(postCount);
  } catch (error) {
    console.error("Failed to fetch post count:", error);
    document.getElementById("feedback").textContent = "Error fetching post count.";
  }
}

function showPopup(message) {
  const popupOverlay = document.getElementById("popup-overlay");
  const popupMessage = document.getElementById("popup-message");
  popupMessage.textContent = message;
  popupOverlay.style.display = "flex";
}

document.getElementById("popup-close").addEventListener("click", () => {
  document.getElementById("popup-overlay").style.display = "none";
});


let simulatedPostCount = 0;
let maxAttempts = 0;
let attemptsLeft = 0;

function setupPostCountGame(postCount) {
  simulatedPostCount = postCount;
  const digitCount = simulatedPostCount.toString().length;
  maxAttempts = digitCount <= 3 ? 4 : Math.min(4 + (digitCount - 3), 7);
  attemptsLeft = maxAttempts;

  document.getElementById("guess-history").innerHTML = "";
  updateAttemptsText();
  generateGuessSlots(digitCount);
}

function updateAttemptsText() {
  document.getElementById("attempts-left").textContent = `Attempts Left: ${attemptsLeft}`;
}

function generateGuessSlots(digitCount, guess = "", colors = []) {
  const guessHistory = document.getElementById("guess-history");
  const row = document.createElement("div");
  row.classList.add("guess-row");

  for (let i = 0; i < digitCount; i++) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("guess-slot");

    const front = document.createElement("div");
    front.classList.add("front");
    front.textContent = "";

    const back = document.createElement("div");
    back.classList.add("back");
    if (guess) {
      back.textContent = guess[i];
      back.style.backgroundColor = colors[i];
    }

    wrapper.appendChild(front);
    wrapper.appendChild(back);

    if (guess) {
      setTimeout(() => {
        wrapper.classList.add("flip");
      }, i * 300);
    }

    row.appendChild(wrapper);
  }

  guessHistory.appendChild(row);
}

function handleGuess() {
  const input = document.getElementById("guess-input");
  const guess = input.value.trim();
  if (!/^\d+$/.test(guess)) {
    document.getElementById("feedback").textContent = "Please enter a valid number!";
    return;
  }
  if (guess.length !== simulatedPostCount.toString().length) {
    document.getElementById("feedback").textContent = `Enter a ${simulatedPostCount.toString().length}-digit number.`;
    return;
  }

  const actual = simulatedPostCount.toString();
  let allCorrect = true;
  const colors = [];

  for (let i = 0; i < guess.length; i++) {
    const digitGuess = parseInt(guess[i]);
    const digitActual = parseInt(actual[i]);
    const diff = Math.abs(digitGuess - digitActual);

    let color = "#8B0000";
    if (digitGuess === digitActual) {
      color = "#228B22";
    } else if (diff <= 2) {
      color = "#FFD700";
    } else if (diff <= 5) {
      color = "#B22222";
    }

    if (digitGuess !== digitActual) allCorrect = false;
    colors.push(color);
  }

  emojiHistory.push([...colors]);
  generateGuessSlots(guess.length, guess, colors);
  attemptsLeft--;
  updateAttemptsText();

  if (allCorrect) {
    currentStreak++;
    const series = currentCharacter.series;
    if (!longestStreaks[series] || currentStreak > longestStreaks[series]) {
      longestStreaks[series] = currentStreak;
      localStorage.setItem("longestStreaks", JSON.stringify(longestStreaks));
    }

    document.getElementById("feedback").textContent = `Correct! ${currentCharacter.name} has ${simulatedPostCount} posts.`;
    document.getElementById("streak").textContent = `Streak: ${currentStreak}`;
    document.getElementById("longest").textContent = `Longest (${series}): ${longestStreaks[series]}`;
    disableInput();
  } else if (attemptsLeft <= 0) {
    currentStreak = 0;
    document.getElementById("feedback").textContent = `Out of attempts! The correct number was ${simulatedPostCount}.`;
    updateStreakDisplay();
    disableInput();
  } else {
    document.getElementById("feedback").textContent = "Not quite, try again!";
  }

  input.value = "";
  showShareButton();

   if (isDailyMode()) {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("lastDailyCompleted", today);
    document.getElementById("daily-btn").disabled = true;
    document.getElementById("daily-btn").textContent = "Daily Completed";
  }
}

function updateStreakDisplay() {
  document.getElementById("streak").textContent = `Streak: ${currentStreak}`;
  const series = currentCharacter?.series;
  if (series && longestStreaks[series]) {
    document.getElementById("longest").textContent = `Longest (${series}): ${longestStreaks[series]}`;
  }
}

function disableInput() {
  document.getElementById("guess-input").disabled = true;
  document.getElementById("submit-guess").disabled = true;
  document.getElementById("restart-btn").style.display = "inline-block";
}

function restartGame() {
  document.getElementById("restart-btn").style.display = "none";
  document.getElementById("guess-input").disabled = false;
  document.getElementById("submit-guess").disabled = false;
  document.getElementById("guess-input").value = "";
  document.getElementById("feedback").textContent = "";
  const oldShareBtn = document.getElementById("share-btn");
  if (oldShareBtn) oldShareBtn.remove();
  updateStreakDisplay();
  loadCharacters();
}


function showShareButton() {
  if (document.getElementById("share-btn")) return;
  const shareButton = document.createElement("button");
  shareButton.textContent = " Share your R34dle!";
  shareButton.id = "share-btn";
  document.getElementById("game").appendChild(shareButton);

  shareButton.addEventListener("click", () => {
    const emojiMap = {
      green: "🟩",
      yellow: "🟨",
      red: "🟥",
      darkred: "⬛",
      "#228B22": "🟩",
      "#FFD700": "🟨",
      "#B22222": "🟥",
      "#8B0000": "⬛"
    };

    const result = emojiHistory.map(row => row.map(c => emojiMap[c] || "⬛").join("")).join("\n");
    const text = `R34dle – ${currentCharacter.name.replace(/_/g, " ")}\n\n${result}`;
    navigator.clipboard.writeText(text).then(() => {
      shareButton.textContent = "Copied to clipboard!";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("daily-btn").addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const lastCompleted = localStorage.getItem("lastDailyCompleted");

  if (lastCompleted === today) {
    document.getElementById("feedback").textContent = "You've already completed today's daily.";
    return;
  }

  currentCharacter = getDailyCharacter();
  if (!currentCharacter) {
    document.getElementById("feedback").textContent = "No character for today.";
    return;
  }

  document.getElementById("restart-btn").style.display = "none";
  document.getElementById("guess-input").disabled = false;
  document.getElementById("submit-guess").disabled = false;
  document.getElementById("guess-input").value = "";
  document.getElementById("feedback").textContent = "";
  const oldShareBtn = document.getElementById("share-btn");
  if (oldShareBtn) oldShareBtn.remove();

  displayCharacter(currentCharacter.name);
  await fetchPostCount();
});
  document.getElementById("series-filter").addEventListener("change", e => {
    selectedSeries = e.target.value;
    localStorage.setItem("selectedSeries", selectedSeries);
    restartGame();
  });

  document.getElementById("apply-btn").addEventListener("click", () => {
  restartGame();
  document.getElementById("sidebar").classList.remove("show"); 
});

document.getElementById("close-sidebar-btn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("show");
});


  document.getElementById("category-filter").addEventListener("change", e => {
    selectedCategory = e.target.value;
    localStorage.setItem("selectedCategory", selectedCategory);
  
    const inGameSearchBtn = document.getElementById("search-btn");
    if (inGameSearchBtn) {
      inGameSearchBtn.style.display = selectedCategory === "search" ? "none" : "inline-block";
    }
  
    selectedSeries = "all";
    localStorage.setItem("selectedSeries", selectedSeries);
  
    if (selectedCategory === "search") {
      document.getElementById("series-filter").style.display = "none";
      document.getElementById("series-label").style.display = "none";
      document.getElementById("search-container").style.display = "block";
    } else {
      document.getElementById("series-filter").style.display = "block";
      document.getElementById("series-label").style.display = "block";
      document.getElementById("search-container").style.display = "none";
      restartGame();
    }
  });
  

  document.getElementById("submit-guess").addEventListener("click", handleGuess);
  document.getElementById("guess-input").addEventListener("keydown", e => {
    if (e.key === "Enter") handleGuess();
  });

  document.getElementById("search-input").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const searchResults = document.getElementById("search-results");
  
    if (!query) {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }
  
    const matches = characters.filter(c => 
      c.name.toLowerCase().includes(query.replace(/\s+/g, "_")) || 
      (c.alias && c.alias.toLowerCase().includes(query.replace(/\s+/g, "_")))
    );
  
    if (matches.length === 0) {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }
  
    searchResults.innerHTML = matches.slice(0, 10).map(c => `
      <div class="search-result" style="padding: 5px; cursor: pointer;">${c.name.replace(/_/g, " ")} (${c.series})</div>
    `).join("");
    searchResults.style.display = "block";
  
    document.querySelectorAll(".search-result").forEach((el, idx) => {
      el.addEventListener("click", () => {
        currentCharacter = matches[idx];
        displayCharacter(currentCharacter.name);
        fetchPostCount();
        searchResults.style.display = "none";
        document.getElementById("search-input").value = "";
      });
    });
  });
  

  document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("restart-btn").style.display = "none";
    document.getElementById("guess-input").disabled = false;
    document.getElementById("submit-guess").disabled = false;
    document.getElementById("guess-input").value = "";
    document.getElementById("feedback").textContent = "";
    updateStreakDisplay();
    const oldShareBtn = document.getElementById("share-btn");
    if (oldShareBtn) oldShareBtn.remove();
    loadCharacters();
  });

  document.getElementById("hamburger").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("show");
  });

  document.getElementById("search-btn").addEventListener("click", () => {
    if (currentCharacter) {
      const searchName = currentCharacter.name.replace(/_/g, " ");
      const searchSeries = currentCharacter.series;
      const searchQuery = `${searchName} from ${searchSeries}`;
      const encodedQuery = encodeURIComponent(searchQuery);
      window.open(`https://www.google.com/search?q=${encodedQuery}`, "_blank");
    }
  });
  

document.getElementById("daily-btn").addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const lastCompleted = localStorage.getItem("lastDailyCompleted");

  if (lastCompleted === today) {
    document.getElementById("feedback").textContent = "You've already completed today's daily.";
    return;
  }

  currentCharacter = getDailyCharacter();
  if (!currentCharacter) {
    document.getElementById("feedback").textContent = "No character for today.";
    return;
  }

  document.getElementById("restart-btn").style.display = "none";
  document.getElementById("guess-input").disabled = false;
  document.getElementById("submit-guess").disabled = false;
  document.getElementById("guess-input").value = "";
  document.getElementById("feedback").textContent = "";
  const oldShareBtn = document.getElementById("share-btn");
  if (oldShareBtn) oldShareBtn.remove();

  displayCharacter(currentCharacter.name);
  await fetchPostCount();
});


  document.getElementById("rules-btn").addEventListener("click", () => {
     showPopup("R34dle Rules:\n\n• Guess the Rule34 post count!\n• Hints: green = exact, yellow = close, red = off.\n• Get it right before you're out of attempts!\n• Try daily mode once per day!");
  });

(function checkDailyCompletion() {
  const today = new Date().toISOString().slice(0, 10);
  const lastPlayed = localStorage.getItem("lastDailyCompleted");
  if (lastPlayed === today) {
    const dailyBtn = document.getElementById("daily-btn");
    if (dailyBtn) {
      dailyBtn.disabled = true;
      dailyBtn.textContent = "Daily Completed";
    }
    }
  })();
  

  loadCharacters();
});
