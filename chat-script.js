document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // The base URL for your live backend server on Render
    const API_BASE_URL = 'https://ai-chatbot-api-7muc.onrender.com';
    
    // Update the logout button link to point to the live server
    const logoutButton = document.querySelector('header a');
    if(logoutButton) {
        logoutButton.href = `${API_BASE_URL}/auth/logout`;
    }

    // --- Panel Toggle Logic ---
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatLauncherButton = document.getElementById('chat-launcher-button');
    const closeChatButton = document.getElementById('close-chat-button');

    const toggleChatWindow = () => {
        document.body.classList.toggle('chat-open');
        chatbotContainer.classList.toggle('scale-0');
        chatbotContainer.classList.toggle('opacity-0');
    };

    if (chatLauncherButton) chatLauncherButton.addEventListener('click', toggleChatWindow);
    if (closeChatButton) closeChatButton.addEventListener('click', toggleChatWindow);

    // --- Tab Switching ---
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (speechSynthesis.speaking) speechSynthesis.cancel();
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            contents.forEach(content => {
                const contentTabId = content.id.replace('-tab', '');
                if (contentTabId === target) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });

    // --- Chatbot and Emoji Logic ---
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLoading = document.getElementById('chat-loading');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const emojiPicker = document.querySelector('emoji-picker');

    if (emojiButton) {
        emojiButton.addEventListener('click', (event) => {
            event.stopPropagation();
            emojiPickerContainer.classList.toggle('hidden');
        });
    }

    if (emojiPicker) {
        emojiPicker.addEventListener('emoji-click', event => {
            chatInput.value += event.detail.unicode;
        });
    }

    document.addEventListener('click', (event) => {
        if (emojiPickerContainer && !emojiPickerContainer.contains(event.target) && emojiButton && !emojiButton.contains(event.target)) {
            emojiPickerContainer.classList.add('hidden');
        }
    });

    const addMessage = (message, sender) => {
        if (!chatWindow) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
        messageDiv.innerHTML = `<div class="chat-bubble ${sender}">${message.replace(/\n/g, '<br>')}</div>`;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const addImage = (base64String) => {
        if (!chatWindow) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-start';
        
        const img = document.createElement('img');
        const imageDataUrl = `data:image/png;base64,${base64String}`;
        img.src = imageDataUrl;
        img.className = 'rounded-lg';
        img.alt = 'Generated Image';
        
        const downloadButton = document.createElement('a');
        downloadButton.href = imageDataUrl;
        downloadButton.download = 'ai-generated-image.png';
        downloadButton.className = 'download-button mt-3 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700';
        downloadButton.innerHTML = `<i data-lucide="download" class="w-4 h-4 mr-2"></i> Download Image`;
        
        const contentContainer = document.createElement('div');
        contentContainer.appendChild(img);
        contentContainer.appendChild(downloadButton);

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble bot image-bubble'; 
        bubble.appendChild(contentContainer);
        
        messageDiv.appendChild(bubble);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        lucide.createIcons();
    };

    const handleChat = async () => {
        const userInput = chatInput.value.trim();
        if (!userInput) return;
        addMessage(userInput, 'user');
        chatInput.value = '';
        chatLoading.classList.remove('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }),
                credentials: 'include'
            });

            if (response.status === 401) {
                 addMessage('Your session has expired. Redirecting to login...', 'bot');
                 setTimeout(() => { window.location.href = '/'; }, 2000);
                 return;
            }
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({ error: 'The server returned an unreadable error.' }));
                 throw new Error(errData.error || 'The server responded with an error.');
            }
            
            const data = await response.json();
            if (data.type === 'image') {
                addImage(data.data);
            } else {
                addMessage(data.data, 'bot');
            }
        } catch (error) {
            addMessage(`Error: ${error.message}. Please check server logs.`, 'bot');
        } finally {
            if(chatLoading) chatLoading.classList.add('hidden');
        }
    };

    if (sendButton) sendButton.addEventListener('click', handleChat);
    if (chatInput) chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleChat());

    // --- Speech to Text ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onstart = () => micButton.classList.add('mic-listening');
        recognition.onend = () => micButton.classList.remove('mic-listening');
        recognition.onresult = (event) => {
            chatInput.value = event.results[0][0].transcript;
            handleChat();
        };
    }

    // --- Video to Audio Logic ---
    const vtoaInput = document.getElementById('vtoa-input');
    const vtoaConvertBtn = document.getElementById('vtoa-convert');
    const vtoaFilename = document.getElementById('vtoa-filename');
    let vtoaFile;

    if(vtoaInput) {
        vtoaInput.addEventListener('change', (e) => {
            vtoaFile = e.target.files[0];
            if (vtoaFile) {
                vtoaFilename.textContent = `Selected: ${vtoaFile.name}`;
                vtoaConvertBtn.disabled = false;
                document.getElementById('vtoa-status').innerHTML = '';
            }
        });
    }

    if(vtoaConvertBtn) {
        vtoaConvertBtn.addEventListener('click', async () => {
            if (!vtoaFile) return;
            showStatus('vtoa-status', 'Processing...', 'info');
            vtoaConvertBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(e.target.result);
                    const wavBlob = audioBufferToWav(audioBuffer);
                    const url = URL.createObjectURL(wavBlob);
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = url;
                    downloadLink.download = `${vtoaFile.name.split('.').slice(0, -1).join('.') || vtoaFile.name}.wav`;
                    downloadLink.className = 'mt-4 block text-center text-blue-600 hover:underline';
                    downloadLink.innerText = 'Click here to download your audio file';
                    
                    const statusContainer = document.getElementById('vtoa-status');
                    showStatus('vtoa-status', 'Conversion successful!', 'success');
                    statusContainer.appendChild(downloadLink);

                } catch (error) {
                    console.error('Conversion failed:', error);
                    showStatus('vtoa-status', 'Error: This video format may not be supported by your browser.', 'error');
                } finally {
                    vtoaConvertBtn.disabled = false;
                }
            };
            reader.readAsArrayBuffer(vtoaFile);
        });
    }
    
    // --- Text to Audio Logic ---
    const ttoaText = document.getElementById('ttoa-text');
    const ttoaVoice = document.getElementById('ttoa-voice');
    const ttoaSpeakBtn = document.getElementById('ttoa-speak');
    let voices = [];

    function populateVoiceList() {
        if(!ttoaVoice) return;
        voices = speechSynthesis.getVoices();
        ttoaVoice.innerHTML = voices
            .map(voice => `<option value="${voice.name}">${voice.name} (${voice.lang})</option>`)
            .join('');
    }
    
    if(speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();

    if(ttoaSpeakBtn) {
        ttoaSpeakBtn.addEventListener('click', () => {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            const text = ttoaText.value;
            if (text.trim().length > 0) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = voices.find(voice => voice.name === ttoaVoice.value);
                speechSynthesis.speak(utterance);
            }
        });
    }

    function showStatus(elementId, message, type = 'info') {
        const el = document.getElementById(elementId);
        if(!el) return;
        const colorClass = type === 'success' ? 'text-green-600' : (type === 'error' ? 'text-red-600' : 'text-gray-600');
        el.innerHTML = `<div class="p-2 mt-2 rounded-md ${type !== 'info' ? 'bg-gray-100' : ''} ${colorClass}">${message}</div>`;
    };

    function audioBufferToWav(buffer) {
        let numOfChan = buffer.numberOfChannels,
            len = buffer.length * numOfChan * 2 + 44,
            wavBuffer = new ArrayBuffer(len),
            view = new DataView(wavBuffer),
            channels = [], i, sample, offset = 0, pos = 0;

        setUint32(0x46464952); setUint32(len - 8); setUint32(0x45564157);
        setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2); setUint16(16);
        setUint32(0x61746164); setUint32(len - pos - 4);

        for (i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        while (pos < len) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([view], { type: 'audio/wav' });

        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    }
});