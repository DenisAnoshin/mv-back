import db from '../models/index.js';

export async function createUser(username, password) {
    try {
        const user = await db.User.create({ username, password });
        return user;
    } catch (error) {
        throw new Error('Error creating user: ' + error.message);
    }
}

export async function findUserByUsername(username) {
    try {
        const user = await db.User.findOne({ where: { username } });
        return user;
    } catch (error) {
        throw new Error('Error finding user by username: ' + error.message);
    }
}