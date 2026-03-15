const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema({

title: {
type: String,
required: true
},

description: {
type: String
},

videoUrl: {
type: String
},

duration: {
type: Number
}

});

const CourseSchema = new mongoose.Schema({

title: {
type: String,
required: true
},

description: {
type: String
},

price: {
type: Number,
default: 0
},

content: [LessonSchema]

},
{ timestamps: true }
);

module.exports = mongoose.model("Course", CourseSchema);