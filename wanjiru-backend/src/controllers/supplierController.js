const pool = require('../config/db');

exports.getSuppliers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, supplier_name, contact_person, phone, email,
              address, products_supplied, is_active, created_at
       FROM suppliers
       ORDER BY supplier_name ASC`
        );

        res.json({
            success: true,
            suppliers: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to load suppliers',
        });
    }
};

exports.createSupplier = async (req, res) => {
    try {
        const {
            supplier_name,
            contact_person,
            phone,
            email,
            address,
            products_supplied,
        } = req.body;

        if (!supplier_name) {
            return res.status(400).json({
                success: false,
                message: 'Supplier name is required',
            });
        }

        const result = await pool.query(
            `INSERT INTO suppliers
        (supplier_name, contact_person, phone, email, address, products_supplied)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                supplier_name,
                contact_person,
                phone,
                email,
                address,
                products_supplied,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            supplier: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to create supplier',
        });
    }
};
