const axios = require('axios');

const testWebmasterAPI = async () => {
    try {
        console.log('Testing webmaster login API endpoint...');
        
        const response = await axios.post('http://localhost:5001/api/auth/webmaster-login', {
            username: 'webmaster',
            password: 'admin'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✓ API Response:', response.data);
        console.log('✓ Webmaster login API is working correctly!');
        
        return response.data;
        
    } catch (error) {
        console.error('✗ API Error:', error.response?.data || error.message);
        return null;
    }
};

testWebmasterAPI();