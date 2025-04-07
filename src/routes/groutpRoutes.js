import express from 'express';
import { createGroup, editGroup, removeGroup, addUserToGroup, removeUserFromGroup, getAllUsersInGroup, getGroupsUser, getGroupsMessages } from '../controller/groupController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/create', createGroup);
router.put('/edit', editGroup);
router.delete('/remove/:groupId', removeGroup);

//add users to group
router.post('/addUser', addUserToGroup);
router.delete('/removeUser', removeUserFromGroup);

// get
router.get('/getAllUsersInGroup', getAllUsersInGroup);
router.get('/groups', getGroupsUser);
router.get('/messages/:id', getGroupsMessages);

export default router;