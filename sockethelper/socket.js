const { Server } = require("socket.io");
const { getGroupedContestsByStatus } = require("./content");
const {
  mycontestMainCategory,
  mycontestBycategoryId,
  winingUser,
} = require("../controller/upcomingLiveWinningController");
const {
  checkAndCompleteMainContests,
} = require("../controller/contestCompletionCheck");
const {
  getPrivateContestData,
  checkAndCompleteContests,
  getSubContestByCatgroyId,
  PrivateContestCategory,
  GetPrivateContests,
  ParticipantCategory,
  getUserContestsByCategoryAndStatus,
  private_Contest_Info,
  private_Contest_Info_wining,
} = require("./privateContest");
const {
  getAndEmitContestsForAllCategories,
} = require("../sockethelper/mainContest");

const cron = require("node-cron");
const { users } = require("./socketUsers");
const {
  getMainCategoryData,
  getMainCategoryDataContestData,
} = require("./mainContest2");
// const { handaleBots } = require("../Bots/Bots");
const { hnadleDashBord } = require("./Dashbord");
const {
  winningLeaderBoard,
  LiveWinningLeaderBoard,
  winningLeaderBoardAdmin,
} = require("./winingLeaderBord");
const {
  getUserDetail,
  sendMessageToClient,
  getChatUserDetail,
  handleJoinRoom,
  createChatSession,
} = require("../controller/chat");
// const { handaleBotsBiddingRange } = require("../Bots2/Bots2");

// Schema to watch changes
const contesthistory = require("../model/contesthistory");
const PrivateContest = require("../model/privatecontest");
const User = require("../model/user/user");

const { handaleUserNoification } = require("./notification");
const equal = require("fast-deep-equal");

const rediousServer = require("../RedisClient/redisClient");
const { getAllAppData } = require("./HandaleBidAll");
const _ = require('lodash'); // make sure to install lodash

// function to watch

const watchCategoryChanges = (callback) => {
  const changeStream = contesthistory.watch();

  const debouncedCallback = _.debounce(() => {
    // console.log("Hello World")
    callback();
  }, 1000); // waits for 1 second of inactivity before firing

  changeStream.on("change", (change) => {
    debouncedCallback();
  });

  changeStream.on("error", (err) => {
    setTimeout(() => watchCategoryChanges(callback), 3000);
    console.error("contesthistory ChangeStream error:", err.message);
  });
};

const wathPrivateContestChanges = (callback) => {
  const changeStream = PrivateContest.watch();

  const debouncedCallback = _.debounce(() => {
    callback();
  }, 1000); // waits for 1 second of inactivity before firing

  changeStream.on("change", (change) => {
    debouncedCallback();
  });

  changeStream.on("error", (err) => {
    setTimeout(() => wathPrivateContestChanges(callback), 3000);
    console.error("PrivateContest ChangeStream error:", err.message);
  });
};

const watchUserChanges = (callback) => {
  const changeStream = User.watch();

  const debouncedCallback = _.debounce(() => {
    callback();
  }, 1000); // waits for 1 second of inactivity before firing

  changeStream.on("change", (change) => {
    // console.log("User change");
    debouncedCallback();
  });

  changeStream.on("error", (err) => {
    setTimeout(() => watchUserChanges(callback), 3000);
    console.error("User ChangeStream error:", err.message);
  });
};

function watchWithRetry(model, label, callback) {
  const startWatcher = () => {
    const changeStream = model.watch();

    changeStream.on("change", callback);

    changeStream.on("error", (err) => {
      
      console.error(`${label} ChangeStream error:`, err.message);
      setTimeout(() => {
        console.log(`${label} ChangeStream reconnecting...`);
        startWatcher(); // retry
      }, 5000);
    });
  };

  startWatcher();
}

// Usage
watchWithRetry(contesthistory, "contesthistory", () => {});
watchWithRetry(PrivateContest, "PrivateContest", () => {});
watchWithRetry(User, "User", () => {});

const initializeSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow any origin
      methods: "*", // Allow all HTTP methods (GET, POST, etc.)
      allowedHeaders: ["Content-Type"], // Allow Content-Type header
      credentials: true, // Allow credentials such as cookies or sessions
    },
    transports: ["websocket", "polling"], // Ensure WebSocket and polling transports are supported
  });

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  const userSockets = new Map();
  const adminSockets = new Map();

  io.on("connection", async (socket) => {
    socket.removeAllListeners('disconnect');
    socket.setMaxListeners(1000);
    const userId = socket.handshake.query.userId;

    if (userId) {
      users[userId] = socket.id;
    }

    console.log(users[userId]);
    const soketIdOfUser = users[userId];

    let roomData = {}; // Object to store room metadata

    //------------------------------------------ Main Contest --------------------------------------------
    let mainCategoryData = {};
    let mainContestPrevData = {};
    let prevContestData = {};

    //------------------------------------------ Private Contest --------------------------------------------
    let prevPrivateContestCategory = {};
    let prevPrivateContestCategorySocketId = "";
    let previousPrivateContestData = {};
    let previousFilterPrivateData = {};
    let activePrivateRoom = {};
    let activePrivateCronsId = {};
    let prevprivateWiningData = {};
    let activeCronsId = {};
    // ----------------------------------------- My Contest --------------------------------------------------
    let prevMyContestcategory = {};

    //------------------------------------------ Main Contest --------------------------------------------

    // Fetch Category For Live Upcoming and Winning
    function handleMainContest() {
      let allTimeDuration = new Set();
      let timeoutIds = [];
      let mainCategoryData = [];

      const clearTimers = () => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
      };

      const extractUniqueEndTimes = (contests) => {
        const times = new Set();
        [
          ...(contests[0]?.live || []),
          ...(contests[0]?.upcoming || []),
        ].forEach((el) => {
          const endTime = el?.timeSlots?.endTime;
          if (endTime) times.add(new Date(endTime).toISOString());
        });
        return times;
      };

      const fetchAndEmitMainCategoryData = async (isManual = false) => {
        try {
          const redisKey = `contest:state:maincontest`;

          const prevDataRaw = await rediousServer.get(redisKey);
          if(prevDataRaw){
            socket.emit("get-main-contest-data", JSON.parse(prevDataRaw));
          }

          const data = await getMainCategoryData({}, userId);

          const response = data.contest;

          const updatedEndTimes = extractUniqueEndTimes(response);

          const hasContestChanged =
            JSON.stringify(mainCategoryData) !== JSON.stringify(response);
          const hasTimingChanged =
            JSON.stringify([...allTimeDuration]) !==
            JSON.stringify([...updatedEndTimes]);

          if (hasContestChanged || isManual) {
            mainCategoryData = response;
            await rediousServer.set(redisKey, JSON.stringify(response), 'EX', 300);
            socket.emit("get-main-contest-data", response);
          }

          if (hasTimingChanged || isManual) {
            allTimeDuration = updatedEndTimes;
            initializeTimers();
          }

        } catch (error) {
          console.error("Error fetching main contest data:", error);
        }
      };

      const initializeTimers = () => {
        clearTimers();
        const now = new Date();

        allTimeDuration.forEach((endTime) => {
          const endDate = new Date(endTime);
          const ms = endDate - now;
          if (ms > 0) {
            const timeoutId = setTimeout(
              () => fetchAndEmitMainCategoryData(false),
              ms
            );
            timeoutIds.push(timeoutId);
          }
        });
      };

      // Initial call
      fetchAndEmitMainCategoryData(true);

      handaleUserNoification().then((res) => {
        socket.emit("User_notification_list", res);
      });

      // Watcher for changes
      watchCategoryChanges(() => fetchAndEmitMainCategoryData(true));
    }

    watchCategoryChanges(() => {
      handleMainContest(true);
    });
    handleMainContest();


    socket.on("Join_Category", (categoryData) => {
      const roomTimers = {};

      const roomId =categoryData.joinCategoryId + "___" +categoryData.categoryStatus
      const roomIdWithUserId = roomId +"___" + soketIdOfUser;

      let allTimeDuration = [];
      

      if (!roomData[roomId]) {
        roomData[roomId] = {
          ...categoryData,
          userCount: 0,
        };
      }

      roomData[roomId].userCount += 1;
      socket.join(roomIdWithUserId);

      const fetchMainCategoryContestData = async (isMenual) => {
        try {

          const responseRedis = await rediousServer.get(roomId);
          const prevDataRaw = JSON.parse(responseRedis)

          if (prevDataRaw) {
            if (categoryData.categoryStatus === "live") {
              io.to(roomIdWithUserId).emit("categoryLiveContestList", prevDataRaw);
            } else if (categoryData.categoryStatus === "upcoming") {
              io.to(roomIdWithUserId).emit("categoryUcomingContestList", prevDataRaw);
            } else if (categoryData.categoryStatus === "wining") {
              io.to(roomIdWithUserId).emit("categoryWiningContestList", prevDataRaw);
            }
          }
          

          const data = await getMainCategoryDataContestData(
            categoryData.joinCategoryId,
            categoryData.categoryStatus,
            userId,
            categoryData.filterObj
          );



          
          if (["live", "upcoming"].includes(categoryData.categoryStatus)) {
            const timeSet = new Set();

            data.forEach((el) => {
              const contests = el?.contests;
              contests?.forEach((contest) => {
                const endTime = new Date(
                  contest?.timeSlots?.endTime
                ).toISOString();
                if (endTime) timeSet.add(endTime);
              });
            });

            allTimeDuration = Array.from(timeSet);
          }

  

          const hasContestChanged =
            responseRedis !==
            JSON.stringify(data);

          if (hasContestChanged || isMenual) {
            if (categoryData.categoryStatus === "live") {
              io.to(roomIdWithUserId).emit("categoryLiveContestList", data);
            } else if (categoryData.categoryStatus === "upcoming") {
              io.to(roomIdWithUserId).emit("categoryUcomingContestList", data);
            } else if (categoryData.categoryStatus === "wining") {
              io.to(roomIdWithUserId).emit("categoryWiningContestList", data);
            }
            // console.log(data)
            await rediousServer.set(roomId, JSON.stringify(data), 'EX', 300);

          }

        } catch (err) {
          console.error("Initial fetch error:", err);
        }
      };

      const initializeTimers = () => {
        if (roomTimers[roomId]) {
          roomTimers[roomId].forEach(clearTimeout);
        }
        roomTimers[roomId] = [];

        allTimeDuration.forEach((endTime) => {
          const endDate = new Date(endTime);
          const now = new Date();
          const milliseconds = endDate - now;

          if (milliseconds > 0) {
            const timer = setTimeout(async () => {
              await fetchMainCategoryContestData(false);
              initializeTimers(); // re-init
            }, milliseconds);

            roomTimers[roomId].push(timer);
          }
        });
      };

      watchCategoryChanges(() => {
        fetchMainCategoryContestData(true);
      });
      watchUserChanges(() => {
        fetchMainCategoryContestData(false);
      });

      fetchMainCategoryContestData(true).then(initializeTimers);

      
    });

    const userRoomMap = new Map();

    socket.on("get-winninguser", async (data) => {
      try {
        // Validate incoming data
        if (!data || !data.contestId || !data.timeSlotId || !data.userId) {
          console.error("Invalid data received:", data);
          return;
        }

        const socketId = users[data.userId]?.toString();
        if (!socketId) {
          console.error(`Socket ID not found for userId: ${data.userId}`);
          return;
        }

        const roomId = `${data.contestId}___${data.timeSlotId}___${data.userId}__${socketId}`;
        const roomIdtoRedix = `${data.contestId}___${data.timeSlotId}_room`;

        const responseRedis = await rediousServer.get(roomIdtoRedix);

        const oldRoomId = userRoomMap.get(data.userId);
        if (oldRoomId && oldRoomId !== roomId) {
          socket.leave(oldRoomId);
          console.log(`User ${data.userId} left room: ${oldRoomId}`);
        }

        // Join the room
        // socket.join(roomId);
        userRoomMap.set(data.userId, roomId);
        socket.join(roomId);
        // console.log(`User ${data.userId} joined room: ${roomId}`);

        // Store previous contest data in a variable scoped to the room
        // Function to fetch and emit winning user data
        const handleWinningUser = async (isManual = false) => {
          try {
             
            // console.log(responseRedis)
            if (responseRedis &&  !prevContestData?.currentWiningUsers ) {
              io.to(roomId).emit("user-winning", JSON.parse(responseRedis));
            }

            const response = await winingUser(
              data.contestId,
              data.timeSlotId,
              data.userId
            );

            const hasContestChanged =  JSON.stringify(prevContestData?.currentWiningUsers) !== JSON.stringify(response?.currentWiningUsers) 

            if (hasContestChanged || isManual) {
              io.to(roomId).emit("user-winning", response);
              await rediousServer.set(roomIdtoRedix, JSON.stringify(response), 'EX', 300);
              prevContestData = response;
              console.log(`Emitted user-winning data for room: ${roomId}`);
            }

          } catch (error) {
            console.error(
              `Error fetching winning user for room ${roomId}:`,
              error.message
            );
          }
        };

        // Emit initial data
        await handleWinningUser(true);

        // Watch for category changes and invoke the handler
        watchCategoryChanges(() => handleWinningUser(false));

        // Handle disconnection
        socket.on("disconnect", () => {
          try {
            if (oldRoomId && oldRoomId !== roomId) {
              socket.leave(oldRoomId);
              console.log(`User ${data.userId} left room: ${oldRoomId}`);
            }
            socket.leave(roomId);
        
          } catch (disconnectError) {
            console.error(
              `Error handling disconnection for userId: ${data.userId} in room ${roomId}:`,
              disconnectError.message
            );
          }
        });

        socket.on("leave-winninguser", (data) => {
          try {
            if (roomId) {
              socket.leave(roomId);
              console.log(`User  left room: ${roomId}`);
            }
          } catch (err) {
            console.error("Error in leave-winninguser:", err.message);
          }
        });

      } catch (error) {
        console.error("Error handling 'get-winninguser' event:", error.message);
      }
    });

    //------------------------------------------ Private Contest --------------------------------------------

    socket.on("get-privatecategory", (data) => {
      const { userId } = data;
      socket.leave(userId);
      socket.join(userId);

      prevPrivateContestCategorySocketId = userId;
      if (!prevPrivateContestCategorySocketId) {
        console.error("Invalid userId or socketId not found.");
        return;
      }

      let allTimeDuration = [];
      let timeoutIds = []

      
      const clearTimers = () => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
      };


      const emitCategories = async (isMenual) => {
        try {
          const response = await PrivateContestCategory(userId);

          // Collect unique endDateTime values from live and upcoming categories
          allTimeDuration = [...response.live, ...response.upcoming].reduce(
            (crr, el) => {
              if (
                new Date(el.endDateTime)?.toISOString() &&
                !crr.includes(new Date(el.endDateTime)?.toISOString())
              ) {
                crr.push(new Date(el.endDateTime)?.toISOString());
              }
              return crr;
            },
            []
          );

          if (
            equal(
              prevPrivateContestCategory[prevPrivateContestCategorySocketId],
              JSON.stringify(response)
            ) ||
            isMenual
          ) {
            io.to(prevPrivateContestCategorySocketId).emit(
              "private-live-category",
              response.live
            );
            io.to(prevPrivateContestCategorySocketId).emit(
              "private-upcoming-category",
              response.upcoming
            );
            io.to(prevPrivateContestCategorySocketId).emit(
              "private-expired-category",
              response.expired
            );
            prevPrivateContestCategory[prevPrivateContestCategorySocketId] =
              response;
          }
          
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };

      const initializeTimers = () => {
        clearTimers()
        allTimeDuration.forEach((endDateTime) => {
          const endTime = new Date(endDateTime);
          const now = new Date();
          const milliseconds = endTime - now;

          if (milliseconds > 0) {
            const timeoutId =   setTimeout(async () => {
              await emitCategories(false).then(initializeTimers);
            }, milliseconds);
            timeoutIds.push(timeoutId);
          }
        });
      };
      // Initial category emission
      emitCategories(true).then(initializeTimers);
      wathPrivateContestChanges(() => {
        emitCategories(false);
      });
      watchUserChanges(() => {
        emitCategories(false);
      });

      // Disconnect cleanup
      socket.on("disconnect", () => {
        socket.leave(userId);
        prevPrivateContestCategory = {};
        prevPrivateContestCategorySocketId = "";
        console.log(`Socket disconnected for userId: ${userId}`);
      });
    });

    socket.on("get-private-contest-by-category", (data) => {
      const { userId, categoryId } = data;
      const filterObj = data?.filterObj || {};
      let allTimeDuration = [];
      let timeoutIds = []

        
      const clearTimers = () => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
      };

      socket.leave(userId, categoryId);
      socket.join(userId, categoryId);

      console.log(userId, categoryId);

      const socketId = users[userId]?.toString();

      if (!socketId) {
        console.error(`Invalid userId: ${userId}`);
        return;
      }

      previousFilterPrivateData[userId] = filterObj;

      const emitCategories = async (
        categoryId,
        userId,
        filterObj,
        isMenual
      ) => {
        try {
          const response = await GetPrivateContests(
            categoryId,
            userId,
            filterObj
          );
          // Compare new data with the previous data
          if (
            !previousFilterPrivateData[userId] ||
            equal(
              JSON.stringify(previousPrivateContestData[userId]),
              JSON.stringify(response)
            ) ||
            isMenual
          ) {
            // Save the new data
            previousPrivateContestData[userId] = response;

            allTimeDuration = [
              ...response.live.flatMap((el) => el.privateContest),
              ...response.upcoming.flatMap((el) => el.privateContest),
            ].reduce((uniqueTimes, el) => {
              const endTime = new Date(el?.endDateTime)?.toISOString();
              if (endTime && !uniqueTimes.includes(endTime)) {
                uniqueTimes.push(endTime);
              }
              return uniqueTimes;
            }, []);
            console.log(response.live.length);

            // Emit only if data has changed
            io.to(socketId).emit("private-live-contest", response.live || []);
            io.to(socketId).emit(
              "private-upcoming-contest",
              response.upcoming || []
            );
            io.to(socketId).emit(
              "private-expired-contest",
              response.expired || []
            );
          } else {
            console.log(
              "No changes detected, skipping emit for userId:",
              userId
            );
          }
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };

      const initializeTimers = () => {
        clearTimers()
        allTimeDuration.forEach((endDateTime) => {
          const endTime = new Date(endDateTime);
          const now = new Date();
          const milliseconds = endTime - now;

          if (milliseconds > 0) {
         const timeSlotId  =  setTimeout(async () => {
              await emitCategories(
                categoryId,
                userId,
                previousFilterPrivateData[userId],
                false
              ).then(initializeTimers);
             timeoutIds.push(timeSlotId)     
            }, milliseconds);
          }
        });
      };

      emitCategories(
        categoryId,
        userId,
        previousFilterPrivateData[userId],
        true
      ).then(initializeTimers);

      wathPrivateContestChanges(() => {
        emitCategories(
          categoryId,
          userId,
          previousFilterPrivateData[userId],
          false
        );
      });
      watchUserChanges(() => {
        emitCategories(
          categoryId,
          userId,
          previousFilterPrivateData[userId],
          false
        );
      });

      socket.on("disconnect", () => {
        socket.leave(userId, categoryId);
        delete previousPrivateContestData[userId]; // Clean up previous data for the user
      });
    });

    socket.on("private_contest_info", async (data) => {
      try {
        socket.leave(data.privateContestId);
        socket.join(data.privateContestId);

        const fetchPrivateContestInfo = async (data) => {
          const contestData = await private_Contest_Info(data.privateContestId);
          socket.emit("Get_private_contest_info", contestData);
        };

        fetchPrivateContestInfo(data);
        wathPrivateContestChanges(() => {
          fetchPrivateContestInfo(data);
        });


      } catch (error) {
        console.error("Error handling private_contest_info event:", error);
      }
      socket.on("disconnect", () => {
        socket.leave(data.privateContestId); // Remove the socket from the room
      });
    });

    socket.on("private-winninguser", async (data) => {
      const socketId = users[data.userId]?.toString();
      const roomId = `${data.contestId}_${soketIdOfUser}`;

      // Join the socket room
      socket.leave(roomId);
      socket.join(roomId);

      // Stop and clean up any existing cron job for the same roomId
      if (activePrivateCronsId[roomId]) {
        delete activePrivateCronsId[roomId];
      }

      // Emit initial winning user data
      const fetchPrivateContestInfo = async (data) => {
        const response = await private_Contest_Info_wining(
          data.contestId,
          userId
        );
        prevprivateWiningData[roomId] = response;
        io.to(roomId).emit("get-private-user-winning", response);
      };
      fetchPrivateContestInfo(data);
      // Set up a new cron job for the current roomId

      wathPrivateContestChanges(() => {
        fetchPrivateContestInfo(data);
      });
      socket.on("disconnect", () => {
        socket.leave(roomId); // Remove the socket from the room
      });
    });

    //--------------------------------------------Unresolve Socket --------------------------------

    socket.on("my-contestcategory", (data) => {
      const { userId } = data;
      let allTimeDuration = [];
      let timeoutIds = []

      socket.join(userId);

      
      const clearTimers = () => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
      };

      const socketId = soketIdOfUser;

      const emitCategories = async (isMenual) => {
        try {
          const response = await mycontestMainCategory(userId);

          allTimeDuration = [...response.live, ...response.upcoming].reduce(
            (crr, el) => {
              if (
                new Date(el.endTime)?.toISOString() &&
                !crr.includes(new Date(el.endTime)?.toISOString())
              ) {
                crr.push(new Date(el.endTime)?.toISOString());
              }
              return crr;
            },
            []
          );

          if (
            JSON.stringify(prevMyContestcategory) !==
              JSON.stringify(response) ||
            isMenual
          ) {
            io.to(socketId).emit("mycontest-live-category", response.live);
            io.to(socketId).emit(
              "mycontest-upcoming-category",
              response.upcoming
            );
            io.to(socketId).emit("mycontest-expired-category", response.wining);

            prevMyContestcategory = response;
          }
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };

      const initializeTimers = () => {
        clearTimers()
        allTimeDuration.forEach((endDateTime) => {
          const endTime = new Date(endDateTime);
          const now = new Date();
          const milliseconds = endTime - now;

          if (milliseconds > 0) {
           const timeoutId =   setTimeout(async () => {
              await emitCategories(false).then(initializeTimers);
            }, milliseconds);
            timeoutIds.push(timeoutId)
          }
        });
      };

      // Initial category emission
      emitCategories(true).then(initializeTimers);

      socket.on("disconnect", () => {
        socket.leave(userId);
      });
    });

    socket.on("get-my-contest", (data) => {
      const { userId, categoryId, categoryStatus } = data;
      const socketId = soketIdOfUser + " " + categoryId + " " + userId;

      socket.join(socketId);
      const emitContests = async () => {
        try {
          const response = await mycontestBycategoryId(
            userId,
            categoryId,
            categoryStatus
          );
          io.to(socketId).emit("mycontest-live-contest", response.liveContests);
          io.to(socketId).emit(
            "mycontest-upcoming-contest",
            response.upcomingContests
          );
          io.to(socketId).emit(
            "mycontest-expired-contest",
            response.expiredContests
          );
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };
      emitContests();

      socket.on("disconnect", () => {
        socket.leave(socketId);
      });
    });

    hnadleDashBord()
      .then((data) => {
        socket.emit("get-dashbord-data", {
          status: "success",
          statusCode: 200,
          data,
        });
      })
      .catch((err) => {
        socket.emit("get-dashbord-data", {
          status: "somthing went wrong",
          statusCode: 500,
          data: err,
        });
      });

    socket.on("postWiningLeaderBord", async (obj) => {
      try {
        const userId = socket.userId; // Ensure `userId` is available in the socket context
        const roomId = `${obj.contestId}${obj.timeSlotId}${userId}_${soketIdOfUser}`;

        // Join the user to the specific room
        socket.join(roomId);
        // console.log(`User ${userId} joined room ${roomId}`);

        const getWiningUser = async () => {
          try {
            const initialResponse = await winningLeaderBoard(obj);
            // Emit the initial leaderboard data to the room
            io.to(roomId).emit("getWiningLeaderBord", initialResponse);
          } catch (error) {
            console.error("Error fetching winning leaderboard:", error.message);
            socket.emit("error", {
              message: "Failed to fetch leaderboard data.",
            });
          }
        };

        // Watch for category changes and update the leaderboard
        watchCategoryChanges(async () => {
          await getWiningUser();
        });

        // Fetch the initial leaderboard response
        await getWiningUser();

        // Handle room cleanup on socket disconnect
        socket.on("disconnect", () => {
          socket.leave(roomId);
          console.log(`User ${userId} left room ${roomId}`);
        });
      } catch (error) {
        console.error("Error in postWiningLeaderBord:", error.message);
        socket.emit("error", {
          message: "Failed to process leaderboard request.",
        });
      }
    });

    socket.on("postWiningLeaderBordAdmin", async (obj) => {
      try {
        const userId = socket.userId; // Ensure `userId` is available in the socket context
        const roomId = `${obj.contestId}${obj.timeSlotId}${userId}_${soketIdOfUser}`;

        // Join the user to the specific room
        socket.join(roomId);

        // Fetch the initial leaderboard response
        const getWiningUser = async () => {
          const initialResponse = await winningLeaderBoardAdmin(obj);
          // Emit the initial leaderboard data to the room
          io.to(roomId).emit("getWiningLeaderBordAdmin", initialResponse);
        };
        watchCategoryChanges(() => {
          getWiningUser();
        });
        getWiningUser();

        // Schedule the leaderboard updates at intervals

        // Handle room cleanup on socket disconnect
        socket.on("disconnect", () => {
          socket.leave(roomId); // Remove the socket from the room
        });
      } catch (error) {
        console.error("Error in postWiningLeaderBord:", error.message);
        socket.emit("error", {
          message: "Failed to process leaderboard request.",
        });
      }
    });

    socket.on("postLiveWiningLeaderBord", async (obj) => {
      try {
        const userId = socket.userId; // Ensure `userId` is available in the socket context
        const roomId = `${obj.contestId}${obj.timeSlotId}${userId}_${soketIdOfUser}`;

        // Join the user to the specific room
        socket.join(roomId);

        // Fetch the initial leaderboard response
        const getWiningUser = async () => {
          const initialResponse = await LiveWinningLeaderBoard(obj);

          // Emit the initial leaderboard data to the room
          io.to(roomId).emit("getLiveWiningLeaderBord", initialResponse);
        };

        watchCategoryChanges(() => {
          getWiningUser();
        });
        getWiningUser();

        // Schedule the leaderboard updates at intervals

        // Handle room cleanup on socket disconnect
        socket.on("disconnect", () => {
          socket.leave(roomId); // Remove the socket from the room
        });
      } catch (error) {
        console.error("Error in postWiningLeaderBord:", error.message);
        socket.emit("error", {
          message: "Failed to process leaderboard request.",
        });
      }
    });

    //--------------------------------------------User and Admin Chat---------------------------------------

    socket.on("userList", async (obj) => {
      try {
        const response = await getUserDetail();
        socket.emit("userListData", {
          data: response,
          success: true,
          message: "Successfully Fetched User Data",
        });
      } catch (error) {
        socket.emit("userListData", {
          data: error,
          success: false,
          message: "Failed to Fetched User Data",
        });
      }
    });

    socket.on("chatUserList", async (obj) => {
      try {
        const response = await getChatUserDetail();
        socket.emit("chatUserListData", {
          data: response,
          success: true,
          message: "Successfully Fetched User Data",
        });
      } catch (error) {
        socket.emit("chatUserListData", {
          data: error,
          success: false,
          message: "Failed to Fetched User Data",
        });
      }
    });

    socket.on("join-user", async ({ userId, adminId }) => {
      socket.join(userId); // Join the specified room
      const messages = await handleJoinRoom(userId, adminId);
      io.to(userId).emit("message", { data: messages, success: true });
    });

    socket.on("admin-to-user", async ({ clientId, message, adminId }) => {
      try {
        await sendMessageToClient(clientId, message, adminId, "admin");
        const messages = await handleJoinRoom(clientId, adminId);
        io.to(clientId).emit("message", { data: messages, success: true });
      } catch (error) {
        io.to(clientId).emit("message-error", {
          from: "admin",
          message: "Failed to send admin message.",
        });
      }
    });

    socket.on("user-to-admin", async ({ clientId, message, adminId }) => {
      try {
        await sendMessageToClient(clientId, message, adminId, "user");
        const messages = await handleJoinRoom(clientId, adminId);
        io.to(clientId).emit("message", { data: messages, success: true });
      } catch (error) {
        io.to(clientId).emit("message-error", {
          from: "user",
          message: "Failed to send user message.",
        });
      }
    });

    socket.on("createChatsession", async ({ clientId, adminId }) => {
      try {
        const messages = await createChatSession(clientId, adminId);
        io.to(clientId).emit("createChatsessionStatus", {
          data: messages,
          success: true,
        });
      } catch (error) {
        io.to(clientId).emit("createChatsessionStatus-error", {
          from: "user",
          message: "Failed to send user message.",
        });
      }
    });

    //---------------------------------------------------------Not Approved Sockets---------------------------------------

    socket.on("get-participant-contest-by-category", (data) => {
      const { userId, categoryId } = data;
      socket.join(userId, categoryId);
      socket.leave(userId);

      const socketId = users[userId].toString();
      const emitCategories = async () => {
        try {
          const response = await getUserContestsByCategoryAndStatus(
            userId,
            categoryId
          );
          io.to(socketId).emit("participant-live-contest", response.live);
          io.to(socketId).emit(
            "participant-upcoming-contest",
            response.upcoming
          );
          io.to(socketId).emit("participant-expired-contest", response.expired);
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };
      emitCategories();

      socket.on("disconnect", () => {
        socket.leave(userId);
      });
    });

    socket.on("get-participant-category", (data) => {
      const { userId } = data;
      socket.join(userId);
      socket.leave(userId);
      const socketId = users[userId].toString();
      const emitCategories = async () => {
        try {
          const response = await ParticipantCategory(userId);
          io.to(socketId).emit("participant-live-category", response.live);
          io.to(socketId).emit(
            "participant-upcoming-category",
            response.upcoming
          );
          io.to(socketId).emit(
            "participant-expired-category",
            response.expired
          );
        } catch (error) {
          console.error("Error emitting category updates:", error);
        }
      };
      emitCategories();

      socket.on("disconnect", () => {
        cronJob.stop();
        socket.leave(userId);
      });
    });
    socket.on("get-private-contest-ByID", (data) => {
      getSubContestByCatgroyId(data.categoryId, io);
    });

    getPrivateContestData()
      .then((data) => {
        socket.emit("private_contest", data);
      })
      .catch((err) => {
        console.error("Error fetching private contests:", err);
      });

    getGroupedContestsByStatus()
      .then((data) => {
        socket.emit("contests-data", data);
      })
      .catch((err) => {
        console.error("Error fetching contests:", err);
      });

      const data = await getAllAppData()

      socket.emit("get-main-contest-data2", data);


    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} disconnected`);

      // Remove from user map
      if (userId && users[userId]) {
        delete users[userId];
      }

      // Leave all joined rooms
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((roomId) => {
        socket.leave(roomId);
        if (roomData[roomId]) {
          roomData[roomId].userCount -= 1;
          if (roomData[roomId].userCount <= 0) {
            delete roomData[roomId];
            delete mainContestPrevData[roomId];
            clearTimeout(roomTimers[roomId]); // clear any timeout
          }
        }
      });
    });
  });
};

module.exports = initializeSocket;
