document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

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
                content.id === `${target}-tab` ? content.classList.remove('hidden') : content.classList.add('hidden');
            });
        });
    });

    // --- Chatbot, Emoji, and File Upload Logic ---
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatLoading = document.getElementById('chat-loading');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const emojiPicker = document.querySelector('emoji-picker');
    const fileUploadButton = document.getElementById('file-upload-button'); // This is the label
    const fileUploadInput = document.getElementById('file-upload');
    
    const attachmentPreview = document.getElementById('attachment-preview');
    const attachmentFilename = document.getElementById('attachment-filename');
    const removeAttachmentButton = document.getElementById('remove-attachment-button');
    
    let attachedFile = null;

    // --- Helper functions to disable/enable inputs ---
    const disableChatInputs = () => {
        chatInput.disabled = true;
        sendButton.disabled = true;
        micButton.disabled = true;
        emojiButton.disabled = true;
        fileUploadButton.classList.add('disabled-input'); // Use class for the label
    };

    const enableChatInputs = () => {
        chatInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = false;
        emojiButton.disabled = false;
        fileUploadButton.classList.remove('disabled-input');
    };

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

    // --- THIS FUNCTION IS CORRECTED ---
    const clearAttachment = () => {
        attachedFile = null;
        fileUploadInput.value = '';
        if (attachmentPreview) attachmentPreview.classList.add('hidden');
        if (fileUploadButton) {
            // Select either the original <i> tag or the <svg> it was replaced with
            const icon = fileUploadButton.querySelector('i, svg');
            // Only try to remove the class if an icon was actually found
            if (icon) {
                icon.classList.remove('text-blue-500');
            }
        }
        // No need to call lucide.createIcons() here again
    };

    // --- THIS EVENT LISTENER IS CORRECTED ---
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                clearAttachment();
                return;
            }
            attachedFile = file;
            attachmentPreview.classList.remove('hidden');
            attachmentFilename.textContent = file.name;

            // This part is for visual feedback, not strictly necessary for the fix
            const attachmentFileIcon = document.getElementById('attachment-file-icon');
            const attachmentLoadingSpinner = document.getElementById('attachment-loading-spinner');
            if (attachmentFileIcon) attachmentFileIcon.classList.add('hidden');
            if (attachmentLoadingSpinner) attachmentLoadingSpinner.classList.remove('hidden');

            setTimeout(() => {
                if (attachmentFileIcon) attachmentFileIcon.classList.remove('hidden');
                if (attachmentLoadingSpinner) attachmentLoadingSpinner.classList.add('hidden');
                
                if (fileUploadButton) {
                    // Select either the original <i> tag or the <svg> it was replaced with
                    const icon = fileUploadButton.querySelector('i, svg');
                    // Only try to add the class if an icon was actually found
                    if (icon) {
                        icon.classList.add('text-blue-500');
                    }
                }
                lucide.createIcons(); // It's okay to call it here to render any new icons
            }, 1500);
        });
    }

    if (removeAttachmentButton) {
        removeAttachmentButton.addEventListener('click', clearAttachment);
    }
    
    const addMessage = (message, sender) => {
        if (!chatWindow) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
        const messageText = message || "Sorry, an unexpected error occurred.";
        messageDiv.innerHTML = `<div class="chat-bubble ${sender}">${messageText.replace(/\n/g, '<br>')}</div>`;
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
        if (!userInput && !attachedFile) return;

        disableChatInputs();

        if (userInput) {
            addMessage(userInput, 'user');
        }
        chatInput.value = '';
        chatLoading.classList.remove('hidden');

        const formData = new FormData();
        formData.append('prompt', userInput);
        if (attachedFile) {
            formData.append('file', attachedFile, attachedFile.name);
        }
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                body: formData, 
                credentials: 'include'
            });

            if (response.status === 401) {
                 addMessage('Your session has expired. Redirecting to login...', 'bot');
                 setTimeout(() => { window.location.href = '/'; }, 2000);
                 // The finally block will still run before this returns
                 return;
            }
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({ error: 'The server returned an unreadable error.' }));
                 throw new Error(errData.error || `Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.error) {
                addMessage(`Error: ${data.error}`, 'bot');
            } else if (data.type === 'image') {
                addImage(data.data);
            } else {
                addMessage(data.data, 'bot');
            }
        } catch (error) {
            addMessage(`Error: ${error.message}.`, 'bot');
        } finally {
            if(chatLoading) chatLoading.classList.add('hidden');
            clearAttachment();
            enableChatInputs();
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

    // --- Other utility functions (Video to Audio, Text to Audio) ---
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
                    downloadLink.download = `${vtoaFile.name.split('.')[0]}.wav`;
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