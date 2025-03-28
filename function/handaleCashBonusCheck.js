const CashBonus =  require('../model/admin/cashBonus')
const handaleCashBonusCheck = async (requiredAmount,user,useType) => {
    // console.log("requiredAmount",requiredAmount)
    try {
      const selectedBonuses = await CashBonus.aggregate([
        { $match: { remainingBonusAmount: { $gt: 0 } } }, // Only consider vouchers with balance
        { $sort: { remainingBonusAmount: -1, bonusAmountDate: -1 } }, // Highest balance first
        {
          $group: {
            _id: null,
            totalAvailable: { $sum: "$remainingBonusAmount" }, // Calculate total available balance
            bonuses: { $push: "$$ROOT" }, // Store all documents in an array
          },
        },
        {
          $match: { totalAvailable: { $gte: requiredAmount } }, // Ensure total balance can fulfill requirement
        },
        {
          $set: {
            selectedBonuses: {
              $let: {
                vars: { total: 0, selected: [] },
                in: {
                  $reduce: {
                    input: "$bonuses",
                    initialValue: { total: 0, selected: [] },
                    in: {
                      $cond: {
                        if: { $gte: ["$$this.remainingBonusAmount", requiredAmount] }, // Single voucher case
                        then: { total: requiredAmount, selected: ["$$this"] },
                        else: {
                          total: { $add: ["$$value.total", "$$this.remainingBonusAmount"] },
                          selected: {
                            $cond: {
                              if: { $lt: ["$$value.total", requiredAmount] }, // Accumulate until enough
                              then: { $concatArrays: ["$$value.selected", ["$$this"]] },
                              else: "$$value.selected",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        { $unwind: "$selectedBonuses.selected" },
        { $replaceRoot: { newRoot: "$selectedBonuses.selected" } },
      ]);

      if (!selectedBonuses.length) return []; // Return empty if unable to fulfill requirement

      // Step 2: Prepare bulk update operations
      let remainingToDeduct = requiredAmount;

      const bulkOperations = selectedBonuses.map((bonus) => {
        const amountToDeduct = Math.min(remainingToDeduct, bonus.remainingBonusAmount);
        
              remainingToDeduct -= amountToDeduct;
  
        return useType==="used"?  {
          updateOne: {
            filter: { _id: bonus._id },
            update: {
              $inc: {
                usedBonusAmount: amountToDeduct,
                remainingBonusAmount: -amountToDeduct,
              },
            },
          },
        }:{
          updateOne: {
            filter: { _id: bonus._id },
            update: {
              $inc: {
                remainingBonusAmount: amountToDeduct,
              },
            },
          },
        }
      });
  
      // Step 3: Perform bulkWrite operation
      if (bulkOperations.length > 0) {
        await CashBonus.bulkWrite(bulkOperations);
      }
  
      return selectedBonuses; // Return the selected vouchers

      } catch (error) {
        console.log(error)
      throw error;
    }
  };
  
  
  

module.exports = {handaleCashBonusCheck}