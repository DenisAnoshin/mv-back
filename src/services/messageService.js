import db from '../models/index.js';

export async function createMessage(groupId, senderId, content) {
    try {
        // const isUserInGrp = await isUserInGroup(groupId, senderId);
        // if (!isUserInGrp) {
        //     return {
        //         success: false,
        //         message: 'User is not a member of the group'
        //     };
        // }

        const message = await db.Message.create({
            content: content,
            group_id: groupId,
            user_id: senderId
        });

        return {
            success: true,
            message: message
        }
    } catch (error) {
        throw new Error('Error creating message: ' + error.message);
    }
}

export async function likeMessage(messageId, userId) {
    try {
        const message = await db.Message.findByPk(messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        const isUserInGrp = await isUserInGroup(message.GroupId, userId);
        if (!isUserInGrp) {
            return {
                success: false,
                message: 'User didnt exist in the group'
            };
        }
        const like = await db.Like.create({ MessageId: messageId, UserId: userId });

        return {
            success: true,
            message: like
        }
    } catch (error) {
        throw new Error('Error while liking message: ' + error.message);
    }
}

export async function isUserInGroup(groupId, userId) {
    try {
        const group = await db.Group.findByPk(groupId);

        if (!group) {
            return false;
        }

        const isUserInGroup = await group.hasUser(userId);
        return isUserInGroup;
    } catch (error) {
        throw new Error('Error while checking the user in group: ' + error.message);
    }
}