const asyncHandler = require("express-async-handler");
const { getAllStudents, addNewStudent, getStudentDetail, setStudentStatus, updateStudent } = require("./students-service");

const handleGetAllStudents = asyncHandler(async (req, res) => {
    const { name, className, section, roll } = req.query;
    
    const students = await getAllStudents({ name, className, section, roll });
    
    res.status(200).json({
        success: true,
        count: students.length,
        data: students
    });
});

const handleAddStudent = asyncHandler(async (req, res) => {
    const payload = req.body;
    
    const result = await addNewStudent(payload);
    
    res.status(201).json({
        success: true,
        message: result.message
    });
});

const handleUpdateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = { ...req.body, id };
    
    const result = await updateStudent(payload);
    
    res.status(200).json({
        success: true,
        message: result.message
    });
});

const handleGetStudentDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const student = await getStudentDetail(id);
    
    res.status(200).json({
        success: true,
        data: student
    });
});

const handleStudentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const reviewerId = req.user?.id; // Assuming user is attached via auth middleware
    
    const result = await setStudentStatus({ 
        userId: id, 
        reviewerId, 
        status 
    });
    
    res.status(200).json({
        success: true,
        message: result.message
    });
});

module.exports = {
    handleGetAllStudents,
    handleGetStudentDetail,
    handleAddStudent,
    handleStudentStatus,
    handleUpdateStudent,
};