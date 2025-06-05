// CoinGecko API URL for top 100 cryptocurrencies in USD
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false';

// DOM elements
const cryptoList = document.getElementById('crypto-list');
const searchInput = document.getElementById('search');

// Cache for chart instances to manage re-renders
const charts = {};

// Global state for live coin data
let liveData = [];

/**
 * Fetches cryptocurrency market data and updates the UI.
 */
async function fetchCrypto() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    liveData = data;
    displayCrypto(data);
  } catch (err) {
    cryptoList.innerHTML = '<p style="color: red;">Failed to load data.</p>';
    console.error('API Error:', err);
  }
}

// Fetch initial data and update every 10 seconds
fetchCrypto();
setInterval(fetchCrypto, 10000);

/**
 * Renders the cryptocurrency list in the DOM.
 * @param {Array} data - Array of coin objects
 */
function displayCrypto(data) {
  cryptoList.innerHTML = ''; // Clear previous content

  data.forEach((coin) => {
    const coinDiv = document.createElement('div');
    coinDiv.className = 'crypto';
    coinDiv.setAttribute('data-id', coin.id);

    coinDiv.innerHTML = `
      <div class="crypto-name">
        <img src="${coin.image}" alt="${coin.name}" />
        <div>
          <div>${coin.name} (${coin.symbol.toUpperCase()})</div>
        </div>
        <div class="crypto-price" id="price-${coin.id}">
          $${coin.current_price.toLocaleString()}
          <span class="${coin.price_change_percentage_24h < 0 ? 'red' : 'green'}">
            (${coin.price_change_percentage_24h.toFixed(2)}%)
          </span>
        </div>
      </div>
      <!-- Hidden chart container -->
      <div class="chart-container" id="chart-${coin.id}">
        <canvas id="canvas-${coin.id}" height="100"></canvas>
      </div>
    `;

    cryptoList.appendChild(coinDiv);
  });
}

/**
 * Filters the displayed list based on user input.
 */
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = liveData.filter((coin) =>
    coin.name.toLowerCase().includes(query)
  );
  displayCrypto(filtered);
});

/**
 * Handles click events to toggle and load charts.
 */
cryptoList.addEventListener('click', async (e) => {
  const cryptoDiv = e.target.closest('.crypto');
  if (!cryptoDiv) return;

  const coinId = cryptoDiv.getAttribute('data-id');
  const chartContainer = document.getElementById(`chart-${coinId}`);

  // Toggle chart visibility
  if (chartContainer.style.display === 'block') {
    chartContainer.style.display = 'none';
    return;
  }

  chartContainer.style.display = 'block';

  const canvas = document.getElementById(`canvas-${coinId}`);

  // Fetch historical data and render the chart
  try {
    const chartData = await fetchChartData(coinId);

    // Destroy existing chart to avoid overlap
    if (charts[coinId]) {
      charts[coinId].destroy();
    }

    // Create new chart instance
    charts[coinId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartData.map((d) => d.x),
        datasets: [
          {
            label: 'Price (USD)',
            data: chartData.map((d) => d.y),
            fill: false,
            borderColor: '#4caf50',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { display: true },
          y: { display: true },
        },
      },
    });
  } catch (error) {
    console.error(`Chart render failed for ${coinId}:`, error);
  }
});

/**
 * Fetches 24-hour historical price data for a given coin.
 * @param {string} id - CoinGecko coin ID
 * @returns {Promise<Array<{x: string, y: number}>>}
 */
async function fetchChartData(id) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1&interval=hourly`
    );
    const data = await res.json();

    // Format data for Chart.js
    return data.prices.map((p) => ({
      x: new Date(p[0]).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      y: p[1],
    }));
  } catch (error) {
    console.error(`Failed to fetch chart data for ${id}:`, error);
    return [];
  }
}