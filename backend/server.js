import app from './app.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(PORT,
            process.env.PROJECT_IP,
            () => console.log(`Server running on ${PORT}`));
    })
    .catch(err => console.log(err));