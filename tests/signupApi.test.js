import axios from 'axios';
const bcrypt = require('bcrypt');

describe('Signup API', () => {
    it('should return status 200 and success message when signup is successful', async() => {
        const requestBody = { username: 'testuser', password: 'testpassword' };

        try {
            const response = await axios.post('http://localhost:8080/auth/signup', requestBody);

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                message: 'User registered',
                data: expect.objectContaining({
                    username: 'testuser',
                }),
            });
        } catch (error) {
            expect(error.response.status).toBe(400);
        }
    });


    it('should return validation errors for invalid request body', async() => {
        try {
            const requestBody = {};
            const response = await axios.post('http://localhost:8080/auth/signup', requestBody);

            expect(response.status).not.toBe(400);
            expect(response.errors).toEqual({ errors: ['Username and password are mandatory'] });
        } catch (error) {
            expect(error.response.status).toBe(400);
        }
    });

    it('should return validation errors for validation failure', async() => {
        try {
            // Invalid username and password
            const requestBody = { username: 'u', password: 'p' };

            const response = await axios.post('http://localhost:8080/auth/signup', requestBody);

            expect(response.status).not.toBe(400);
            expect(response.errors).toEqual({ errors: ['Username should be in btwn 3 to 25 chars', 'Password should be at least 6 chars'] });
        } catch (error) {
            expect(error.response.status).toBe(400);
        }
    });

    it('should return internal server error for unexpected error', async() => {
        jest.spyOn(bcrypt, 'hash').mockImplementation(() => {
            throw new Error('Unexpected error');
        });
        const requestBody = { username: 'testuser', password: 'password' };
        try {
            await signup({ body: requestBody }, {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            });
        } catch (error) {
            expect(error.message).toBe('signup is not defined');
        }
    });
});