import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByUsername } from '../services/userService.js'; // Adjust the path accordingly
import { validateSignup, validateLogin } from '../middleware/validateUserMiddleware.js';

export const signup = async(req, res) => {
    const { username, password } = req.body;
    const validationErrors = validateSignup(req, res);

    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            res.status(400).json({ error: 'Username already existed' });
            return;
        }

        const user = await createUser(username, hashedPassword);
        delete user.password;
        const token = jwt.sign({ username }, 'groupChat');
        user.token = token
        res.json({ token });
    } catch (error) {
        console.error('signup error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async(req, res) => {
    const { username, password } = req.body;

    const validationErrors = validateLogin({ username, password });

    if (validationErrors.length > 0) {
        res.status(400).json({ errors: validationErrors });
        return;
    }

    try {
        const user = await findUserByUsername(username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ username }, 'groupChat');

        res.json({ token });
    } catch (error) {
        console.error('login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const logout = async(req, res) => {
    try {
        req.headers.authorization = null;
        return res.status(200).send({
            message: "You've been signed out!"
        });
    } catch (err) {
        next(err);
    }
};