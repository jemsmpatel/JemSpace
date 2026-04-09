import bcrypt from 'bcrypt';
import User from '../../models/User.js';

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (input, hash) => {
    return await bcrypt.compare(input, hash);
};