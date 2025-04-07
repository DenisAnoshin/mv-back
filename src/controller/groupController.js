import * as groupService from '../services/groupService.js';
import * as groupValidator from '../middleware/validateGroupMiddleware.js';

export const createGroup = async(req, res) => {
    try {
        const { name } = req.body;
        const user = req.user;
        const validationErrors = groupValidator.validateCreateGroup(name);
        if (validationErrors.length > 0) {
            res.status(400).json({ errors: validationErrors });
            return;
        }

        const result = await groupService.createGroup(name, user.id);
        if (res) {
            res.json({ message: 'Group created', data: result });
        } else {
            console.error('Response object is undefined.');
        }
    } catch (error) {
        console.error('group creation error:', error);
        if (res) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.error('Response object is undefined.');
        }
    }
};

export const editGroup = async(req, res) => {
    try {
        const { groupId, name } = req.body;
        const user = req.user

        const validationErrors = groupValidator.validateEditGroup(groupId, name);

        if (validationErrors.length > 0) {
            res.status(400).json({ errors: validationErrors });
            return;
        }

        const group = await groupService.findGroupById(groupId);

        if (!group) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }
        if (group.groupAdmin.id !== user.id) {
            res.status(403).json({ message: "Permission denied, only group admin can modify the group name" });
            return
        }

        const result = await groupService.editGroup(group, name);
        res.json({ message: 'Group edited', data: result });
    } catch (error) {
        console.error('group editing error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const removeGroup = async(req, res) => {
    try {
        const { groupId } = req.params;
        const user = req.user

        const validationErrors = groupValidator.validateRemoveGroup(Number(groupId));

        if (validationErrors.length > 0) {
            res.status(400).json({ errors: validationErrors });
            return;
        }

        const group = await groupService.findGroupById(Number(groupId));
        if (group !== null && group.groupAdmin.id !== user.id) {
            res.status(403).json({ message: "Permission denied, only group admin can remove/delete group" });
            return
        }
        if (!group) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }

        await groupService.removeGroup(group);
        res.json({ message: 'Group removed' });
    } catch (error) {
        console.error('group removing error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const addUserToGroup = async(req, res) => {
    try {
        const { userId, groupId } = req.body;
        const user = req.user
        const validationErrors = groupValidator.validateAddUserToGroup(userId, groupId);

        if (validationErrors.length > 0) {
            res.status(400).json({ errors: validationErrors });
            return;
        }


        const group = await groupService.findGroupById(groupId);
        const targetUser = await groupService.findUserById(userId);

        if (group !== null && group.groupAdmin.id !== user.id) {
            res.status(403).json({ message: "Permission denied, only group admin can add user to group" });
            return
        }

        if (!group || !targetUser) {
            res.status(404).json({ error: 'Group or User not found' });
            return;
        }

        const result = await groupService.addUserToGroup(targetUser, group);
        res.json({ message: 'User added to the group', data: result });
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ error: error.message ? error.message : 'Internal Server Error' });
    }
};

export const removeUserFromGroup = async(req, res) => {
    try {
        const { userId, groupId } = req.body;
        const user = req.user;

        const validationErrors = groupValidator.validateRemoveUserFromGroup(userId, groupId);

        if (validationErrors.length > 0) {
            res.status(400).json({ errors: validationErrors });
            return;
        }

        const group = await groupService.findGroupById(groupId);
        const targetUser = await groupService.findUserById(userId);


        if (group !== null && group.groupAdmin.id !== user.id) {
            res.status(403).json({ message: "Permission denied, only group admin can remove user from group" });
            return
        }
        if (!group || !targetUser) {
            res.status(404).json({ error: 'Group or user not found' });
            return;
        }

        const result = await groupService.removeUserFromGroup(targetUser, group);
        res.json({ message: 'User removed from the group', data: result })
    } catch (error) {
        console.error('Error while removing user from group:', error);
        res.status(500).json({ error: error.message ? error.message : 'Internal Server Error' });
    }
}

export const getAllUsersInGroup = async(req, res) => {
    try {
        const { groupId } = req.body;
        const users = await groupService.getUsersByGroupId(groupId);

        res.json({ message: 'Users retrieved', data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getGroupsUser = async(req, res) => {
    try {
        const groups = await groupService.getGroupsUser(req.user.id);

        res.json({ data: groups});
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getGroupsMessages = async(req, res) => {
    try {
        //const { group_id } = req.query;
        const messages = await groupService.getGroupsMessages(req.user.id, req.params.id);

        res.json({ data: messages, test: '123'});
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}