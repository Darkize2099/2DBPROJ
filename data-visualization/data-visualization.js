let categoryData = {
  "Eastern Media": {},
  "Gaming": {},
  "Western Media": {}
};

let categoryTotals = {
  "Eastern Media": 0,
  "Gaming": 0,
  "Western Media": 0
};

let chartHistory = [];
let currentSortMode = "alpha"; // default
let lastChartConfig = null;




const excludedSeries = ["Anime", "Series", "The Series", undefined, null, ""];

const colorPalette = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
  '#8B0000', '#008080', '#800080', '#B8860B', '#20B2AA', '#2E8B57',
  '#DA70D6', '#D2691E', '#DC143C', '#00CED1', '#9400D3', '#3CB371',
  '#FF4500', '#6A5ACD', '#A0522D', '#FF1493', '#2F4F4F', '#7FFF00',
  '#1E90FF', '#FFD700', '#CD5C5C', '#228B22', '#FF69B4', '#87CEEB'
];

let currentChart;
let rawCharacterData = [];

let chartSize = 600; // initial size

function resizeChart(direction) {
  const step = 100;
  const minSize = 120;
  const maxSize = 1200;

  if (direction === 'increase') {
    chartSize = Math.min(chartSize + step, maxSize);
  } else if (direction === 'decrease') {
    chartSize = Math.max(chartSize - step, minSize);
  }

  const canvas = document.getElementById("mainChart");
  canvas.style.width = `${chartSize}px`;
  canvas.style.height = `${chartSize}px`;

  if (currentChart) {
    currentChart.resize();
  }

}




window.addEventListener("DOMContentLoaded", loadData);

async function loadData() {
  const [easternRes, gamingRes, westernRes] = await Promise.all([
    fetch("eastern_media_count.json"),
    fetch("gaming_count.json"),
    fetch("western_media_count.json")
  ]);

  const easternData = await easternRes.json();
  const gamingData = await gamingRes.json();
  const westernData = await westernRes.json();

  rawCharacterData = [
    ...easternData.characters.map(c => ({ ...c, category: "Eastern Media" })),
    ...gamingData.characters.map(c => ({ ...c, category: "Gaming" })),
    ...westernData.characters.map(c => ({ ...c, category: "Western Media" }))
  ];

  processCategoryData("Eastern Media", easternData.characters);
  processCategoryData("Gaming", gamingData.characters);
  processCategoryData("Western Media", westernData.characters);

  createPieChart("Category Breakdown", categoryTotals, Object.keys(categoryTotals), Object.values(categoryTotals), handleCategoryClick);
}

function processCategoryData(category, data) {
  data.forEach(({ series, count }) => {
    if (typeof series !== 'string') return;

    const formatted = formatLabel(series);
    if (!formatted || excludedSeries.includes(formatted)) return;

    categoryData[category][formatted] = (categoryData[category][formatted] || 0) + count;
    categoryTotals[category] += count;
  });
}


function formatLabel(str) {
  if (!str || typeof str !== 'string') return null;

  let cleaned = str.trim();


  const keepParens = /\w+\([^)]+\)/.test(cleaned);

  if (!keepParens) {
    cleaned = cleaned.replace(/\(.*?\)/g, ''); // remove parentheticals if not meaningful
  }

  cleaned = cleaned
    .replace(/_/g, ' ')
    .replace(/%26.*?%3B/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.toLowerCase() === 'undefined') return null;

  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}


function handleCategoryClick(index) {
  const category = Object.keys(categoryTotals)[index];
  const seriesData = categoryData[category];
  createPieChart(`${category} Series Breakdown`, seriesData, Object.keys(seriesData), Object.values(seriesData), i => {
    const series = Object.keys(seriesData)[i];
    showCharacterBreakdown(category, series);
  });
}

function showSeriesBreakdown(category) {
  const seriesData = categoryData[category];
  createPieChart(`${category} Series Breakdown`, seriesData, Object.keys(seriesData), Object.values(seriesData), i => {
    const series = Object.keys(seriesData)[i];
    showCharacterBreakdown(category, series);
  });
}


function showCharacterBreakdown(category, seriesLabel) {
  const characters = rawCharacterData.filter(c => {
    const s = formatLabel(c.series);
    return c.category === category && s === seriesLabel;
  });

  const validCharacters = characters.filter(c => {
    return typeof c.name === 'string' && !!formatLabel(c.name) && typeof c.count === 'number';
  });

  const labels = validCharacters.map(c => formatLabel(c.name));
  const data = validCharacters.map(c => c.count);

  if (labels.length === 0 || data.length === 0) {
    alert("No valid character data found for this series.");
    return;
  }

  createPieChart(`${seriesLabel} Characters`, {}, labels, data);
}



function createPieChart(title, sourceData, labels, data, onClickHandler = null) {
  lastChartConfig = { title, sourceData, labels, data, onClickHandler };

  const canvas = document.getElementById("mainChart");

canvas.width = chartSize;
canvas.height = chartSize;
canvas.style.width = `${chartSize}px`;
canvas.style.height = `${chartSize}px`;
  const ctx = canvas.getContext("2d");

  if (currentChart) currentChart.destroy();

  const backBtn = document.getElementById("backButton");
  if (chartHistory.length > 0) {
    backBtn.style.display = "inline-block";
  } else {
    backBtn.style.display = "none";
  }
  currentChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
      data: data,
       backgroundColor: generateColors(labels.length),
       borderWidth: 0 
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      layout: { padding: 40 },
plugins: {
  legend: {
    display: false 
  },
  title: {
    display: true,
    text: title,
    font: { size: 22 }
  },

        tooltip: {
          callbacks: {
            label: context => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const value = context.parsed;
              const percent = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percent}%)`;
            }
          }
        }
         },
      
      
      onClick: (e, elements, chart) => {
        if (
          Array.isArray(elements) &&
          elements.length > 0 &&
          elements[0] &&
          typeof elements[0].index === 'number'
        ) {
          if (typeof onClickHandler === 'function') {
            // Save current state
            onClickHandler(elements[0].index);
            

          }
        }
      }
    }
  });


  
    const legendContainer = document.getElementById("customLegend");
  legendContainer.innerHTML = "";

  document.getElementById("sortLegend").addEventListener("change", (e) => {
  currentSortMode = e.target.value;
  createPieChart(title, sourceData, labels, data, onClickHandler);
  });


const zipped = labels.map((label, i) => ({
  label,
  value: currentChart.data.datasets[0].data[i],
  color: currentChart.data.datasets[0].backgroundColor[i],
  index: i

  
}));

if (currentSortMode === "alpha") {
  zipped.sort((a, b) => a.label.localeCompare(b.label));
} else if (currentSortMode === "desc") {
  zipped.sort((a, b) => b.value - a.value);
} else if (currentSortMode === "asc") {
  zipped.sort((a, b) => a.value - b.value);
}


zipped.forEach(({ label, color, index }) => {
  const item = document.createElement("div");
  item.className = "legend-item";

  const colorBox = document.createElement("div");
  colorBox.className = "legend-color-box";
  colorBox.style.backgroundColor = color;

const labelText = document.createElement("span");
labelText.textContent = label;
labelText.className = "legend-label";

const toggleBtn = document.createElement("button");
toggleBtn.textContent = "❌";
toggleBtn.className = "legend-toggle";

let hidden = false;
let originalValue = currentChart.data.datasets[0].data[index];

toggleBtn.addEventListener("click", () => {
  hidden = !hidden;
  if (hidden) {
    // Hide the slice
    currentChart.data.datasets[0].data[index] = 0;
    labelText.style.textDecoration = "line-through";
    toggleBtn.textContent = "✅";
  } else {
    // Restore the slice
    currentChart.data.datasets[0].data[index] = originalValue;
    labelText.style.textDecoration = "none";
    toggleBtn.textContent = "❌";
  }
  currentChart.update();
});

item.appendChild(colorBox);
item.appendChild(labelText);
item.appendChild(toggleBtn);


  item.addEventListener("mouseenter", () => {
    currentChart.setActiveElements([{ datasetIndex: 0, index }]);
    currentChart.tooltip.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
    currentChart.update();
  });

  item.addEventListener("mouseleave", () => {
    currentChart.setActiveElements([]);
    currentChart.tooltip.setActiveElements([], { x: 0, y: 0 });
    currentChart.update();
  });

item.addEventListener("click", (e) => {
  if (e.target !== toggleBtn && typeof onClickHandler === 'function') {
    chartHistory.push(() => {
      createPieChart(title, sourceData, labels, data, onClickHandler);
    });
    onClickHandler(index);
  }
});


  legendContainer.appendChild(item);

});

}

document.getElementById("themeSelector").addEventListener("change", e => {
  const theme = e.target.value;
  document.body.classList.remove("light-theme", "dark-theme", "custom-theme");
  document.body.classList.add(`${theme}-theme`);
  localStorage.setItem("theme", theme);
  if (theme === "custom") {
    // Optional: load a new color palette or update chart
    // Example:
    // updateChartColors(["#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9"]);
  }
});


document.getElementById("backButton").addEventListener("click", () => {
  if (chartHistory.length > 0) {
    const lastChart = chartHistory.pop();
    if (typeof lastChart === 'function') {
      lastChart();
    }
  }
});

function showCategoryBreakdown() {
  chartHistory = []; 
  createPieChart("Category Breakdown", categoryTotals, Object.keys(categoryTotals), Object.values(categoryTotals), handleCategoryClick);
}




function generateColors(count) {
  const theme = document.body.classList.contains("custom-theme") ? "custom" : "default";

  const customPalette = ['#ffcccc', '#fbefca', '#deb2ee', '#c4eede', '#fdcee1'];
  const defaultPalette = colorPalette;

  const palette = theme === "custom" ? customPalette : defaultPalette;

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}
