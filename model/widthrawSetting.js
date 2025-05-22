const {Schema,model} =  require("mongoose")

const widthrawSettingSchema = new Schema({
minimumWidthraw:{type:Number,require:true}
},{timestamps:true})


module.exports =  model("widthrawSetting",widthrawSettingSchema)



