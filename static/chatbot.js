document.addEventListener("DOMContentLoaded", function() {
    setupChatbot();
});

function setupChatbot() {
    // Get elements
    const chatbotIcon = document.querySelector('.chatbot-icon');
    const chatbotPopup = document.getElementById('chatbotPopup');
    const closeBtn = document.getElementById('closeChatbotPopup');
    const sendBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatbotIcon || !chatbotPopup) {
        console.log("Chatbot elements not found");
        return;
    }

    chatbotIcon.addEventListener('click', function() {
        console.log("Opening chatbot");
        chatbotPopup.classList.remove('hidden');
        chatInput.focus(); // Add focus to input
    });

    closeBtn.addEventListener('click', function() {
        console.log("Closing chatbot");
        chatbotPopup.classList.add('hidden');
    });

    sendBtn.addEventListener('click', function() {
        sendMessage();
    });

    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function showThinking() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.innerHTML = `<strong>Assistant:</strong> Thinking...`;
        thinkingDiv.style.cssText = `
            background: #e3f2fd;
            padding: 10px;
            border-radius: 10px;
            margin: 10px 0;
            max-width: 80%;
            border-left: 4px solid #2196f3;
        `;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return thinkingDiv;
    }

    function addMessageToChat(message, isUser) {
        const messageDiv = document.createElement('div');

        if (isUser) {
            messageDiv.style.cssText = `
                background: #dcf8c6;
                padding: 10px;
                border-radius: 10px;
                margin: 10px 0 10px auto;
                max-width: 80%;
                border-right: 4px solid #4caf50;
            `;
            messageDiv.innerHTML = `<strong>You:</strong> ${escapeHtml(message)}`; // FIXED: message not text
        } else {
            messageDiv.style.cssText = `
                background: #e3f2fd;
                padding: 10px;
                border-radius: 10px;
                margin: 10px 0;
                max-width: 80%;
                border-left: 4px solid #2196f3;
            `;
            messageDiv.innerHTML = `<strong>Assistant:</strong> ${escapeHtml(message)}`; // FIXED: message not text
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addDirectionsButton(coordinates, locationName) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = `
            background: #fff8e1;
            padding: 12px;
            border-radius: 10px;
            margin: 10px 0;
            border: 1px solid #ffd54f;
            border-left: 4px solid #ffb300;
        `;
    
        //changed coords to coordinates
        buttonDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>📍 Need directions to ${escapeHtml(locationName)}?</strong>
        </div>
        <button class="directions-btn" 
                data-lat="${coordinates.latitude}" 
                data-lng="${coordinates.longitude}"
                style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🗺️ Get Walking Directions
        </button>
        `;

        chatMessages.appendChild(buttonDiv);
        
        const button = buttonDiv.querySelector('.directions-btn');
        button.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            
            // Check if GPS is available
            if (window.userLocation) {
                // Use your existing routing system
                if (window.router && typeof window.router.createRoute === 'function') {
                    window.router.createRoute(lat, lng);
                    addMessageToChat(`✅ Creating route to ${locationName}! Check the map for the blue path.`, false);
                    
                    // Close chatbot to show map
                    chatbotPopup.classList.add('hidden');
                } else {
                    alert("Routing system not available. Please refresh the page.");
                }
            } else {
                addMessageToChat("📍 Please click 'Find My Location' button first to enable GPS.", false);
            }
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async function sendMessage() {  
        const userMessage = chatInput.value.trim();
        if (!userMessage) {
            return;
        }
        
        console.log("User message:", userMessage);

        // Add user message
        addMessageToChat(userMessage, true);
        
        // Clear input
        chatInput.value = '';

        // Show thinking
        const thinkingDiv = showThinking();

        try {
            const response = await fetch('/chatbot/ask', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: userMessage
                })
            });
            
            const data = await response.json();
            console.log("Bot response data:", data);
            
            thinkingDiv.remove();

            if (data.success) {
                addMessageToChat(data.response, false);
                
                // Wait 1 second, then show directions suggestion
                if (data.coordinates && data.location_name) {
                    setTimeout(() => {
                        // Bot explains about directions
                        addMessageToChat(
                            `💡 I can show you walking directions to ${data.location_name}! ` +
                            `Click the button below when you're ready to go.`, 
                            false
                        );
                    
                        setTimeout(() => {
                            addDirectionsButton(data.coordinates, data.location_name);
                        }, 500);
                    }, 1000);
                }
            } else {
                addMessageToChat("Sorry, something went wrong. Please try again.", false);
            }

        } catch (error) {
            console.error("Error communicating with chatbot:", error);
            thinkingDiv.remove();
            addMessageToChat("Sorry, I couldn't reach the server. Please try again later.", false);
        }
    }
}