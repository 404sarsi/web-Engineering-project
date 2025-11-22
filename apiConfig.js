// API Configuration File
// Add your API keys here for enhanced functionality

const API_KEYS = {
    // DeepAI - Free tier (already included)
    deepai: 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K',

    // Remove.bg - Get your free API key at https://www.remove.bg/api
    // 50 free API calls per month
    removebg: 'YOUR_REMOVE_BG_API_KEY',

    // Replicate - For GAN models
    // Get your API key at https://replicate.com/
    replicate: 'YOUR_REPLICATE_API_KEY',

    // Add more API keys as needed
};

const API_ENDPOINTS = {
    deepai: {
        text2img: 'https://api.deepai.org/api/text2img',
        cartoonize: 'https://api.deepai.org/api/toonify',
        colorize: 'https://api.deepai.org/api/colorizer',
    },
    removebg: {
        remove: 'https://api.remove.bg/v1.0/removebg',
    },
};

export { API_KEYS, API_ENDPOINTS };
