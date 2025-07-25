import IMask from 'imask';

// --- Global Audio Context ---
let audioContext;
const soundBuffers = {};

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

async function loadSound(name, url) {
    if (!audioContext) return;
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers[name] = audioBuffer;
    } catch (error) {
        console.error(`Failed to load sound: ${name}`, error);
    }
}

function playSound(name) {
    if (audioContext && soundBuffers[name]) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[name];
        source.connect(audioContext.destination);
        source.start(0);
    }
}

// --- IMask Initialization ---
const cardNumberInput = document.getElementById('card-number');
const cardExpiryInput = document.getElementById('card-expiry');
const cardCvcInput = document.getElementById('card-cvc');

const cardMask = IMask(cardNumberInput, {
  mask: '0000 0000 0000 0000'
});

const expiryMask = IMask(cardExpiryInput, {
  mask: 'MM / YY',
  blocks: {
    MM: {
      mask: IMask.MaskedRange,
      from: 1,
      to: 12
    },
    YY: {
      mask: IMask.MaskedRange,
      from: String(new Date().getFullYear()).slice(2),
      to: String(new Date().getFullYear() + 10).slice(2)
    }
  }
});

const cvcMask = IMask(cardCvcInput, {
  mask: '000'
});

// --- View Containers ---
const prePaymentContainer = document.getElementById('pre-payment-container');
const paymentFormContainer = document.getElementById('payment-form-container');
const goToPaymentButton = document.getElementById('go-to-payment-button');

// --- Product Selection ---
const productItems = document.querySelectorAll('.product-item');
const paymentSummary = document.getElementById('payment-summary');
let selectedProduct = null;

productItems.forEach(item => {
    item.addEventListener('click', () => {
        initAudio(); // Ensure audio is ready
        playSound('select');
        productItems.forEach(p => p.classList.remove('selected'));
        item.classList.add('selected');
        selectedProduct = {
            name: item.dataset.product,
            price: item.dataset.price
        };
        goToPaymentButton.disabled = false;
    });
});

// --- Captcha and Payment Logic ---
const canvas = document.getElementById('captcha-canvas');
const ctx = canvas.getContext('2d');
const captchaInput = document.getElementById('captcha-input');
const payButton = document.getElementById('pay-button');
const errorMessage = document.getElementById('error-message');
const robotCheckbox = document.getElementById('robot-checkbox');
const robotCheckContainer = document.getElementById('robot-check-container');
const textCaptchaContainer = document.getElementById('text-captcha-container');
const buttonText = payButton.querySelector('.button-text');
const spinner = payButton.querySelector('.spinner');

let captchaText = '';

function generateCaptchaText(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function drawCaptcha() {
    captchaText = generateCaptchaText();
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1d'; // Dark background for canvas
    ctx.fillRect(0, 0, width, height);

    // Draw watermark
    ctx.save();
    ctx.font = 'bold 48px "Arial", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOMIPAY', width / 2, height / 2);
    ctx.restore();
    
    // Draw text
    ctx.font = 'bold 32px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < captchaText.length; i++) {
        const char = captchaText[i];
        const x = (width / captchaText.length) * (i + 0.5);
        const y = height / 2 + (Math.random() - 0.5) * 10;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.5); // Random rotation
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 70%)`; // Random color
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    // Add distortion lines
    for (let i = 0; i < 15; i++) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.lineWidth = Math.random() * 2;
        ctx.stroke();
    }
    
    // Add noise
     for (let i = 0; i < 1000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillStyle = `${color}33`; // low alpha
        ctx.fillRect(x, y, 1, 1);
    }
}

function showSpinner(show) {
    if (show) {
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
        payButton.disabled = true;
    } else {
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
        payButton.disabled = false;
    }
}

// --- Event Listeners ---
goToPaymentButton.addEventListener('click', () => {
    if (!selectedProduct) return;
    initAudio();
    playSound('click');
    paymentSummary.textContent = `Вы оплачиваете: ${selectedProduct.name} - ${selectedProduct.price}`;
    prePaymentContainer.classList.add('hidden');
    paymentFormContainer.classList.remove('hidden');
});

robotCheckContainer.addEventListener('click', (e) => {
    // This allows clicking the whole div to toggle the checkbox
    if (e.target !== robotCheckbox) {
        robotCheckbox.checked = !robotCheckbox.checked;
        // Manually trigger change event
        robotCheckbox.dispatchEvent(new Event('change'));
    }
});

robotCheckbox.addEventListener('change', () => {
    initAudio(); // Initialize audio on first user interaction
    playSound('click');
    if (robotCheckbox.checked) {
        textCaptchaContainer.classList.remove('hidden');
        drawCaptcha();
    } else {
        textCaptchaContainer.classList.add('hidden');
        errorMessage.textContent = '';
    }
});

payButton.addEventListener('click', () => {
    errorMessage.textContent = '';
    showSpinner(true);
    
    setTimeout(() => {
        // Show the new error message.
        errorMessage.textContent = 'Сервер "СБЕРБАНК ОБМЕННИК" недоступен';
        drawCaptcha(); // Regenerate captcha on failed attempt
        captchaInput.value = '';
        showSpinner(false);
    }, 1500); // Simulate network delay
});

// Refresh captcha by clicking on it
canvas.addEventListener('click', () => {
    errorMessage.textContent = '';
    drawCaptcha();
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    loadSound('click', './click.mp3');
    loadSound('select', './select.mp3');
});

// Initial draw
drawCaptcha();