document.addEventListener('DOMContentLoaded', () => {
  const priceElement = document.getElementById('price');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const togglePriceBtn = document.getElementById('togglePrice');
  const toggleVolumeBtn = document.getElementById('toggleVolume');
  const timeRangeSelect = document.getElementById('timeRange');
  const closeAlert = document.getElementById('closeAlert');
  
  let showPrice = true;
  let showVolume = true;

  function fetchCurrentPrice() {
      fetch('/current_price')
          .then(response => response.json())
          .then(data => {
              priceElement.textContent = `$${data.price.toFixed(2)}`;
              priceElement.classList.add('price-updated');
              setTimeout(() => priceElement.classList.remove('price-updated'), 1000);
          })
          .catch(error => {
              console.error('Error fetching current price:', error);
              priceElement.textContent = 'Error fetching price';
          });
  }

  // Fetch the current price when the page loads
  fetchCurrentPrice();

  // Fetch the current price every 60 seconds
  setInterval(fetchCurrentPrice, 60000);

  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
          e.preventDefault();
          document.querySelector(this.getAttribute('href')).scrollIntoView({
              behavior: 'smooth'
          });
      });
  });

  // Form validation
  const form = document.querySelector('form');
  form.addEventListener('submit', (e) => {
      const daysAhead = document.getElementById('days_ahead');
      if (daysAhead.value < 1 || daysAhead.value > 365) {
          e.preventDefault();
          alert('Please enter a number between 1 and 365.');
      }
  });

  // Close alert button
  if (closeAlert) {
      closeAlert.addEventListener('click', () => {
          closeAlert.parentElement.style.display = 'none';
      });
  }

  // Dark mode toggle with local storage
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  function setDarkMode(isDark) {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      localStorage.setItem('darkMode', isDark);
      updateCharts();
  }

  // Check for saved user preference, if any, on load
  const darkModeStorage = localStorage.getItem('darkMode');
  
  if (darkModeStorage !== null) {
      setDarkMode(JSON.parse(darkModeStorage));
  } else {
      setDarkMode(prefersDarkScheme.matches);
  }

  // Add event listener for dark mode toggle
  darkModeToggle.addEventListener('click', () => {
      setDarkMode(document.body.getAttribute('data-theme') !== 'dark');
  });

  // Toggle price and volume buttons
  togglePriceBtn.addEventListener('click', () => {
      showPrice = !showPrice;
      togglePriceBtn.classList.toggle('active');
      updateCharts();
  });

  toggleVolumeBtn.addEventListener('click', () => {
      showVolume = !showVolume;
      toggleVolumeBtn.classList.toggle('active');
      updateCharts();
  });

  // Time range select
  timeRangeSelect.addEventListener('change', () => {
      updateCharts();
  });

  // Initialize AOS
  AOS.init({
      duration: 1000,
      once: true,
      offset: 100
  });

  // Create charts
  createPriceChart();
  createHistoricalChart();
  createPredictionChart();

  function updateCharts() {
      createPriceChart();
      createHistoricalChart();
      if (document.getElementById('prediction-chart')) {
          createPredictionChart();
      }
  }

  function createPriceChart() {
      fetch('/historical_prices')
          .then(response => response.json())
          .then(data => {
              const trace = {
                  x: data.dates,
                  y: data.prices,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Bitcoin Price',
                  line: { color: document.body.getAttribute('data-theme') === 'dark' ? '#5dade2' : '#3498db' }
              };

              const layout = {
                  title: 'Bitcoin Price History',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Price (USD)' },
                  plot_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#fff',
                  paper_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#121212' : '#f5f5f5',
                  font: { color: document.body.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#34495e' }
              };

              Plotly.newPlot('price-chart', [trace], layout);
          });
  }

  function createHistoricalChart() {
      fetch('/historical_data')
          .then(response => response.json())
          .then(data => {
              const selectedRange = parseInt(timeRangeSelect.value);
              const endIndex = data.dates.length;
              const startIndex = selectedRange === 0 ? 0 : Math.max(0, endIndex - selectedRange);

              const filteredDates = data.dates.slice(startIndex, endIndex);
              const filteredPrices = data.prices.slice(startIndex, endIndex);
              const filteredVolumes = data.volumes.slice(startIndex, endIndex);

              const traces = [];

              if (showPrice) {
                  traces.push({
                      x: filteredDates,
                      y: filteredPrices,
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Price',
                      line: { color: document.body.getAttribute('data-theme') === 'dark' ? '#5dade2' : '#3498db' }
                  });
              }

              if (showVolume) {
                  traces.push({
                      x: filteredDates,
                      y: filteredVolumes,
                      type: 'bar',
                      name: 'Volume',
                      marker: { color: document.body.getAttribute('data-theme') === 'dark' ? '#e74c3c' : '#c0392b' }
                  });
              }

              const layout = {
                  title: 'Bitcoin Historical Price and Volume',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Price (USD)' },
                  yaxis2: {
                      title: 'Volume',
                      overlaying: 'y',
                      side: 'right'
                  },
                  plot_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#fff',
                  paper_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#121212' : '#f5f5f5',
                  font: { color: document.body.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#34495e' }
              };

              Plotly.newPlot('historical-chart', traces, layout);
          });
  }

  function createPredictionChart() {
      const predictionChart = document.getElementById('prediction-chart');
      if (!predictionChart) return;

      const table = document.querySelector('.prediction-results table');
      const dates = [];
      const predicted = [];
      const lower = [];
      const upper = [];

      table.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          dates.push(cells[0].textContent);
          predicted.push(parseFloat(cells[1].textContent.replace('$', '')));
          lower.push(parseFloat(cells[2].textContent.replace('$', '')));
          upper.push(parseFloat(cells[3].textContent.replace('$', '')));
      });

      const trace1 = {
          x: dates,
          y: predicted,
          type: 'scatter',
          mode: 'lines',
          name: 'Predicted Price',
          line: { color: document.body.getAttribute('data-theme') === 'dark' ? '#5dade2' : '#3498db' }
      };

      const trace2 = {
          x: dates.concat(dates.slice().reverse()),
          y: upper.concat(lower.slice().reverse()),
          fill: 'toself',
          fillcolor: document.body.getAttribute('data-theme') === 'dark' ? 'rgba(93, 173, 226, 0.2)' : 'rgba(52, 152, 219, 0.2)',
          line: { color: 'transparent' },
          name: 'Price Range',
          showlegend: false
      };

      const layout = {
          title: 'Bitcoin Price Prediction',
          xaxis: { title: 'Date' },
          yaxis: { title: 'Price (USD)' },
          plot_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#fff',
          paper_bgcolor: document.body.getAttribute('data-theme') === 'dark' ? '#121212' : '#f5f5f5',
          font: { color: document.body.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#34495e' }
      };

      Plotly.newPlot('prediction-chart', [trace1, trace2], layout);
  }
});
