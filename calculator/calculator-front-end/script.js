class RetroCalculator {
    constructor() {
        this.display = document.getElementById('display');
        this.historyList = document.getElementById('historyList');
        this.currentInput = '0';
        this.expression = '';
        this.shouldResetDisplay = false;
        
        this.initializeEventListeners();
        this.loadCalculationHistory();
        this.setupLiveHistoryUpdates();
    }
    
    initializeEventListeners() {
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e.target);
            });
        });
        
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardInput(e);
        });
    }
    
    handleButtonClick(button) {
        const action = button.dataset.action;
        const number = button.dataset.number;
        
        if (number !== undefined) {
            this.inputNumber(number);
        } else if (action) {
            this.performAction(action);
        }
    }
    
    handleKeyboardInput(event) {
        const key = event.key;
        
        if (/[0-9]/.test(key)) {
            this.inputNumber(key);
        } else if (key === '.') {
            this.performAction('decimal');
        } else if (key === '+') {
            this.performAction('add');
        } else if (key === '-') {
            this.performAction('subtract');
        } else if (key === '*') {
            this.performAction('multiply');
        } else if (key === '/') {
            event.preventDefault();
            this.performAction('divide');
        } else if (key === 'Enter' || key === '=') {
            event.preventDefault();
            this.performAction('equals');
        } else if (key === 'Escape') {
            this.performAction('clear-all');
        } else if (key === 'Backspace') {
            this.performAction('backspace');
        }
    }
    
    inputNumber(number) {
        if (this.shouldResetDisplay) {
            this.currentInput = number;
            this.shouldResetDisplay = false;
        } else {
            this.currentInput = this.currentInput === '0' ? number : this.currentInput + number;
        }
        
        // If we're building an expression, show the full expression
        if (this.expression) {
            this.display.textContent = this.expression + this.currentInput;
        } else {
            this.updateDisplay();
        }
    }
    
    performAction(action) {
        switch (action) {
            case 'clear-all':
                this.clearAll();
                break;
            case 'clear':
                this.clear();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                this.inputOperator(action);
                break;
            case 'equals':
                this.calculate();
                break;
        }
    }
    
    clearAll() {
        this.currentInput = '0';
        this.expression = '';
        this.shouldResetDisplay = false;
        this.updateDisplay();
    }
    
    clear() {
        this.currentInput = '0';
        this.updateDisplay();
    }
    
    backspace() {
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
        } else {
            this.currentInput = '0';
        }
        this.updateDisplay();
    }
    
    inputDecimal() {
        if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
            this.updateDisplay();
        }
    }
    
    inputOperator(operator) {
        const operatorSymbols = {
            add: '+',
            subtract: '−',
            multiply: '×',
            divide: '÷'
        };
        
        if (this.expression && !this.shouldResetDisplay) {
            this.calculate();
            return;
        }
        
        this.expression = this.currentInput + ' ' + operatorSymbols[operator] + ' ';
        this.display.textContent = this.expression;
        this.shouldResetDisplay = true;
    }
    
    async calculate() {
        if (!this.expression) return;
        
        // Build the full expression (expression already contains the first part + operator)
        const fullExpression = this.expression + this.currentInput;
        
        // Show the full expression in the display temporarily
        this.currentInput = fullExpression;
        this.updateDisplay();
        
        // Convert display symbols to API-compatible symbols
        const apiExpression = fullExpression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-');
        
        try {
            // Call the actual API endpoint
            const response = await fetch('https://calculator-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run/api/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    expression: apiExpression,
                    user_id: 'web-user-' + Math.random().toString(36).substr(2, 9)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const data = await response.json();
            
            // Show the result
            this.currentInput = data.result.toString();
            this.expression = '';
            this.shouldResetDisplay = true;
            this.updateDisplay();
            
            // No need to manually add to history - it's stored in the backend
            // The polling will pick up this calculation automatically
            
        } catch (error) {
            this.displayError('Error');
            console.error('Calculation error:', error);
        }
    }
    
    
    displayError(message) {
        this.currentInput = message;
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.display.textContent = this.currentInput;
    }
    
    async loadCalculationHistory() {
        try {
            // Fetch actual calculation history from the API
            const response = await fetch('https://calculator-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run/api/history?limit=20');
            
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            
            const data = await response.json();
            
            // Clear sample data and render real history
            this.historyList.innerHTML = '';
            
            // API returns newest first, so add them directly
            data.calculations.forEach(calc => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <span class="expression">${calc.expression}</span>
                    <span class="result">= ${calc.result}</span>
                    <span class="timestamp">${this.formatTimestamp(calc.timestamp)}</span>
                `;
                this.historyList.appendChild(historyItem);
            });
            
        } catch (error) {
            console.error('Failed to load calculation history:', error);
            // Keep sample data on error for better UX
        }
    }
    
    setupLiveHistoryUpdates() {
        this.lastHistoryCheck = new Date().toISOString();
        this.refreshCounter = document.getElementById('refreshCounter');
        this.countdownSeconds = 3;
        
        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            if (!document.hidden) {
                this.countdownSeconds--;
                this.refreshCounter.textContent = `Next: ${this.countdownSeconds}s`;
                
                if (this.countdownSeconds <= 0) {
                    this.countdownSeconds = 3; // Reset counter
                }
            }
        }, 1000);
        
        // Poll every 3 seconds when page is visible
        this.historyPollingInterval = setInterval(() => {
            // Only poll when page is visible to save resources
            if (!document.hidden) {
                this.pollForHistoryUpdates();
                this.countdownSeconds = 3; // Reset counter after poll
            }
        }, 3000); // Poll every 3 seconds
        
        // Stop polling when page becomes hidden, resume when visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(this.historyPollingInterval);
                clearInterval(this.countdownInterval);
                this.refreshCounter.textContent = 'Paused';
            } else {
                this.countdownSeconds = 3;
                this.countdownInterval = setInterval(() => {
                    if (!document.hidden) {
                        this.countdownSeconds--;
                        this.refreshCounter.textContent = `Next: ${this.countdownSeconds}s`;
                        
                        if (this.countdownSeconds <= 0) {
                            this.countdownSeconds = 3;
                        }
                    }
                }, 1000);
                
                this.historyPollingInterval = setInterval(() => {
                    if (!document.hidden) {
                        this.pollForHistoryUpdates();
                        this.countdownSeconds = 3;
                    }
                }, 3000);
            }
        });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(this.historyPollingInterval);
            clearInterval(this.countdownInterval);
        });
        
        console.log('History polling initialized - checking every 3 seconds when page is visible');
    }
    
    async pollForHistoryUpdates() {
        try {
            const response = await fetch(`https://calculator-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run/api/history?limit=20&since=${this.lastHistoryCheck}`);
            
            if (!response.ok) {
                return; // Silently fail for polling
            }
            
            const data = await response.json();
            
            if (data.calculations && data.calculations.length > 0) {
                // Add new calculations to the top
                data.calculations.reverse().forEach(calc => {
                    this.addToHistory(calc.expression, calc.result, calc.timestamp, true);
                });
                this.lastHistoryCheck = new Date().toISOString();
            }
        } catch (error) {
            // Silently fail for polling to avoid spamming console
        }
    }
    
    addToHistory(expression, result, timestamp = new Date(), animate = true) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="expression">${expression}</span>
            <span class="result">= ${result}</span>
            <span class="timestamp">${this.formatTimestamp(timestamp)}</span>
        `;
        
        // Remove sample items on first real calculation
        if (animate && this.historyList.querySelector('.sample')) {
            this.historyList.innerHTML = '';
        }
        
        // Add to top of list
        this.historyList.insertBefore(historyItem, this.historyList.firstChild);
        
        // Limit history display to prevent performance issues
        const maxItems = 100;
        while (this.historyList.children.length > maxItems) {
            this.historyList.removeChild(this.historyList.lastChild);
        }
        
        // No animations - keep it simple for performance
    }
    
    renderHistory(calculations) {
        // Clear existing non-sample items
        const existingItems = this.historyList.querySelectorAll('.history-item:not(.sample)');
        existingItems.forEach(item => item.remove());
        
        calculations.forEach(calc => {
            this.addToHistory(calc.expression, calc.result, calc.timestamp);
        });
    }
    
    formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes} min ago`;
        return 'Just now';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RetroCalculator();
});

/*
 * ADDITIONAL API REQUIREMENTS SUMMARY:
 * 
 * 1. POST /api/calculate
 *    - Handles mathematical expressions
 *    - Returns calculated results
 *    - Stores calculation history
 *    - Validates input expressions
 *    - Handles mathematical errors (division by zero, etc.)
 * 
 * 2. GET /api/history
 *    - Returns paginated calculation history
 *    - Supports filtering and sorting
 *    - Includes anonymized user information
 *    - Optimized for frequent polling if WebSocket not available
 * 
 * 3. WebSocket /api/history/live
 *    - Real-time broadcast of new calculations
 *    - Connection management and heartbeat
 *    - Supports multiple concurrent clients
 *    - Handles connection drops gracefully
 * 
 * 4. Error Handling:
 *    - Network timeouts
 *    - Invalid mathematical expressions
 *    - Server errors (500, 503, etc.)
 *    - Rate limiting
 * 
 * 5. Security Considerations:
 *    - Input validation to prevent code injection
 *    - Rate limiting to prevent abuse
 *    - CORS configuration for browser compatibility
 *    - WebSocket authentication if needed
 * 
 * 6. Performance Considerations:
 *    - Efficient calculation processing
 *    - Database indexing for history queries
 *    - Connection pooling for WebSocket management
 *    - Caching for frequently accessed history
 */