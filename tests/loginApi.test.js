const axios = require('axios');
const bcrypt = require('bcrypt');
const findUserByUsername = require('../src/services/userService');

describe('Login API', () => {
    it('should return validation errors for invalid request body', async() => {
        try {
            const requestBody = {};

            const response = await axios.post('http://localhost:8080/auth/login', requestBody);
            expect(response.status).not.toBe(400);
        } catch (error) {
            expect(error.response.status).toBe(400);
            expect(error.response.data).toEqual({ errors: ['Username and password are mandatory'] });
        }
    });

    it('should return unauthorized error for invalid credentials', async() => {
        try {
            const requestBody = { username: 'testuser', password: 'password' };

            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
            jest.spyOn(findUserByUsername, 'findUserByUsername').mockResolvedValue(null);

            const response = await axios.post('http://localhost:8080/auth/login', requestBody);
            expect(response.status).not.toBe(401);
            expect(response.data).toEqual({ error: 'Invalid credentials' });
        } catch (error) {
            expect(error.response.status).toBe(401);
        }
    });

    it('should return internal server error for unexpected error', async() => {
        try {
            const requestBody = { username: 'testuser', password: 'password' };
            jest.spyOn(global.console, 'error').mockImplementation(() => {});
            jest.spyOn(findUserByUsername, 'findUserByUsername').mockRejectedValue(new Error('Unexpected error'));

            let response = await axios.post('http://localhost:8080/auth/login', requestBody);
            expect(response.data).toEqual({ error: 'Internal Server Error' });
        } catch (error) {
            expect(error.response.status).toBe(401);
        }
    });

    it('should return token for valid credentials', async() => {
        try {
            const requestBody = { username: 'validuser', password: 'validpassword' };

            jest.spyOn(findUserByUsername, 'findUserByUsername').mockResolvedValue({ username: 'validuser', password: await bcrypt.hash('validpassword', 10) });
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            const response = await axios.post('http://localhost:8080/auth/login', requestBody);

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('token');
        } catch (error) {
            expect(error.response.status).toBe(401);
        }
    });
});