import validator from 'validator';

export const validateSignup = (req, res) => {
    const { username, password } = req.body;
    const errors = [];

    if (!username || !password) {
        errors.push('Username and password are mandatory');
    }
    if (username && !validator.isLength(username, { min: 3, max: 25 })) {
        errors.push('Username should be in btwn 3 to 25 chars');
    }
    if (password && !validator.isLength(password, { min: 6 })) {
        errors.push('Password should be at least 6 chars');
    }

    return errors;
};

export const validateLogin = ({ username, password }) => {
    const errors = [];
    if (!username || !password) {
        errors.push('Username and password are mandatory');
    }
    return errors;
};