// Dream Archaeology Frontend - Interactive Script
class DreamArchaeology {
    constructor() {
        this.dreamInput = document.getElementById('dreamInput');
        this.analyzeDreamBtn = document.getElementById('analyzeDream');
        this.dreamsList = document.getElementById('dreamsList');
        this.dreamTheater = document.getElementById('dreamTheater');
        this.closeTheaterBtn = document.getElementById('closeTheater');
        this.generateNewBtn = document.getElementById('generateNew');
        this.backToAllBtn = document.getElementById('backToAllBtn');
        
        // API Configuration
        this.apiBaseUrl = 'https://dream-machine-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run';
        this.currentDreamId = null;
        this.dreams = [];
        this.isShowingSimilarDreams = false;
        

        this.init();
    }

    init() {
        this.bindEvents();
        this.startAnimations();
        this.loadDreams();
        
        // Refresh dreams every 30 seconds for live feed (but only if not showing similar dreams)
        setInterval(() => {
            if (!this.isShowingSimilarDreams) {
                this.loadDreams();
            }
        }, 30000);
    }

    bindEvents() {
        // Main functionality
        this.analyzeDreamBtn.addEventListener('click', () => this.analyzeDream());
        
        // Dream theater
        this.closeTheaterBtn.addEventListener('click', () => this.closeDreamTheater());
        this.generateNewBtn.addEventListener('click', () => this.generateNewContinuation());
        
        // Back to all dreams
        this.backToAllBtn.addEventListener('click', () => this.backToAllDreams());
        
        
        // Dream card interactions
        this.setupDreamCardInteractions();
        
        // Input enhancements
        this.dreamInput.addEventListener('focus', () => this.onInputFocus());
        this.dreamInput.addEventListener('blur', () => this.onInputBlur());
        this.dreamInput.addEventListener('input', () => this.onInputChange());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    startAnimations() {
        // Create floating particles
        this.createFloatingParticles();
    }

    async loadDreams() {
        try {
            console.log('Loading dreams from:', `${this.apiBaseUrl}/api/dreams?limit=10`);
            const response = await fetch(`${this.apiBaseUrl}/api/dreams?limit=10`);
            const data = await response.json();
            console.log('Dreams response:', data);
            
            if (response.ok && data.dreams) {
                this.dreams = data.dreams;
                console.log('Loaded dreams:', this.dreams.length);
                this.populateDreamsList();
            } else if (data.error) {
                console.error('API error:', data.error);
                this.showMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error loading dreams:', error);
            this.showMessage('Unable to load dreams. Please try again.');
        }
    }
    
    populateDreamsList() {
        // Only update if not showing similar dreams
        if (!this.isShowingSimilarDreams) {
            this.dreamsList.innerHTML = '';
            this.dreams.forEach(dream => {
                const dreamCard = this.createDreamCard(dream);
                this.dreamsList.appendChild(dreamCard);
            });
            
            // Reset headers to default state
            const explorerHeader = document.querySelector('.explorer-header h2');
            const explorerFooter = document.querySelector('.explorer-footer span');
            if (explorerHeader) explorerHeader.textContent = 'Dream Explorer';
            if (explorerFooter) explorerFooter.textContent = 'Recent dreams from the collective';
            this.backToAllBtn.style.display = 'none';
        }
    }

    createDreamCard(dream) {
        const card = document.createElement('div');
        card.className = 'dream-card';
        card.setAttribute('data-dream-id', dream.id);
        
        const timeAgo = this.formatTimeAgo(dream.timestamp);
        const content = dream.content || 'No content available';
        const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
        
        card.innerHTML = `
            <div class="dream-preview">
                <p>"${preview}"</p>
            </div>
            <div class="dream-meta">
                <span class="timestamp">${timeAgo}</span>
            </div>
        `;
        
        return card;
    }


    setupDreamCardInteractions() {
        document.addEventListener('click', (e) => {
            const dreamCard = e.target.closest('.dream-card');
            if (dreamCard) {
                this.onDreamCardClick(dreamCard);
            }
        });
    }


    async onDreamCardClick(card) {
        const dreamId = card.getAttribute('data-dream-id');
        if (dreamId) {
            await this.openDreamTheaterForDream(dreamId);
        }
    }

    async analyzeDream() {
        const dreamText = this.dreamInput.value.trim();
        
        if (!dreamText) {
            this.showMessage('Please describe your dream first!');
            return;
        }

        // Animate analyze button
        this.analyzeDreamBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.analyzeDreamBtn.style.transform = 'scale(1)';
        }, 150);

        this.showAnalysisAnimation();
        this.showMessage('Analyzing dream with AI... This may take 10-15 seconds.');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/dreams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: dreamText
                })
            });
            
            const data = await response.json();
            console.log('Dream submission response:', data);
            
            if (response.ok && data.id) {
                this.currentDreamId = data.id;
                
                // Show the analysis results
                console.log('Analysis data received:', data.analysis);
                this.showAnalysisResults(data.analysis, data.message || 'Dream analyzed and stored!');
                
                // Reload dreams to show the new one
                await this.loadDreams();
                
                // Load similar dreams to populate the side panel
                this.showMessage('Finding similar dreams... Please wait.');
                await this.loadSimilarDreams(data.id);
                
                // Don't automatically open continuation - let user choose
            } else {
                this.showMessage(data.error || 'Error analyzing dream. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting dream:', error);
            this.showMessage('Unable to submit dream. Please try again.');
        } finally {
            this.hideAnalysisAnimation();
        }
    }

    showAnalysisAnimation() {
        const button = this.analyzeDreamBtn;
        this.originalButtonText = button.querySelector('.btn-text').textContent;
        button.querySelector('.btn-text').textContent = 'Analyzing...';
        button.disabled = true;
    }
    
    hideAnalysisAnimation() {
        const button = this.analyzeDreamBtn;
        button.querySelector('.btn-text').textContent = this.originalButtonText;
        button.disabled = false;
    }

    showAnalysisResults(analysis, message) {
        // Clear input
        this.dreamInput.value = '';
        
        // Show success message
        this.showMessage(message || 'Dream analyzed and stored!');
        
        // Debug analysis
        console.log('Analysis results:', analysis);
        
        // Display analysis results if available
        if (analysis && typeof analysis === 'object') {
            this.displayAnalysis(analysis);
        } else {
            console.log('No analysis data received or invalid format');
            // Show a placeholder message in the analysis display
            const analysisDisplay = document.getElementById('analysisDisplay');
            const analysisContent = document.getElementById('analysisContent');
            analysisContent.innerHTML = `
                <div class="analysis-section">
                    <h4>🔄 Processing</h4>
                    <p>Dream analysis is still processing. The AI analysis will appear here once complete.</p>
                </div>
            `;
            analysisDisplay.style.display = 'block';
        }
    }
    
    displayAnalysis(analysis) {
        const analysisDisplay = document.getElementById('analysisDisplay');
        const analysisContent = document.getElementById('analysisContent');
        
        // Build analysis sections
        let sectionsHTML = '';
        
        if (analysis.themes) {
            sectionsHTML += `
                <div class="analysis-section">
                    <h4>🎭 Themes</h4>
                    <p>${analysis.themes.join(', ')}</p>
                </div>
            `;
        }
        
        if (analysis.emotions) {
            sectionsHTML += `
                <div class="analysis-section">
                    <h4>💭 Emotions</h4>
                    <p>${analysis.emotions.join(', ')}</p>
                </div>
            `;
        }
        
        if (analysis.symbols) {
            sectionsHTML += `
                <div class="analysis-section">
                    <h4>🔮 Symbols</h4>
                    <p>${analysis.symbols.join(', ')}</p>
                </div>
            `;
        }
        
        if (analysis.narrative_structure) {
            sectionsHTML += `
                <div class="analysis-section">
                    <h4>📖 Narrative Structure</h4>
                    <p>${analysis.narrative_structure}</p>
                </div>
            `;
        }
        
        if (analysis.psychological_insights) {
            sectionsHTML += `
                <div class="analysis-section">
                    <h4>🧠 Psychological Insights</h4>
                    <p>${analysis.psychological_insights.join('. ')}</p>
                </div>
            `;
        }
        
        // Show the analysis display
        analysisContent.innerHTML = sectionsHTML;
        analysisDisplay.style.display = 'block';
    }


    async openDreamTheaterForDream(dreamId) {
        try {
            // Show theater immediately with loading state
            this.currentDreamId = dreamId;
            this.dreamTheater.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            const continuationElement = document.getElementById('dreamContinuation');
            continuationElement.textContent = 'Generating dream continuation with AI... This may take 10-15 seconds.';
            continuationElement.style.opacity = '0.7';
            
            // Show loading message
            this.showMessage('Generating AI continuation... Please wait.');
            
            // Get dream continuation from API
            const response = await fetch(`${this.apiBaseUrl}/api/dreams/${dreamId}/continue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.continuation) {
                const continuationText = data.continuation.content || data.continuation;
                continuationElement.textContent = continuationText;
                continuationElement.style.opacity = '1';
                this.showMessage('Dream continuation generated!');
            } else {
                continuationElement.textContent = data.error || 'Unable to generate dream continuation.';
                continuationElement.style.opacity = '1';
                this.showMessage('Error generating continuation.');
            }
        } catch (error) {
            console.error('Error getting dream continuation:', error);
            const continuationElement = document.getElementById('dreamContinuation');
            continuationElement.textContent = 'Error loading dream continuation.';
            continuationElement.style.opacity = '1';
            this.showMessage('Unable to load dream continuation.');
        }
    }

    closeDreamTheater() {
        this.dreamTheater.classList.remove('active');
        document.body.style.overflow = 'auto';
    }


    async generateNewContinuation() {
        if (!this.currentDreamId) {
            this.showMessage('No dream selected for continuation.');
            return;
        }
        
        const continuationElement = document.getElementById('dreamContinuation');
        const generateBtn = document.getElementById('generateNew');
        
        // Show loading state
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        continuationElement.style.opacity = '0.5';
        continuationElement.textContent = 'Generating new continuation with AI... Please wait 10-15 seconds.';
        this.showMessage('Generating new AI continuation... Please wait.');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/dreams/${this.currentDreamId}/continue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.continuation) {
                const continuationText = data.continuation.content || data.continuation;
                continuationElement.textContent = continuationText;
                continuationElement.style.opacity = '1';
                this.showMessage('New continuation generated!');
            } else {
                continuationElement.textContent = data.error || 'Unable to generate continuation.';
                continuationElement.style.opacity = '1';
                this.showMessage('Error generating continuation.');
            }
        } catch (error) {
            console.error('Error generating continuation:', error);
            continuationElement.textContent = 'Error generating continuation.';
            continuationElement.style.opacity = '1';
            this.showMessage('Error generating continuation.');
        } finally {
            // Restore button state
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate New';
        }
    }


    createFloatingParticles() {
        const particleContainer = document.createElement('div');
        particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        document.body.appendChild(particleContainer);
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: rgba(168, 85, 247, 0.6);
                border-radius: 50%;
                animation: floatParticle ${10 + Math.random() * 10}s linear infinite;
                left: ${Math.random() * 100}%;
                top: 100%;
                box-shadow: 0 0 6px rgba(168, 85, 247, 0.8);
            `;
            particleContainer.appendChild(particle);
        }
        
        // Add particle animation
        if (!document.getElementById('particleAnimations')) {
            const style = document.createElement('style');
            style.id = 'particleAnimations';
            style.textContent = `
                @keyframes floatParticle {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }



    onInputFocus() {
        this.dreamInput.style.borderColor = '#a855f7';
        this.dreamInput.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4)';
    }

    onInputBlur() {
        this.dreamInput.style.borderColor = 'rgba(168, 85, 247, 0.4)';
        this.dreamInput.style.boxShadow = 'none';
    }

    onInputChange() {
        const length = this.dreamInput.value.length;
        if (length > 0) {
            this.analyzeDreamBtn.style.background = 'linear-gradient(145deg, #a855f7 0%, #8b5cf6 100%)';
            this.analyzeDreamBtn.disabled = false;
        } else {
            this.analyzeDreamBtn.style.background = 'linear-gradient(145deg, #64748b 0%, #475569 100%)';
            this.analyzeDreamBtn.disabled = true;
        }
    }

    handleKeyboard(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            this.analyzeDream();
        }
        
        if (e.key === 'Escape' && this.dreamTheater.classList.contains('active')) {
            this.closeDreamTheater();
        }
    }

    showMessage(text) {
        // Create temporary message overlay
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(145deg, rgba(168, 85, 247, 0.9), rgba(139, 92, 246, 0.9));
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Roboto Mono', monospace;
            font-size: 14px;
            z-index: 1001;
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
            backdrop-filter: blur(10px);
            animation: slideInMessage 0.3s ease-out;
        `;
        message.textContent = text;
        document.body.appendChild(message);
        
        // Add animation
        if (!document.getElementById('messageAnimations')) {
            const style = document.createElement('style');
            style.id = 'messageAnimations';
            style.textContent = `
                @keyframes slideInMessage {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            message.style.animation = 'slideInMessage 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(message);
            }, 300);
        }, 3000);
    }

    
    
    async loadSimilarDreams(dreamId) {
        try {
            console.log('Loading similar dreams for:', dreamId);
            
            // Show loading state
            this.isShowingSimilarDreams = true;
            const explorerHeader = document.querySelector('.explorer-header h2');
            const explorerFooter = document.querySelector('.explorer-footer span');
            explorerHeader.textContent = 'Searching Similar Dreams...';
            explorerFooter.textContent = 'AI is finding related dreams';
            this.backToAllBtn.style.display = 'block';
            
            // Show loading in dreams list
            this.dreamsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #a855f7;">🔍 Searching for similar dreams...</div>';
            
            const response = await fetch(`${this.apiBaseUrl}/api/dreams/${dreamId}/similar`);
            const data = await response.json();
            console.log('Similar dreams response:', data);
            
            if (response.ok && data.similar_dreams) {
                // Update the side panel header and footer
                const explorerInstructions = document.getElementById('explorerInstructions');
                explorerHeader.textContent = 'Similar Dreams';
                explorerFooter.textContent = 'Dreams similar to yours';
                if (explorerInstructions) explorerInstructions.style.display = 'block';
                
                // Populate with similar dreams
                this.populateSimilarDreamsList(data.similar_dreams);
                this.showMessage(`Found ${data.similar_dreams.length} similar dreams!`);
            } else if (data.error) {
                console.error('Similar dreams error:', data.error);
                explorerHeader.textContent = 'No Similar Dreams';
                explorerFooter.textContent = 'No matches found';
                this.dreamsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No similar dreams found yet.</div>';
                this.showMessage('No similar dreams found yet.');
            }
        } catch (error) {
            console.error('Error loading similar dreams:', error);
            const explorerHeader = document.querySelector('.explorer-header h2');
            const explorerFooter = document.querySelector('.explorer-footer span');
            explorerHeader.textContent = 'Error';
            explorerFooter.textContent = 'Unable to load similar dreams';
            this.dreamsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Error loading similar dreams.</div>';
            this.showMessage('Unable to load similar dreams.');
        }
    }
    
    populateSimilarDreamsList(similarDreams) {
        this.dreamsList.innerHTML = '';
        similarDreams.forEach(dream => {
            const dreamCard = this.createSimilarDreamCard(dream);
            this.dreamsList.appendChild(dreamCard);
        });
    }
    
    createSimilarDreamCard(dream) {
        const card = document.createElement('div');
        card.className = 'dream-card similar-dream';
        card.setAttribute('data-dream-id', dream.id);
        
        const timeAgo = this.formatTimeAgo(dream.timestamp || new Date().toISOString());
        const content = dream.content || 'No content available';
        const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
        
        // Show similarity score if available
        const similarityScore = dream.similarity_score ? Math.round(dream.similarity_score * 100) : '';
        const sharedThemes = dream.shared_themes ? dream.shared_themes.join(', ') : '';
        
        card.innerHTML = `
            <div class="dream-preview">
                <p>"${preview}"</p>
                ${similarityScore ? `<div class="similarity-info">
                    <span class="similarity-score">${similarityScore}% similar</span>
                    ${sharedThemes ? `<span class="shared-themes">Themes: ${sharedThemes}</span>` : ''}
                </div>` : ''}
            </div>
            <div class="dream-meta">
                <span class="timestamp">${timeAgo}</span>
            </div>
        `;
        
        return card;
    }
    
    backToAllDreams() {
        this.isShowingSimilarDreams = false;
        this.backToAllBtn.style.display = 'none';
        
        // Reset headers
        const explorerHeader = document.querySelector('.explorer-header h2');
        const explorerFooter = document.querySelector('.explorer-footer span');
        explorerHeader.textContent = 'Dream Explorer';
        explorerFooter.textContent = 'Recent dreams from the collective';
        
        // Reload all dreams
        this.populateDreamsList();
        this.showMessage('Showing all dreams');
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const dreamTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - dreamTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'now';
        if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the Dream Archaeology app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DreamArchaeology();
});

// Add some extra interactive effects
document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    // Subtle parallax effect on background elements
    const stars = document.querySelector('.stars');
    const clouds = document.querySelector('.clouds');
    
    if (stars) {
        stars.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    }
    
    if (clouds) {
        clouds.style.transform = `translate(${x * -10}px, ${y * -10}px)`;
    }
});