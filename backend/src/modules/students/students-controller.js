const argon2 = require('argon2');
const asyncHandler = require("express-async-handler");
const { getAllStudents, addNewStudent, getStudentDetail, setStudentStatus, updateStudent } = require("./students-service");

const handleGetAllStudents = asyncHandler(async (req, res) => {
    //write your code
    try {
        const query = `
          SELECT 
            u.id, 
            u.email,
            u.name,
            u.is_active,
            up.roll,
            up.class_name,
            up.section_name,
            up.phone,
            up.dob,
            up.gender,
            up.admission_dt,
            up.father_name,
            up.mother_name,
            up.guardian_name,
            up.current_address
          FROM users u
          INNER JOIN user_profiles up ON u.id = up.user_id
          INNER JOIN roles r ON u.role_id = r.id
          WHERE r.name = 'Student'
          ORDER BY up.class_name, up.roll
        `;
        
        const result = await db.query(query);
        
        return res.json({
          success: true,
          count: result.rows.length,
          data: result.rows
        });
      } catch (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
});

const handleAddStudent = asyncHandler(async (req, res) => {
    //write your code
    const client = await db.connect();
  
    try {
      await client.query('BEGIN');
      
      const {
        email,
        name,
        password,
        roll,
        class_name,
        section_name,
        phone,
        dob,
        gender,
        admission_dt,
        father_name,
        father_phone,
        mother_name,
        mother_phone,
        guardian_name,
        guardian_phone,
        current_address,
        permanent_address
      } = req.body;
      
      // Hash password
      const hashedPassword = await argon2.hash(password);
      
      // Get Student role ID (role_id = 3 from your roles table)
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = 'Student'"
      );
      
      if (!roleResult.rows.length) {
        throw new Error('Student role not found');
      }
      
      const roleId = roleResult.rows[0].id;
      
      // Insert into users table
      const userQuery = `
        INSERT INTO users (email, name, password, role_id, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      const userResult = await client.query(userQuery, [
        email,
        name,
        hashedPassword,
        roleId,
        true
      ]);
      
      const userId = userResult.rows[0].id;
      
      // Insert into user_profiles table
      const profileQuery = `
        INSERT INTO user_profiles (
          user_id, roll, class_name, section_name, phone, dob, gender,
          admission_dt, father_name, father_phone, mother_name, mother_phone,
          guardian_name, guardian_phone, current_address, permanent_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;
      
      await client.query(profileQuery, [
        userId, roll, class_name, section_name, phone, dob, gender,
        admission_dt || new Date(), father_name, father_phone, mother_name, 
        mother_phone, guardian_name, guardian_phone, current_address, permanent_address
      ]);
      
      await client.query('COMMIT');
      
      return res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: { id: userId }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating student:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } finally {
      client.release();
    }
});

const handleUpdateStudent = asyncHandler(async (req, res) => {
    //write your code
    const client = await db.connect();
  
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        email,
        name,
        is_active,
        roll,
        class_name,
        section_name,
        phone,
        dob,
        gender,
        father_name,
        father_phone,
        mother_name,
        mother_phone,
        guardian_name,
        guardian_phone,
        current_address,
        permanent_address
      } = req.body;
      
      // Update users table
      const userQuery = `
        UPDATE users 
        SET email = COALESCE($1, email),
            name = COALESCE($2, name),
            is_active = COALESCE($3, is_active),
            updated_dt = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id
      `;
      
      const userResult = await client.query(userQuery, [
        email, name, is_active, id
      ]);
      
      if (!userResult.rows.length) {
        throw new Error('Student not found');
      }
      
      // Update user_profiles table
      const profileQuery = `
        UPDATE user_profiles
        SET roll = COALESCE($1, roll),
            class_name = COALESCE($2, class_name),
            section_name = COALESCE($3, section_name),
            phone = COALESCE($4, phone),
            dob = COALESCE($5, dob),
            gender = COALESCE($6, gender),
            father_name = COALESCE($7, father_name),
            father_phone = COALESCE($8, father_phone),
            mother_name = COALESCE($9, mother_name),
            mother_phone = COALESCE($10, mother_phone),
            guardian_name = COALESCE($11, guardian_name),
            guardian_phone = COALESCE($12, guardian_phone),
            current_address = COALESCE($13, current_address),
            permanent_address = COALESCE($14, permanent_address),
            updated_dt = CURRENT_TIMESTAMP
        WHERE user_id = $15
      `;
      
      await client.query(profileQuery, [
        roll, class_name, section_name, phone, dob, gender,
        father_name, father_phone, mother_name, mother_phone,
        guardian_name, guardian_phone, current_address, permanent_address, id
      ]);
      
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Student updated successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating student:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } finally {
      client.release();
    }
});

const handleGetStudentDetail = asyncHandler(async (req, res) => {
    //write your code
    try {
        const { id } = req.params;
        
        const query = `
          SELECT 
            u.id,
            u.email,
            u.name,
            u.is_active,
            u.is_email_verified,
            u.created_dt,
            up.*
          FROM users u
          INNER JOIN user_profiles up ON u.id = up.user_id
          INNER JOIN roles r ON u.role_id = r.id
          WHERE u.id = $1 AND r.name = 'Student'
        `;
        
        const result = await db.query(query, [id]);
        
        if (!result.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Student not found'
          });
        }
        
        return res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Error fetching student:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
});

const handleStudentStatus = asyncHandler(async (req, res) => {
    //write your code
    try {
        const { id } = req.params;
        
        const query = `
          SELECT 
            u.id,
            u.name,
            u.email,
            u.is_active,
            u.is_email_verified,
            up.class_name,
            up.section_name,
            up.admission_dt,
            CASE 
              WHEN u.is_active = true AND up.class_name IS NOT NULL THEN 'enrolled'
              WHEN u.is_active = false THEN 'inactive'
              WHEN up.class_name IS NULL THEN 'pending'
              ELSE 'unknown'
            END as enrollment_status
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          INNER JOIN roles r ON u.role_id = r.id
          WHERE u.id = $1 AND r.name = 'Student'
        `;
        
        const result = await db.query(query, [id]);
        
        if (!result.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Student not found'
          });
        }
        
        const student = result.rows[0];
        
        return res.json({
          success: true,
          data: {
            id: student.id,
            name: student.name,
            email: student.email,
            is_active: student.is_active,
            is_email_verified: student.is_email_verified,
            enrollment_status: student.enrollment_status,
            class: student.class_name,
            section: student.section_name,
            admission_date: student.admission_dt
          }
        });
      } catch (error) {
        console.error('Error fetching student status:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
});

module.exports = {
    handleGetAllStudents,
    handleGetStudentDetail,
    handleAddStudent,
    handleStudentStatus,
    handleUpdateStudent,
};
