const TdsGstText = require("../model/admin/tdsGstTextSchema");

const creatText = async (req, res) => {
  try {
    const response = await TdsGstText.create(req.body);

    

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Text Not Save",
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

const getText = async (req, res) => {
  try {
    // Extract the 'type' from query parameters
    const { type } = req.query;

    // Check if type is valid (either 'gst' or 'tds')
    if (type && type !== "gst" && type !== "tds") {
      return res
        .status(400)
        .json({ message: "Invalid type. Use 'gst' or 'tds'." });
    }

    // Find the object with the specified type
    const data = await TdsGstText.find(type ? { type } : {});

    // If no data is found, send a 404 response
    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ sucess: false, message: `No data found for type: ${type}` });
    }

    // Send the data as a response
    res.status(200).json({ sucess: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateText = async (req, res) => {
  const { id } = req.params;
  try {
    const updateTdsGstText = await TdsGstText.findByIdAndUpdate(id, req.body, {
      new: true,
    });


    if (!updateTdsGstText)
      return res
        .status(404)
        .json({ sucess: false, message: "Failed to Update" });

    res
      .status(200)
      .json({
        success: true,
        message: "Text updated successfully",
        data: updateTdsGstText,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteText = async (req, res) => {
  const { id } = req.params;
  try {
    const deletTdsgstText = await TdsGstText.findByIdAndDelete(id);

    if (!deletTdsgstText)
      return res
        .status(404)
        .json({ success: false, message: "Failed to Delete" });

    res
      .status(200)
      .json({ success: true, message: "Text deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  creatText,
  getText,
  updateText,
  deleteText,
};
