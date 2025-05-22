const joinUserList  = []
// const userList  = [
//     {
//       "username": "user1",
//       "email": "user1@example.com"
//     },
//     {
//       "username": "user2",
//       "email": "user2@example.com"
//     },
//     {
//       "username": "user3",
//       "email": "user3@example.com"
//     },
//     {
//       "username": "user4",
//       "email": "user4@example.com"
//     },
//     {
//       "username": "user5",
//       "email": "user5@example.com"
//     },
//     {
//         "username": "user6",
//         "email": "user4@example.com"
//       },
//       {
//         "username": "user7",
//         "email": "user5@example.com"
//       }
//   ]

const handaleBotBid =  (userList,bidcount,slots,bidRange)=>{

  const allUserList =  JSON.parse(JSON.stringify(userList)).map((el)=>({...el,count:0}))
  let slotsFillUp = 0
  let userIndexNo = 0


  // console.log(slots,'slots',slotsFillUp,joinUserList)

  console.log("bidcount",Math.round((Math.random() * (bidRange * 0.4))) + Math.round(bidRange * 0.6))
  while (slotsFillUp<=slots){

     if(allUserList[userIndexNo]?.count<=(bidcount||0)){
      allUserList[userIndexNo]={...allUserList[userIndexNo],count:allUserList[userIndexNo].count+1}
    //   joinUserList.push({"username":allUserList[userIndexNo]?.username,"email":allUserList[userIndexNo]?.email})
      joinUserList.push({
        userInfo:allUserList[userIndexNo],
        bidinfo:{
            bid:Math.round((Math.random() * (bidRange * 0.4))) + Math.round(bidRange * 0.6)
        }
      })

    }
    // console.log("hello",allUserList[userIndexNo]?.count,bidcount)

    
    slotsFillUp++
    userIndexNo++

    if(allUserList.length<=userIndexNo){
      // console.log('hello')
       userIndexNo= 0
    }
  }
  // console.log(joinUserList,"joinUserList")

  return joinUserList
}


// handaleBotBid(userList,2,50)
module.exports = {handaleBotBid}