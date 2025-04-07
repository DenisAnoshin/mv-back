import * as messageService from '../services/messageService.js';

export const createMessage = async(req, res) => {
    try {
        const { content } = req.body;
        const { id } = req.params
        const senderId = req.user.id;

        const result = await messageService.createMessage(id, senderId, content);

        if (result.success) {
            res.json({ message: 'Message sent' });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Error while creating the message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const likeMessage = async(req, res) => {
    try {
        const { messageId } = req.body;
        const userId = req.user.id;

        let result = await messageService.likeMessage(messageId, userId);

        if (result.success) {
            res.json({ message: 'Liked the message' });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Error while liking message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};