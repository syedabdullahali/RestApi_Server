const Documents = require("../model/admin/DocumentSchema");

const createDocument = async (req, res) => {
  try {
    const document = await Documents.create(req.body);

    if (!document) {
      return res.status(403).json({
        success: false,
        message: "Document not saved",
      });
    }

    res.status(201).json({
      success: true,
      message: "Document saved successfully",
      data: document,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDocument = async (req, res) => {
  try {
    // Find the first document in the collection
    const firstDocument = await Documents.findOne();
    
    // Check if the first document exists
    if (!firstDocument) {
      return res.status(404).json({
        success: false,
        message: "No document found to update.",
      });
    }

    // Update the document by its _id
    const updatedDocument = await Documents.findByIdAndUpdate(
      firstDocument._id.toString(), // ID of the first document
      req.body,          // Update data from the request body
      { new: true} // Return updated document & validate
    );

    // Respond with the updated document
    res.status(200).json({
      success: true,
      message: "Document updated successfully.",
      data: updatedDocument,
    });

  } catch (error) {
    // Handle any errors
    res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await Documents.find();

    if (!documents) {
      res.status(404).json({ success: false, message: "Document not found" });
    }
    res.status(200).json({
      success: true,
      data: documents,
      message: "Documents fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getSingaleDocuments = async (req, res) => {
  try {
    const {docName} = req.params 
    // Fetch a single document
    const documents = await Documents.findOne();

    if (!documents) {
      // If no document is found, respond with a 404 status
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Respond with specific document sections or the entire document if requested
    res.status(200).json({
      success: true,
      data: {
        [docName]: documents?.[docName],
      },
      message: "Documents fetched successfully",
    });
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createDocument,
  updateDocument,
  getDocuments,
  getSingaleDocuments
};
