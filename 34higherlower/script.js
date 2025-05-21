let characters = [];
let validCharacters = [];
let currentStreak = 0;
let veryHardMode = false;
let lastCategory = "mixed";
let lastAdvancedSeries = [];
let isAnimating = false;
let startedFromSettings = false;



const seenPairs = new Set();
const preloadedPostCounts = {};
const postCountCache = JSON.parse(localStorage.getItem("postCountCache") || "{}");

(async function preloadPostCounts() {
  try {
    const [easternRes, gamingRes, westernRes] = await Promise.all([
      fetch("eastern_media_characters.json"),
      fetch("gaming_characters.json"),
      fetch("western_media_characters.json")
    ]);

    const [easternCountsRes, gamingCountsRes, westernCountsRes] = await Promise.all([
      fetch("eastern_media_count.json"),
      fetch("gaming_count.json"),
      fetch("western_media_count.json")
    ]);

    const easternData = (await easternRes.json()).characters;
    const gamingData = (await gamingRes.json()).characters;
    const westernData = (await westernRes.json()).characters;

    const easternCounts = (await easternCountsRes.json()).characters;
    const gamingCounts = (await gamingCountsRes.json()).characters;
    const westernCounts = (await westernCountsRes.json()).characters;

    characters = [
      ...easternData.map(c => ({ ...c, category: "Eastern Media" })),
      ...gamingData.map(c => ({ ...c, category: "Gaming" })),
      ...westernData.map(c => ({ ...c, category: "Western Media" }))
    ];
    
    // Build preloadedPostCounts
    [...easternCounts, ...gamingCounts, ...westernCounts].forEach(entry => {
      preloadedPostCounts[entry.name] = entry.count;
    });

    console.log("Preloaded character counts:", Object.keys(preloadedPostCounts).length);

    populateSeriesOptions();
    
  } catch (error) {
    console.error("Failed to preload characters or counts:", error);
  }
})();



document.addEventListener("DOMContentLoaded", () => {
  const settingsButton = document.getElementById("settingsButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeSettings = document.getElementById("closeSettings");
  const startButton = document.getElementById("startButton");
  const veryHardButton = document.getElementById("veryHardButton");

  settingsButton.addEventListener("click", () => {
    settingsPanel.classList.add("open");
  });

  closeSettings.addEventListener("click", () => {
    settingsPanel.classList.remove("open");
  });

  startButton.addEventListener("click", async () => {
    veryHardMode = false;
    seenPairs.clear();
    await startGame();
  });

  veryHardButton.addEventListener("click", () => {
    veryHardMode = !veryHardMode;
    seenPairs.clear();
    currentStreak = 0;
    veryHardButton.textContent = veryHardMode ? "Disable Very Hard Mode" : "Enable Very Hard Mode";
    document.body.classList.toggle("very-hard-mode", veryHardMode);
    showPopupMessage(veryHardMode ? "Very Hard Mode ENABLED" : "Very Hard Mode DISABLED");
  });
  
  document.querySelectorAll("input[name='category']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      const advancedOptions = document.getElementById("advancedOptions");
      if (e.target.value === "advanced") {
        advancedOptions.style.display = "block";
      } else {
        advancedOptions.style.display = "none";
      }
    });
  
  });


});

  function showPopupMessage(message) {
   const popup = document.createElement("div");
   popup.className = "custom-popup";
   popup.textContent = message;
    document.body.appendChild(popup);

   setTimeout(() => {
      popup.classList.add("visible");
    }, 10); // slight delay to trigger animation

   setTimeout(() => {
      popup.classList.remove("visible");
    setTimeout(() => popup.remove(), 300); // clean up
  }, 3000);}

function encodeCharacterNameForSearch(name) {
  return name
    .replace(/'/g, "%26%23039%3B")
    .replace(/\+/g, "%2B")
    .replace(/ū/g, "%C5%AB")
    .replace(/ö/g, "%26ouml%3B");
}


document.addEventListener("change", (e) => {
  if (e.target.classList.contains("seriesCheckbox")) {
    updateAdvancedSeriesCount();
  }
});

document.querySelectorAll("input[name='category']").forEach(radio => {
  radio.addEventListener("change", () => {
    const advancedOptions = document.getElementById("advancedOptions");
    if (radio.value === "advanced") {
      advancedOptions.style.display = "block";
      updateAdvancedSeriesCount(); 
    } else {
      advancedOptions.style.display = "none";
      document.getElementById("selectedSeriesCount").style.display = "none";
    }
  });
});


document.getElementById("applySettings").addEventListener("click", () => {
  const selectedSeries = Array.from(document.querySelectorAll(".seriesCheckbox:checked"))
    .map(box => box.value);

  const selectedCategory = document.querySelector("input[name='category']:checked").value;

  const warnings = document.getElementById("settingsWarnings");
  warnings.textContent = "";

  if (selectedCategory === "advanced" && selectedSeries.length === 0) {
    warnings.textContent = "Please select at least one series.";
    return;
  }

  const filtered = selectedCategory === "advanced"
    ? characters.filter(char => selectedSeries.includes(char.series))
    : characters;

  if (filtered.length < 2) {
    warnings.textContent = "Not enough characters in the selected series to play.";
    return;
  }

  

  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressBarContainer");
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  getValidCharactersFromList(filtered, (progress) => {
    progressBar.style.width = `${progress}%`;
  }).then(valid => {
    progressContainer.style.display = "none";

    if (!valid || valid.length < 2) {
      warnings.textContent = "Not enough valid characters with posts found in your selection.";
      return;
    }

    validCharacters = valid;
    lastCategory = selectedCategory;
    lastAdvancedSeries = selectedSeries || [];
    currentStreak = 0;
    document.getElementById("settingsPanel").classList.remove("open");
    document.getElementById("startButton").style.display = "none"; 
    showNextRound();

  });
});

function decodeCharacterName(name) {
  return decodeURIComponent(
    name
      .replace(/%26%23039%3B/g, "'")
      .replace(/%2B/g, "+")
      .replace(/%C5%AB/g, "ū")
      .replace(/%26ouml%3B/g, "ö")
  );
}


function updateAdvancedSeriesCount() {
  const selected = Array.from(document.querySelectorAll(".seriesCheckbox:checked"));
  const total = selected.reduce((sum, box) => {
    const count = characters.filter(c => c.series === box.value).length;
    return sum + count;
  }, 0);

  const countContainer = document.getElementById("selectedSeriesCount");
  const numberEl = document.getElementById("seriesCountNumber");

  if (selected.length > 0) {
    numberEl.textContent = total;
    countContainer.style.display = "block";
  } else {
    countContainer.style.display = "none";
  }
}


function populateSeriesOptions() {
  const seriesSet = [...new Set(characters.map(char => char.series))].sort((a, b) => a.localeCompare(b));
  const seriesOptionsDiv = document.getElementById("seriesOptions");
  seriesOptionsDiv.innerHTML = "";

  seriesSet.forEach(series => {
    const id = `series-${series.replace(/\s+/g, '_').toLowerCase()}`;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" class="seriesCheckbox" value="${series}" /> ${series}
    `;
    seriesOptionsDiv.appendChild(label);
    seriesOptionsDiv.appendChild(document.createElement("br"));
  });

  const selectAll = document.getElementById("selectAllSeries");
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onclick = () => {
      const boxes = document.querySelectorAll(".seriesCheckbox");
      boxes.forEach(box => box.checked = selectAll.checked);
    };
  }
}

function animateCount(element, target, duration = 800, callback) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(progress * target);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target;
      if (callback) callback(); 
    }
  }

  requestAnimationFrame(update);
}



function copyShareResult() {
  const selectedCategoryValue = document.querySelector("input[name='category']:checked")?.value || "mixed";

  const categoryMap = {
    mixed: "Mixed",
    eastern: "Eastern Media",
    gaming: "Gaming",
    western: "Western Media",
    advanced: "Advanced Selection"
  };

  const categoryName = categoryMap[selectedCategoryValue] || "Unknown Mode";
  const emoji = veryHardMode ? "" : "";
  const modeTitle = veryHardMode ? "Very Hard Mode" : "R34 Guessing Game";

  let seriesInfo = "";

  if (selectedCategoryValue === "advanced") {
    const selectedSeries = Array.from(document.querySelectorAll(".seriesCheckbox:checked"))
      .map(box => box.value);
    if (selectedSeries.length > 0) {
      seriesInfo = `\nSeries: ${selectedSeries.join(", ")}`;
    }
  }

  const message = `${emoji} ${modeTitle} - ${categoryName}${seriesInfo}\nStreak: ${currentStreak}\n${"🟩".repeat(currentStreak)}${"⬛".repeat(Math.max(0, 8 - currentStreak))}\nhttps://doubletheblack.com/34higherlower/index.html`;

  navigator.clipboard.writeText(message).then(() => {
    showPopupMessage("Score copied to clipboard!");

  });
}



window.copyShareResult = copyShareResult;


document.getElementById("applySettings").addEventListener("click", () => {
  const selectedCategory = document.querySelector("input[name='category']:checked").value;
  const warnings = document.getElementById("settingsWarnings");
  warnings.textContent = "";

  let filtered = [];

  if (selectedCategory === "advanced") {
    const selectedSeries = Array.from(document.querySelectorAll(".seriesCheckbox:checked"))
      .map(box => box.value);

    if (selectedSeries.length === 0) {
      warnings.textContent = "Please select at least one series.";
      return;
    }

    filtered = characters.filter(char => selectedSeries.includes(char.series));
  } else {
    if (selectedCategory === "mixed") {
      filtered = characters;
    } else {
      const categoryMap = {
        eastern: "Eastern Media",
        gaming: "Gaming",
        western: "Western Media"
      };
      filtered = characters.filter(char => char.category === categoryMap[selectedCategory]);
    }
  }

  if (filtered.length < 2) {
    warnings.textContent = "Not enough characters in the selected series to play.";
    return;
  }

  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressBarContainer");
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  getValidCharactersFromList(filtered, (progress) => {
    progressBar.style.width = `${progress}%`;
  }).then(valid => {
    progressContainer.style.display = "none";

    if (!valid || valid.length < 2) {
      warnings.textContent = "Not enough valid characters with posts found in your selection.";
      return;
    }

    validCharacters = valid;
    document.getElementById("settingsPanel").classList.remove("open");
    showNextRound();
  });
});


function populateSeriesOptions() {
  const seriesSet = [...new Set(characters.map(char => char.series))].sort((a, b) => a.localeCompare(b));
  const seriesOptionsDiv = document.getElementById("seriesOptions");
  seriesOptionsDiv.innerHTML = "";

  seriesSet.forEach(series => {
    const id = `series-${series.replace(/\s+/g, '_').toLowerCase()}`;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" class="seriesCheckbox" value="${series}" /> ${series}
    `;
    seriesOptionsDiv.appendChild(label);
    seriesOptionsDiv.appendChild(document.createElement("br"));
  });

  const selectAll = document.getElementById("selectAllSeries");
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onclick = () => {
      const boxes = document.querySelectorAll(".seriesCheckbox");
      boxes.forEach(box => box.checked = selectAll.checked);
    };
  }
}


async function fetchPostCount(characterName, retries = 3) {
  const encodedName = encodeCharacterNameForSearch(characterName); 
  if (postCountCache[characterName] !== undefined) {
    return postCountCache[characterName];
  }

  if (preloadedPostCounts[characterName] !== undefined) {
    const count = preloadedPostCounts[characterName];
    postCountCache[characterName] = count;
    localStorage.setItem("postCountCache", JSON.stringify(postCountCache));
    return count;
  }

  const url = `https://api.rule34.xxx/index.php?page=dapi&s=tag&q=index&name=${characterName}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const text = await response.text();
    const match = text.match(/count="(\d+)"/);
    const count = match ? parseInt(match[1], 10) : 0;

    postCountCache[characterName] = count;
    localStorage.setItem("postCountCache", JSON.stringify(postCountCache));
    return count;
  } catch (error) {
    console.error(`Error fetching count for ${characterName}:`, error);
    if (retries > 0) return await fetchPostCount(characterName, retries - 1);
    postCountCache[characterName] = 0;
    localStorage.setItem("postCountCache", JSON.stringify(postCountCache));
    return 0;
  }
}


function withinVeryHardRange(a, b) {
  const diff = Math.abs(a - b);
  const max = Math.max(a, b);
  const digits = max.toString().length;
  const threshold = Math.pow(10, digits - 2) * 5;
  return diff <= threshold && diff !== 0;
}

function getTwoUniqueCharacters() {
  const shuffled = validCharacters.sort(() => 0.5 - Math.random());
  if (!veryHardMode) {
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const key = [shuffled[i].name, shuffled[j].name].sort().join("|");
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          return [shuffled[i], shuffled[j]];
        }
      }
    }
    return shuffled.slice(0, 2);
  }

  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const a = shuffled[i];
      const b = shuffled[j];
      const key = [a.name, b.name].sort().join("|");
      if (!seenPairs.has(key) && withinVeryHardRange(a.count, b.count)) {
        seenPairs.add(key);
        return [a, b];
      }
    }
  }
  return shuffled.slice(0, 2);
}

function downloadCache() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postCountCache));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "postCountCache.json");
  dlAnchor.click();
}


async function getValidCharacters(limit = 50) {
  const tempValidCharacters = [];
  const total = Math.min(limit, characters.length);
  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressBarContainer");

  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  let completed = 0;
  const shuffled = characters.sort(() => 0.5 - Math.random()).slice(0, total);

  const fetchPromises = shuffled.map(async (char) => {
    const count = await fetchPostCount(char.name);
    completed++;
    progressBar.style.width = `${Math.floor((completed / total) * 100)}%`;
    if (count > 0) {
      tempValidCharacters.push({ name: char.name, series: char.series, count });
    }
  });

  await Promise.allSettled(fetchPromises);
  progressContainer.style.display = "none";
  return tempValidCharacters.length >= 2 ? tempValidCharacters : null;
}

async function startGame(category = lastCategory, seriesList = lastAdvancedSeries) {
  const resultEl = document.getElementById("result");
  resultEl.textContent = "Loading characters...";
  currentStreak = 0;

  document.getElementById("startButton").style.display = "none";

  let filtered = [];

  if (category === "advanced") {
    filtered = characters.filter(char => seriesList.includes(char.series));
  } else if (category === "mixed") {
    filtered = characters;
  } else {
    const categoryMap = {
      eastern: "Eastern Media",
      gaming: "Gaming",
      western: "Western Media"
    };
    filtered = characters.filter(char => char.category === categoryMap[category]);
  }

  document.getElementById("shareButton").style.display = "none";

  

  validCharacters = await getValidCharactersFromList(filtered, (progress) => {
    const progressBar = document.getElementById("progressBar");
    const progressContainer = document.getElementById("progressBarContainer");
    progressContainer.style.display = "block";
    progressBar.style.width = `${progress}%`;
  });
  
  
  document.getElementById("progressBarContainer").style.display = "none";
  
  if (!validCharacters || validCharacters.length < 2) {
    resultEl.textContent = "No valid characters found!";
    if (!isAnimating) {
      if (!startedFromSettings) {
        document.getElementById("startButton").style.display = "inline-block";
      }
      
    }
    return;
  }
  

  resultEl.textContent = "";
  showNextRound();
}


function showNextRound() {
  if (isAnimating) return; 

  const nextButton = document.getElementById("nextButton");
  nextButton.style.display = "none";
  document.getElementById("feedbackText").textContent = "";
  document.getElementById("choices").innerHTML = "";

  if (validCharacters.length < 2) {
    document.getElementById("result").textContent = "Not enough characters to continue!";
    return;
  }

  const [char1, char2] = getTwoUniqueCharacters();

  function escapeForHTML(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  document.getElementById("choices").innerHTML = `
    <div class="choice-group">
      <button class="choice" onclick="checkAnswer(${char1.count}, ${char2.count}, '${escapeForHTML(char1.name)}')">
        ${decodeCharacterName(char1.name).replace(/_/g, ' ')}<br><small>${char1.series}</small>
      </button>
      <button class="search-button" onclick="searchCharacter('${escapeForHTML(char1.name)}', '${escapeForHTML(char1.series)}')">🔍</button>
    </div>
    <div class="choice-group">
      <button class="choice" onclick="checkAnswer(${char2.count}, ${char1.count}, '${escapeForHTML(char2.name)}')">
        ${decodeCharacterName(char2.name).replace(/_/g, ' ')}<br><small>${char2.series}</small>
      </button>
      <button class="search-button" onclick="searchCharacter('${escapeForHTML(char2.name)}', '${escapeForHTML(char2.series)}')">🔍</button>
    </div>
  `;
}


function searchCharacter(name, series) {
  const decodedName = decodeURIComponent(name).replace(/_/g, ' ');
  const cleanedName = decodedName.replace(/[^a-zA-Z0-9\s]/g, '');
  const cleanedSeries = series.replace(/[^a-zA-Z0-9\s]/g, '');
  const query = `${cleanedName} from ${cleanedSeries}`;
  const encodedQuery = encodeURIComponent(query);
  window.open(`https://www.google.com/search?q=${encodedQuery}`, "_blank");
}





document.getElementById("clearCache").addEventListener("click", () => {
  localStorage.removeItem("postCountCache");
  Object.keys(postCountCache).forEach(key => delete postCountCache[key]);
  alert("Post count cache cleared!");
});


function getTwoDistinctColors() {
  const colors = [
    "red", "green", "blue",
    "cyan", "magenta", "yellow",
    "orange", "chartreuse", "springgreen", "violet", "rose"
  ];
  const shuffled = colors.sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled.find(color => color !== shuffled[0])];
}

function checkAnswer(choiceCount, otherCount, chosenName) {
  const shareButton = document.getElementById("shareButton");
  const nextButton = document.getElementById("nextButton");
  const feedbackText = document.getElementById("feedbackText");
  if (isAnimating) return;
  isAnimating = true;

  const chosenText = `${decodeCharacterName(chosenName).replace(/_/g, ' ')} has ${choiceCount} posts.`;
  const otherChar = validCharacters.find(c => c.count === otherCount);
  const otherText = otherChar ? `${otherChar.name.replace(/_/g, ' ')} has ${otherCount} posts.` : '';

  const chosenNameDisplay = decodeCharacterName(chosenName).replace(/_/g, ' ');
  const otherNameDisplay = otherChar ? decodeCharacterName(otherChar.name).replace(/_/g, ' ') : '';

  const [color1, color2] = getTwoDistinctColors();
  const colorClass1 = `color-${color1}`;
  const colorClass2 = `color-${color2}`;

  if (choiceCount >= otherCount) {
    currentStreak++;
    document.getElementById("result").textContent = `Correct! Streak: ${currentStreak}`;
    
    feedbackText.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 40px;">
        <div><strong>${chosenNameDisplay}</strong><br><span class="count ${colorClass1}" id="chosenCount">0</span> posts</div>
        <div><strong>${otherNameDisplay}</strong><br><span class="count ${colorClass2}" id="otherCount">0</span> posts</div>
      </div>
    `;

    if (otherChar) {
      const chosenEl = document.getElementById("chosenCount");
      const otherEl = document.getElementById("otherCount");
      animateCount(chosenEl, choiceCount);
      animateCount(otherEl, otherCount, 800, () => {
        document.getElementById("result").textContent = `Correct! Streak: ${currentStreak}`;
        setTimeout(() => {
          isAnimating = false;
          nextButton.disabled = false;
          nextButton.style.display = "inline-block";
          shareButton.style.display = "none";
          document.getElementById("choices").innerHTML = "";
        }, 0);
      });
    }

    document.getElementById("choices").innerHTML = "";
    nextButton.style.display = "inline-block";
    shareButton.style.display = "none";

  } else {
    document.getElementById("result").textContent = `Wrong! Game Over. Streak: ${currentStreak}`;
    
    feedbackText.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 40px;">
        <div><strong>${chosenNameDisplay}</strong><br><span class="count ${colorClass1}" id="chosenCount">0</span> posts</div>
        <div><strong>${otherNameDisplay}</strong><br><span class="count ${colorClass2}" id="otherCount">0</span> posts</div>
      </div>
    `;

    if (otherChar) {
      const chosenEl = document.getElementById("chosenCount");
      const otherEl = document.getElementById("otherCount");
      animateCount(chosenEl, choiceCount);
      animateCount(otherEl, otherCount, 800, () => {
        document.getElementById("result").textContent = `Wrong! Game Over. Streak: ${currentStreak}`;
        setTimeout(() => {
          isAnimating = false;
          shareButton.style.display = "inline-block";
          nextButton.style.display = "none";
          if (!startedFromSettings) {
            document.getElementById("startButton").style.display = "inline-block";
          }
        }, 0);
      });
    }

    document.getElementById("choices").innerHTML = `<button onclick="restartGame()">Restart</button>`;
    shareButton.style.display = "inline-block";
    nextButton.style.display = "none";
    if (!startedFromSettings) {
      document.getElementById("startButton").style.display = "inline-block";
    }
  }
}


function restartGame() {
  console.log("Restarting game with previous filters...");
  seenPairs.clear();
  isAnimating = false;
  startedFromSettings = false; // Reset it here

  document.body.classList.toggle("very-hard-mode", veryHardMode);

  document.getElementById("startButton").style.display = "none";
  document.getElementById("shareButton").style.display = "none";
  document.getElementById("nextButton").style.display = "none";
  document.getElementById("choices").innerHTML = "";
  document.getElementById("feedbackText").textContent = "";
  document.getElementById("result").textContent = "Loading characters...";

  startGame(lastCategory, lastAdvancedSeries);
}


async function getValidCharactersFromList(charList, onProgress) {
  const temp = [];
  const total = charList.length;

  for (let i = 0; i < total; i++) {
    const char = charList[i];
    const count = await fetchPostCount(char.name);
    if (count > 0) {
      temp.push({ name: char.name, series: char.series, count });
    }
    if (typeof onProgress === "function") {
      onProgress(Math.floor(((i + 1) / total) * 100));
    }
  }

  if (veryHardMode) {
    const validPairs = new Set();
    const filtered = [];

    for (let i = 0; i < temp.length; i++) {
      for (let j = i + 1; j < temp.length; j++) {
        if (withinVeryHardRange(temp[i].count, temp[j].count)) {
          validPairs.add(temp[i].name);
          validPairs.add(temp[j].name);
        }
      }
    }

    return temp.filter(char => validPairs.has(char.name));
  }

  return temp;
}