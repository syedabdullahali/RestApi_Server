const { Types } = require("mongoose");
const SubCategory = require("../model/admin/subCategory");
const contestModel = require("../model/contestModel");


const CreateSubCategory = async (req, res) => {
  try {
    const response = await SubCategory.create(req.body);
    if (!response) {
      return res.status(403).json({
        success: false,
        message: "SubCategory Not Saved",
      });
    }
    res.status(201).json({
      success: true,
      message: "SubCategory created successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const GetAll_SubCategory = async (req, res) => {
  try {
    const response = await SubCategory.find();
    const populatedResponse = await SubCategory.find().populate(
      "auctioncategory",
      "name"
    );

    console.log("SubCategory with populated category:", populatedResponse);

    console.log("SubCategory without populate:", response);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const UpdateSubCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await SubCategory.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!response) {
      return res.status(403).json({
        success: false,
        message: "SubCategory Not Found",
      });
    }
    res.status(202).json({
      success: true,
      message: "Category Updated successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const DeleteSubCategory = async (req, res) => {
  try {
    const response = await SubCategory.findByIdAndDelete(req.params.id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: "SubCategory Not Found",
      });
    }
    res.status(200).json({ success: true, message: "SubCategory Delete" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Inter Server Error", error: error });
  }
};

const GetSingleSubCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await SubCategory.findById(id);
    const response2 = await contestModel.find({subcategoryId:id});

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "SubCategory Not Found",
      });
    }
    res.status(200).json({
      success: true,
      data: response,
      slectedContest:response2
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetSubCategoryPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    const aggrigateReq = [
      {
        $lookup: {
          from: "categorycontests", // The Contest collection (make sure this matches your actual collection name)
          let: { subcategoryId: { $toString: "$_id" } }, // Convert SubCategory _id to string for matching
          pipeline: [
            {
              $addFields: {
                subcategoryIdString: {
                  $cond: {
                    if: { $eq: [{ $type: "$subcategoryId" }, "objectId"] },
                    then: { $toString: "$subcategoryId" }, // Convert ObjectId to string
                    else: "$subcategoryId", // If already a string, leave it as is
                  },
                },
              },
            },
            {
              $match: {
                $expr: { $eq: ["$subcategoryIdString", "$$subcategoryId"] }, // Match on subcategoryId string
              },
            },
          ],
          as: "contestData", // The field to store contest data
        },
      },
      {
        $addFields: {
          contestCount: { $size: "$contestData" }, // Add contest count for each subcategory
        },
      },
      // {
      //   $addFields: {
      //     contestCount: { $size: "$contestData" }, // Add contest count for each subcategory
      //   },
      // },
      { $skip: skip }, // Skip documents for pagination
      { $limit: limit }, // Limit the results for pagination
    ];

    // Get SubCategory with pagination
    const response = await SubCategory.aggregate(aggrigateReq);
    // res.status(200).json(response);

    console.log("from subcategory", response);

    // Get the total number of SubCategory for pagination info
    const totalSubCategory = await SubCategory.countDocuments();

    const data = {
      success: true,
      data: response,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalSubCategory / limit),
      totalSubCategory,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  CreateSubCategory,
  GetAll_SubCategory,

  UpdateSubCategory,
  DeleteSubCategory,
  GetSingleSubCategory,
  GetSubCategoryPagination,
};
