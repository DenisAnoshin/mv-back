# Chat App back-end APIs using NodeJS, Express, PostgreSQL
This is a simple Node.js application that provides web services(APIs) for facilitating group chat and managing data. It includes features for user management, authentication, group management, and sending group messages.

* Created By: Dammu Pavani
* Email: dammupavani44@gmail.com

## Installation
* Ensure you have Node.js, NPM, and PostgreSQL installed on your system.

## Project setup

### Usage => Node.js Server
To run the application:

1. Clone this repository.
2. Install dependencies with **npm install**.
3. Set up your chosen database.
4. Configure PostgreSQL database connection in the application.
5. Run the application with **npm start**.

Server will be running at: **http://localhost:8080**

## Description

### Authentication APIs
Authentication APIs are provided for user signup, login and logout functionalities.

**APIs:**
* Signup: Users can sign up with a username and password.
* Login: Users can authenticate themselves. (JWT token will be created per the session)
* Logout: Users can log out of their accounts.

### Group management
The one who creates the group is the Admin. Admin can only add/remove/edit users to the group. 

**APIs**
* CreateGroup: Any user can create a group. User who created the group is the Admin to that group. 
* AddUserToGroup: Admin can add a user to the group through this API
* RemoveUserFromGroup: Admin can remove a user from the group.
* GetAllUsersInGroup: Any user in the group can see all the group members.
* EditGroup: Admin can edit the group.
* RemoveGroup: Admin can delete the group.

### Group messages
Users can send messages in groups and interact with messages (e.g., liking messages). All users are visible to all other users.

**APIs**
* Send Messages: Users can send messages in group chats.
* Like Messages: Users can like messages.




