const admin = require('firebase-admin');
const User = require('../model/user/user');
const Notification = require('../model/notification');

const path = require('path');

const serviceAccount =path.join(__dirname,'won-by-bid-notification-firebase-adminsdk-fbsvc-438e707575.json')
// console.log(path.join(__dirname,'won-by-bid-notification-firebase-adminsdk-fbsvc-438e707575.json'))

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

exports.sendSingleNotification = async (userId, name, description, obj = {}) => {
    try {

        const user = await User.findById(userId);
        if (!user || !user.fcmToken) return; // No user or no token, skip sending

        const tempDoc = new Notification({ name, description, userId, ...obj });
        user.notifications.push(tempDoc?._id);
        await user.save();
        await tempDoc.save();

        const message = {
            token: user.fcmToken,
            notification: { title: name, body: description },
        };

        await admin.messaging().send(message);
        
    } catch (error) {
        console.error('Error sending single notification:', error);
    }
};

exports.sendMultipleNotification = async (name, description) => {
    try {
        const users = await User.find();
        const tokens = users.map(user => user.fcmToken).filter(Boolean);

        if (tokens.length === 0) return; // No valid tokens, skip sending

        const message = {
            tokens,
            notification: { title: name, body: description },
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        const notificationDocs = users.map(user => ({
            userId: user._id,
            name,
            description,
            sentAt: new Date(),
        }));
        await Notification.insertMany(notificationDocs);

        return response;
    } catch (error) {
        console.error('Error sending multiple notifications:', error);
    }
};
