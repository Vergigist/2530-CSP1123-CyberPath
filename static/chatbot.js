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
    const suggestionsBar = document.getElementById("suggestionsBar");

    if (!chatbotIcon || !chatbotPopup) {
        console.log("Chatbot elements not found");
        return;
    }

    chatbotIcon.addEventListener('click', function() {
        console.log("Opening chatbot");
        if (chatbotPopup.classList.contains('hidden')) {
            if (typeof showPopup === 'function') showPopup('chatbotPopup');
            else chatbotPopup.classList.remove('hidden');
            chatInput.focus();
        } else {
            if (typeof hidePopup === 'function') hidePopup('chatbotPopup');
            else chatbotPopup.classList.add('hidden');
        }

        showSuggestions([
            "🗺️ Directions to the library",
            "🚶 Walking route to DTC",
            "📍 How do I get to Haji Tapah?",
        ]);
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
        const isDark = document.body.classList.contains('dark-mode')
        thinkingDiv.innerHTML = `<strong>Assistant:</strong> Thinking...`;
        thinkingDiv.style.cssText = `
            background: ${isDark? '#1565c0' : 'e3f2fd'};
            padding: 10px;
            border-radius: 10px;
            margin: 10px 0;
            max-width: 80%;
            border-left: 4px solid ${isDark ? '#0d47a1' : '#2196f3'};
            color: ${isDark ? '#fff' : '#000'};
        `;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return thinkingDiv;
    }

    function addMessageToChat(message, isUser) {
        const messageDiv = document.createElement('div');

        const isDark = document.body.classList.contains('dark-mode');

        if (isUser) {
            messageDiv.style.cssText = `
                background: ${isDark ? '#2e7d32' : '#dcf8c6'};
                padding: 10px;
                border-radius: 10px;
                margin: 10px 0 10px auto;
                max-width: 80%;
                border-right: 4px solid ${isDark ? '#1b5e20' : '#4caf50'};
                color: ${isDark ? '#fff' : '#000'};
            `;
            messageDiv.innerHTML = `<strong>You:</strong> ${escapeHtml(message)}`; // FIXED: message not text
        } else {
            messageDiv.style.cssText = `
                background: ${isDark? '#1565c0' : 'e3f2fd'};
                padding: 10px;
                border-radius: 10px;
                margin: 10px 0;
                max-width: 80%;
                border-left: 4px solid ${isDark ? '#0d47a1' : '#2196f3'};
                color: ${isDark ? '#fff' : '#000'};
            `;
            messageDiv.innerHTML = `<strong>Assistant:</strong> ${escapeHtml(message)}`; // FIXED: message not text
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addDirectionsButton(coordinates, locationName, isIndoor = false, building = null) {
        const buttonDiv = document.createElement('div');

        const isDark = document.body.classList.contains('dark-mode');

        buttonDiv.style.cssText = `
            background: ${isDark ? '#af9a46' : '#fff8e1'};
            padding: 12px;
            border-radius: 10px;
            margin: 10px 0;
            border: 1px solid ${isDark ? '#ad8912' : '#ffd54f'};
            border-left: 4px solid ${isDark ? '#b58f00' : '#ffb300'};
            color: ${isDark ? '#1a1a1a' : '#000'};
        `;

        let displayText = `📍 Need directions to ${escapeHtml(locationName)}?`;
        if (isIndoor && building) {
            displayText = `🏢 Need directions to ${escapeHtml(locationName)} in ${escapeHtml(building)}?`;
        }
    
        //changed coords to coordinates
        buttonDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>📍 Need directions to ${escapeHtml(locationName)}?</strong>
        </div>
        <button class="directions-btn" 
                data-lat="${coordinates.latitude}" 
                data-lng="${coordinates.longitude}"
                data-name="${escapeHtml(locationName)}"
                data-building="${isIndoor ? escapeHtml(building) : ''}"
                data-indoor="${isIndoor}"
                style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🗺️ Get Walking Directions
        </button>
        `;

        chatMessages.appendChild(buttonDiv);
        
        const button = buttonDiv.querySelector('.directions-btn');

        // Remove existing listener first (optional but safe)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Use a routing flag to prevent double-triggering
        let routingInProgress = false;

        newButton.addEventListener('click', function () {
            if (routingInProgress) return; // ignore if already routing
            routingInProgress = true;

            try {
                const lat = parseFloat(this.dataset.lat);
                const lng = parseFloat(this.dataset.lng);
                const locationName = this.dataset.name; // ensure you have a name attribute
                const building = this.dataset.building;
                const isIndoor = this.dataset.indoor === 'true';

                if (!window.userLocation) {
                    addMessageToChat(" Please click 'Find My Location' first.", false);
                    return;
                }

                if (!window.router?.createRoute) {
                    alert("Routing system not ready. Please refresh the page.");
                    return;
                }

                const routeLayer = window.router.createRoute(lat, lng, building, isIndoor);
                window.showRouteInfoPopup(routeLayer, locationName);
                if (routeLayer) {
                    let successMsg = `✅ Creating route to ${locationName}! Check the map for the blue path.`;
                if (isIndoor && building) {
                    successMsg = `✅ Creating route to ${building}! The path will lead you to the building entrance.`;
                }
                addMessageToChat(successMsg, false);
                chatbotPopup.classList.add('hidden');
            } else {
                    addMessageToChat(`⚠️ Failed to create route to ${locationName}.`, false);
                }
            } finally {
                routingInProgress = false; // reset flag
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
        if (!userMessage) return;
        
        console.log("User message:", userMessage);

        // Add user message
        addMessageToChat(userMessage, true);
        chatInput.value = '';

        // Show thinking indicator
        const thinkingDiv = showThinking();

        try {
            const response = await fetch('/chatbot/ask', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ message: userMessage })
            });
            
            const data = await response.json();
            console.log("📦 Full bot response:", data);
            
            thinkingDiv.remove();

            if (data.success) {
                // Always show bot response
                addMessageToChat(data.response, false);
                
                // ALWAYS show suggestions
                showSuggestions([
                    "🗺️ Get directions",
                    "⏱️ How long will it take?",
                    "📍 Show me the route"
                ]);
                
                // Check if we have coordinates to show directions button
                if (data.coordinates && data.location_name) {
                    console.log("✅ Has coordinates, showing directions button");
                    console.log("   Location:", data.location_name);
                    console.log("   Coordinates:", data.coordinates);
                    console.log("   Is indoor:", data.is_indoor);
                    console.log("   Building:", data.building);
                    
                    // Wait a moment, then show directions
                    setTimeout(() => {
                        const isIndoor = data.is_indoor === true;
                        const building = data.building || null;
                        
                        let botMessage = `💡 I can show you walking directions to **${data.location_name}**! `;
                        
                        if (isIndoor && building) {
                            botMessage += `The route will lead you to the **${building}** entrance. `;
                        } else if (building) {
                            botMessage += `The route will lead you to **${building}**. `;
                        }
                        
                        botMessage += `Click the button below when you're ready to go.`;
                        
                        addMessageToChat(botMessage, false);
                        
                        // Show the directions button
                        setTimeout(() => {
                            addDirectionsButton(
                                data.coordinates, 
                                data.location_name, 
                                isIndoor, 
                                building
                            );
                        }, 300);
                    }, 800);
                } else {
                    console.log("❌ No coordinates available");
                    // Even without coordinates, suggest asking for a location
                    setTimeout(() => {
                        addMessageToChat("💡 You can ask me for directions to places like: 'Library', 'DTC', 'FCI Building', or 'Haji Tapah'.", false);
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

    function showSuggestions(suggestions) {
        suggestionsBar.innerHTML = "";
        suggestionsBar.classList.remove("hidden");

        suggestions.forEach(text => {
            const chip = document.createElement("div");
            chip.className = "suggestion-chip";
            chip.textContent = text;

            chip.addEventListener("click", () => {
                chatInput.value = text;
                hideSuggestions();
            });

            suggestionsBar.appendChild(chip);
        });
    }

    function hideSuggestions() {
        suggestionsBar.classList.add("hidden");
        suggestionsBar.innerHTML = "";
    }

}