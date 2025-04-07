import jwt from 'jsonwebtoken';
import db from '../models/index.js';

export const verifyToken = async(req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        res.status(401).json({ error: 'Missing Token, Invalid authorization' });
        return;
    }

    try {
        const decoded = jwt.verify(token, 'groupChat');
        const user = await db.User.findOne({ where: { username: decoded.username } });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(error.message);
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const verifyTokenSocket = async (socket, next) => {
    try {
        // Получаем токен из заголовков (обратите внимание на регистр 'Authorization')
        const token = socket.handshake.headers.authorization || 
                     socket.handshake.headers.Authorization;

        if (!token) {
            return next(new Error("Требуется авторизация"));
        }

        // Удаляем 'Bearer ', если он есть
        const tokenWithoutBearer = token.replace(/^Bearer\s+/i, '');

        const decoded = jwt.verify(tokenWithoutBearer, 'groupChat');
        const user = await db.User.findOne({ where: { username: decoded.username } });
        
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;
        next();
    } catch (error) {
        console.log('Socket auth error:', error.message);
        next(new Error('Invalid token'));
    }
};