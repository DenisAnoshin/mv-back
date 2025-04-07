import validator from 'validator';

export const validateCreateGroup = (name) => {
    const errors = [];
    if (!name) {
        errors.push('Group name is mandatory');
    }
    if (!validator.isLength(name, { min: 3, max: 25 })) {
        errors.push('Group name should be in btwn 3 to 25 chars');
    }
    return errors;
};

export const validateEditGroup = (groupId, name) => {
    const errors = [];
    if (!groupId || isNaN(groupId)) {
        errors.push('Invalid groupId');
    }
    if (!name) {
        errors.push('Group name is mandatory');
    }
    if (!validator.isLength(name, { min: 3, max: 25 })) {
        errors.push('Group name should be in btwn 3 to 25 chars');
    }
    return errors;
};

export const validateRemoveGroup = (groupId) => {
    const errors = [];
    if (!groupId || isNaN(groupId)) {
        errors.push('Invalid groupId');
    }
    return errors;
};

export const validateAddUserToGroup = (userId, groupId) => {
    const errors = [];
    if (!userId || isNaN(userId)) {
        errors.push('Invalid userId');
    }
    if (!groupId || isNaN(groupId)) {
        errors.push('Invalid groupId');
    }

    return errors;
};

export const validateRemoveUserFromGroup = (userId, groupId) => {
    const errors = [];
    if (!userId || isNaN(userId)) {
        errors.push('Invalid userId');
    }
    if (!groupId || isNaN(groupId)) {
        errors.push('Invalid groupId');
    }
    return errors;
};