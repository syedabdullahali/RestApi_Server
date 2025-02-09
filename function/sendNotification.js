const admin = require('firebase-admin');
const User = require('../model/user/user')
const serviceAccount = require('../won-by-bid-firebase-adminsdk-ns4jh-f405c499cc.json');

const Notification = require('../model/notification')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: "https://<your-project-id>.firebaseio.com",
})


exports.sendSingleNotification = async (userId, name, description) => {
    const user = await User.findById(userId)
    const tempDoc = new Notification({ name, description, userId: userId });

    const message = {
        token: user.fcmToken,
        notification: {
            title: name,
            body: description,
        },
    };

    user.notifications.push(tempDoc?._id);

    await user.save();

    await tempDoc.save()

    await admin.messaging().send(message);
}

exports.sendMultipleNotification = async (name, description) => {

    const users = await User.find();

    const tokens = users.map(user => user.fcmToken).filter(token => token);

    const message = {
        tokens, // List of tokens for multiple users
        notification: {
            title: name,
            body: description,
        },
    };
    // Send notifications to multiple users
    // const response = await admin.messaging().sendMulticast(message);
    const response = await admin.messaging().sendEachForMulticast(message);
    // Save notification history in the Notification schema
    const notificationDocs = users.map(user => ({
        userId: user._id,
        name: name,
        description: description,
        sentAt: new Date(),
    }));
    await Notification.insertMany(notificationDocs);

    return response
}