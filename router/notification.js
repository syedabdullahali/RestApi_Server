const router = require('express').Router()
const admin = require('firebase-admin');
const User = require('../model/user/user')
const serviceAccount = require('../won-by-bid-firebase-adminsdk-ns4jh-f405c499cc.json');

const Notification = require('../model/notification');
const { sendSingleNotification, sendMultipleNotification } = require('../function/sendNotification');

/* admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://<your-project-id>.firebaseio.com",
}) */

router.post('/save-fcm-token', async (req, res) => {
  const { userId, fcmToken } = req.body;
  try {
    const user = await User.findOneAndUpdate({ userId }, { fcmToken }, { upsert: true, new: true });
    res.send({ success: true, message: "Token saved successfully", user });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});


// i have chagnged notification saving method
router.post('/send-notification/single', async (req, res) => {
  // console.log("req.body: ", req.body);

  const { userId, title, body } = req.body;
  try {
    await sendSingleNotification(userId, body.name, body.description)
    // const user = await User.findOne({ userId });
    /* const user = await User.findById(userId)
    // console.log("user: ", user);

    if (!user || !user.fcmToken) {
      return res.status(404).send({ success: false, message: "User not found or FCM token missing" });
    }
    const message = {
      token: user.fcmToken,
      notification: {
        title: body.name,
        body: body.description,
      },
    };

    const tempDoc = new Notification({ ...body, userId: user._id });
    // console.log("tempDoc: ", tempDoc);

    await tempDoc.save()
    // console.log("message: ", message);

    await admin.messaging().send(message);
    // console.log("result: ", result);

    user.notifications.push(tempDoc?._id);
    await user.save(); */

    res.send({ success: true, message: "Notification sent to single user and saved successfully" });
  } catch (err) {
    console.log("error on send-notification/single: ", err);
    res.status(500).send({ success: false, message: err.message });
  }
});


router.post('/send-notification/multiple', async (req, res) => {
  const body = req.body;
  try {

    const response = await sendMultipleNotification(name = body.title, description = body.description,
      body.notficationPath
    )
    // Find users based on the provided userIds
    /* const users = await User.find();
    const tokens = users.map(user => user.fcmToken).filter(token => token);

    if (!tokens.length) {
      return res.status(404).send({ success: false, message: "No valid FCM tokens found" });
    }
    const message = {
      tokens, // List of tokens for multiple users
      notification: {
        title: body.name,
        body: body.description,
      },
    };
    // Send notifications to multiple users
    // const response = await admin.messaging().sendMulticast(message);
    const response = await admin.messaging().sendEachForMulticast(message);
    // Save notification history in the Notification schema
    const notificationDocs = users.map(user => ({
      userId: user._id,
      name: body.name,
      description: body.description,
      sentAt: new Date(),
    }));
    await Notification.insertMany(notificationDocs); */
    res.send({ success: true, message: `Notifications sent: ${response.successCount}, Failed: ${response.failureCount}`, });
  } catch (err) {
    console.log("error: ", err);

    res.status(500).send({ success: false, message: err.message });
  }
});

router.get('/notifications/:userId', async (req, res) => {

  const { userId } = req.params;
  try {
    const user = await Notification.find({ userId: userId }).sort({ createdAt: -1 })
    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }
    res.send({ success: true, notifications: user });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

router.get('/admin/notifications', async (req, res) => {
  const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
  try {
    const query = {};
    if (startDate && endDate) {
      query["notifications.date"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const notificationData = await Notification.find(query).skip((page - 1) * limit).limit(parseInt(limit)).lean();
    const countDocument = await Notification.countDocuments()
    res.send({ success: true, data: countDocument, total: notificationData, page, limit, });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});



module.exports = router