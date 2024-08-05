// API endpoint for exchange rates
const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';

// Function to fetch and populate currencies
async function loadCurrencies() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const currencies = Object.keys(data.rates);
        const fromCurrencySelect = document.getElementById('fromCurrency');
        const toCurrencySelect = document.getElementById('toCurrency');

        fromCurrencySelect.innerHTML = '';
        toCurrencySelect.innerHTML = '';

        currencies.forEach(currency => {
            fromCurrencySelect.innerHTML += `<option value="${currency}">${currency}</option>`;
            toCurrencySelect.innerHTML += `<option value="${currency}">${currency}</option>`;
        });

        // Set default values
        fromCurrencySelect.value = 'USD';
        toCurrencySelect.value = 'MYR';
        convertCurrency();
    } catch (error) {
        console.error('Error fetching currency data:', error);
    }
}

// Function to convert currency
async function convertCurrency() {
    try {
        const amount = parseFloat(document.getElementById('amount').value);
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;

        if (isNaN(amount) || amount <= 0) {
            document.getElementById('result').textContent = '0.00';
            return;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();
        const rates = data.rates;

        const convertedAmount = amount * (rates[toCurrency] / rates[fromCurrency]);
        document.getElementById('result').textContent = convertedAmount.toFixed(2);
    } catch (error) {
        console.error('Error converting currency:', error);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadCurrencies);
