import axios from 'axios';

export const sendEmail = async (to, subject, html) => {
    try {
        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { email: process.env.EMAIL_FROM },
                to: [{ email: to }],
                subject,
                htmlContent: html
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (err) {
        console.log('Email error:', err.response?.data || err.message);
    }
};