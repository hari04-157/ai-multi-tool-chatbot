document.addEventListener('DOMContentLoaded', () => {
    // This will run only after the HTML page is fully loaded, ensuring all icons appear.
    lucide.createIcons();

    // --- New Chatbot Toggle Logic ---
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatLauncherButton = document.getElementById('chat-launcher-button');
    const closeChatButton = document.getElementById('close-chat-button');

    const toggleChatWindow = () => {
        chatbotContainer.classList.toggle('scale-0');
        chatbotContainer.classList.toggle('opacity-0');
        
        // Hide/show the launcher button with a slight delay for a smoother effect
        if (chatLauncherButton.classList.contains('scale-0')) {
            setTimeout(() => chatLauncherButton.classList.remove('scale-0'), 300);
        } else {
            chatLauncherButton.classList.add('scale-0');
        }
    };

    chatLauncherButton.addEventListener('click', toggleChatWindow);
    closeChatButton.addEventListener('click', toggleChatWindow);

    // --- Original Code (No changes below this line) ---
    
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    // --- Tab Switching ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Stop any ongoing speech when switching tabs
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            contents.forEach(content => {
                content.id === `${target}-tab` ? content.classList.remove('hidden') : content.classList.add('hidden');
            });
        });
    });
    
    // --- Chatbot Logic ---
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLoading = document.getElementById('chat-loading');

    const addMessage = (message, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
        const messageContent = document.createElement('div');
        messageContent.textContent = message;
        messageDiv.innerHTML = `<div class="chat-bubble ${sender}">${messageContent.innerHTML.replace(/\n/g, '<br>')}</div>`;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const handleChat = async () => {
        const userInput = chatInput.value.trim();
        if (!userInput) return;
        addMessage(userInput, 'user');
        chatInput.value = '';
        chatLoading.classList.remove('hidden');
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // This now calls our own backend server
           const response = await fetch('https://ai-chatbot-api-7muc.onrender.com/chat', {
            const response = await fetch('https://ai-chatbot-api-7muc.onrender.com/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Server error! Status: ${response.status}`);
            }
            const botResponse = data.response;
            if (botResponse) addMessage(botResponse, 'bot');
            else addMessage("I received an empty response from the server.", 'bot');
        } catch (error) {
            console.error('Error fetching from backend:', error);
            addMessage(`Sorry, an error occurred: ${error.message}. Is the backend server running?`, 'bot');
        } finally {
            chatLoading.classList.add('hidden');
        }
    };
    
    sendButton.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleChat());

    // --- Speech to Text Logic ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micButton.addEventListener('click', () => {
            micButton.classList.contains('mic-listening') ? recognition.stop() : recognition.stop();
            recognition.start();
        });
        recognition.onstart = () => micButton.classList.add('mic-listening');
        recognition.onend = () => micButton.classList.remove('mic-listening');
        recognition.onresult = (event) => {
            chatInput.value = event.results[0][0].transcript;
            handleChat();
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMsg = `Speech recognition error: ${event.error}.`;
            if (event.error === 'not-allowed') errorMsg = "Microphone access denied. Please enable it in your browser settings."
            addMessage(errorMsg, 'bot');
        };
    } else {
        micButton.disabled = true;
        addMessage("Speech recognition is not supported in this browser.", 'bot');
    }

    // --- Media Conversion Helper ---
    const showStatus = (elementId, message, type = 'info') => {
        const el = document.getElementById(elementId);
        const colorClass = type === 'success' ? 'text-green-600' : (type === 'error' ? 'text-red-600' : 'text-gray-600');
        el.innerHTML = `<div class="p-2 mt-2 rounded-md ${type !== 'info' ? 'bg-gray-100' : ''} ${colorClass}">${message}</div>`;
    };

    // --- Video to Audio (WAV) Logic ---
    const vtoaInput = document.getElementById('vtoa-input');
    const vtoaConvertBtn = document.getElementById('vtoa-convert');
    const vtoaFilename = document.getElementById('vtoa-filename');
    let vtoaFile;

    vtoaInput.addEventListener('change', (e) => {
        vtoaFile = e.target.files[0];
        if (vtoaFile) {
            vtoaFilename.textContent = `Selected: ${vtoaFile.name}`;
            vtoaConvertBtn.disabled = false;
            document.getElementById('vtoa-status').innerHTML = '';
        }
    });

    vtoaConvertBtn.addEventListener('click', async () => {
        if (!vtoaFile) return;
        vtoaConvertBtn.disabled = true;
        vtoaConvertBtn.innerHTML = "Extracting...";
        showStatus('vtoa-status', '<div class="flex items-center justify-center"><div class="loader mr-2"></div> Processing...</div>');

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                try {
                    const buffer = await audioContext.decodeAudioData(e.target.result);
                    const wavBlob = audioBufferToWav(buffer);
                    const outputFileName = `${vtoaFile.name.split('.').slice(0, -1).join('.')}.wav`;
                    
                    const url = URL.createObjectURL(wavBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = outputFileName;
                    a.className = "mt-4 inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600";
                    a.innerHTML = `<i data-lucide="download" class="inline-block w-4 h-4 mr-2"></i> Download ${outputFileName}`;
                    
                    showStatus('vtoa-status', 'Extraction successful!', 'success');
                    document.getElementById('vtoa-status').appendChild(a);
                    lucide.createIcons();
                } catch (decodeError) {
                     console.error(decodeError);
                     showStatus('vtoa-status', 'Error decoding audio from video file. The format may not be supported.', 'error');
                } finally {
                    vtoaConvertBtn.disabled = false;
                    vtoaConvertBtn.innerHTML = "Extract Audio";
                }
            };
            fileReader.onerror = () => {
                showStatus('vtoa-status', 'Error reading file.', 'error');
                vtoaConvertBtn.disabled = false;
                vtoaConvertBtn.innerHTML = "Extract Audio";
            }
            fileReader.readAsArrayBuffer(vtoaFile);
        } catch (error) {
            console.error(error);
            showStatus('vtoa-status', 'An error occurred during extraction.', 'error');
            vtoaConvertBtn.disabled = false;
            vtoaConvertBtn.innerHTML = "Extract Audio";
        }
    });
    
    // --- Text to Audio Logic ---
    const ttoaText = document.getElementById('ttoa-text');
    const ttoaVoice = document.getElementById('ttoa-voice');
    const ttoaSpeakBtn = document.getElementById('ttoa-speak');
    const ttoaStatus = document.getElementById('ttoa-status');
    let voices = [];

    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        ttoaVoice.innerHTML = voices
            .map(voice => `<option value="${voice.name}">${voice.name} (${voice.lang})</option>`)
            .join('');
    }
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();

    ttoaSpeakBtn.addEventListener('click', () => {
        const text = ttoaText.value.trim();
        if (!text) {
            ttoaStatus.textContent = 'Please enter some text.';
            return;
        }

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = ttoaVoice.value;
        const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.onstart = () => {
            ttoaSpeakBtn.textContent = 'Stop';
            ttoaStatus.textContent = 'Speaking...';
        };
        
        utterance.onend = () => {
            ttoaSpeakBtn.textContent = 'Speak';
            ttoaStatus.textContent = 'Finished speaking.';
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            ttoaSpeakBtn.textContent = 'Speak';
            ttoaStatus.textContent = `An error occurred: ${event.error}`;
        };

        speechSynthesis.speak( utterance);
    });


    // --- WAV conversion utility ---
    function audioBufferToWav(buffer) {
        let numOfChan = buffer.numberOfChannels,
            len = buffer.length * numOfChan * 2 + 44,
            wavBuffer = new ArrayBuffer(len),
            view = new DataView(wavBuffer),
            channels = [],
            i, sample,
            offset = 0,
            pos = 0;

        setUint32(0x46464952); 
        setUint32(len - 8); 
        setUint32(0x45564157); 
        setUint32(0x20746d66); 
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);
        setUint32(0x61746164); 
        setUint32(len - pos);

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

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }
});