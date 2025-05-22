const Category = require("../model/admin/category");
const SubCatgory = require("../model/admin/subCategory");

const CreateCategory = async (req, res) => {
  try {
    const response = await Category.create(req.body);
    if (!response) {
      return res.status(403).json({
        success: false,
        message: "Category Not Saved",
      });
    }
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const GetAll_Category = async (req, res) => {
  try {
    const currentTime = new Date();

    const updatedCategories = await Category.aggregate([
      {
        $addFields: {
          status: {
            $cond: {
              if: { $lt: [currentTime, "$startdate_time"] },
              then: "upcoming",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: [currentTime, "$startdate_time"] },
                      { $lt: [currentTime, "$enddate_time"] },
                    ],
                  },
                  then: "ongoing",
                  else: "expired",
                },
              },
            },
          },
        },
      },
    ]);

    const bulkOps = updatedCategories.map((category) => ({
      updateOne: {
        filter: { _id: category._id },
        update: { status: category.status },
      },
    }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }
    
    res.json(updatedCategories);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const UpdateCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!response) {
      return res.status(403).json({
        success: false,
        message: "Category Not Found",
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
const DeleteCategory = async (req, res) => {
  try {
    const response = await Category.findByIdAndDelete(req.params.id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }
    res.status(200).json({ success: true, message: "Category Delete" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Inter Server Error", error: error });
  }
};

const GetSingleCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const response = await Category.findById(id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }
    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetPaginationSubCategoryByCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not found",
      });
    }

    const aggrigateReq = [
      {
        $match: { auctioncategory: category._id }, // Match subcategories by the auctioncategory (category ID)
      },

      {
        $lookup: {
          from: "categorycontests", // The Contest collection (make sure this matches your actual collection name)
          let: { subcategoryId: { $toString: "$_id" } }, // Convert SubCategory _id to string for matching
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$subcategoryId", "$$subcategoryId"] }, // Match on subcategoryId string
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
      {
        $addFields: {
          contestCount: { $size: "$contestData" }, // Add contest count for each subcategory
        },
      },
      { $skip: skip }, // Skip documents for pagination
      { $limit: limit }, // Limit the results for pagination
    ];

    // Fetch the subcategories with pagination applied
    const subCategories = await SubCatgory.aggregate(aggrigateReq);

    // Get the total number of subcategories that belong to this category
    const totalsubCategories = await SubCatgory.countDocuments({
      auctioncategory: category._id,
    });

    const responseData = {
      title: category.title,
      duration: category.duration,
      subCategory: subCategories,
    };

    const data = {
      success: true,
      data: responseData,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalsubCategories / limit),
      totalsubCategories,
      data,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetSubCategoryByCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not found",
      });
    }

    // Fetch the subcategories with pagination applied
    const subCategories = await SubCatgory.find({
      auctioncategory: category._id,
    }).populate("auctioncategory");

    const responseData = {
      title: category.title,
      duration: category.duration,
      subCategory: subCategories,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetCategoryPagination = async (req, res) => {
  try {
    const currentTime = new Date();

    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    // Aggregation pipeline to add the status field
    const updatedCategoriesPipeline = [
      {
        $addFields: {
          status: {
            $cond: {
              if: { $lt: [currentTime, "$startdate_time"] },
              then: "upcoming",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: [currentTime, "$startdate_time"] },
                      { $lt: [currentTime, "$enddate_time"] },
                    ],
                  },
                  then: "ongoing",
                  else: "expired",
                },
              },
            },
          },
        },
      },
    ];

    // First, get the updated categories
    const updatedCategories = await Category.aggregate(
      updatedCategoriesPipeline
    );

    // Create bulk operations to update categories in the database
    const bulkOps = updatedCategories.map((category) => ({
      updateOne: {
        filter: { _id: category._id },
        update: { status: category.status },
      },
    }));

    // Perform the bulk update if there are any updates
    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    // After bulk updating, apply pagination to the updated categories
    const paginatedCategoriesPipeline = [
      ...updatedCategoriesPipeline,
      { $skip: skip },
      { $limit: limit },
    ];

    // Get paginated categories after applying the status updates
    const paginatedCategories = await Category.aggregate(
      paginatedCategoriesPipeline
    );

    // Count total number of documents for pagination purposes
    const totalCategory = await Category.countDocuments();

    // Prepare response data
    const data = {
      success: true,
      data: paginatedCategories,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalCategory / limit),
      totalCategory,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  CreateCategory,
  GetAll_Category,
  UpdateCategory,
  DeleteCategory,
  GetSingleCategory,
  GetPaginationSubCategoryByCategory,
  GetSubCategoryByCategory,
  GetCategoryPagination,
};
