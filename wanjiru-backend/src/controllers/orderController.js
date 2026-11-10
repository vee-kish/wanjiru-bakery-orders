const pool = require('../config/db');

function generateOrderReference() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}-${random}`;
}

exports.checkDuplicate = async (req, res) => {
    try {
        const { supplier_id, item_name } = req.query;

        if (!supplier_id || !item_name) {
            return res.status(400).json({
                success: false,
                message: 'Supplier and item are required',
            });
        }

        const result = await pool.query(
            `SELECT o.id, o.order_reference, o.status,
              o.expected_delivery_date,
              oi.item_name, oi.quantity
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.supplier_id = $1
         AND LOWER(oi.item_name) = LOWER($2)
         AND o.status IN ('pending', 'confirmed', 'overdue')
         AND o.expected_delivery_date >= CURRENT_DATE`,
            [supplier_id, item_name]
        );

        res.json({
            success: true,
            possibleDuplicates: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to check for duplicate orders',
        });
    }
};

exports.createOrder = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            supplier_id,
            item_name,
            quantity,
            unit,
            expected_delivery_date,
            estimated_cost,
            notes,
        } = req.body;

        if (
            !supplier_id ||
            !item_name ||
            !quantity ||
            !unit ||
            !expected_delivery_date
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Supplier, item, quantity, unit, and delivery date are required',
            });
        }

        await client.query('BEGIN');

        // Final backend duplicate check
        const duplicate = await client.query(
            `SELECT o.id, o.order_reference
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.supplier_id = $1
         AND LOWER(oi.item_name) = LOWER($2)
         AND o.status IN ('pending', 'confirmed', 'overdue')
         AND o.expected_delivery_date >= CURRENT_DATE`,
            [supplier_id, item_name]
        );

        if (duplicate.rows.length > 0) {
            await client.query('ROLLBACK');

            return res.status(409).json({
                success: false,
                message: 'A possible duplicate order already exists',
                possibleDuplicates: duplicate.rows,
            });
        }

        const orderReference = generateOrderReference();

        const orderResult = await client.query(
            `INSERT INTO orders
        (order_reference, supplier_id, created_by,
         expected_delivery_date, status, estimated_cost, notes)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING *`,
            [
                orderReference,
                supplier_id,
                req.user.id,
                expected_delivery_date,
                estimated_cost || 0,
                notes || null,
            ]
        );

        const order = orderResult.rows[0];

        await client.query(
            `INSERT INTO order_items
        (order_id, item_name, quantity, unit, unit_cost)
       VALUES ($1, $2, $3, $4, $5)`,
            [order.id, item_name, quantity, unit, estimated_cost || 0]
        );

        await client.query(
            `INSERT INTO order_status_history
        (order_id, changed_by, old_status, new_status, status_note)
       VALUES ($1, $2, NULL, 'pending', 'Order created')`,
            [order.id, req.user.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Supplier order created successfully',
            order,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to create supplier order',
        });
    } finally {
        client.release();
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { status, supplier_id, search } = req.query;

        let query = `
      SELECT o.id, o.order_reference, o.status,
             o.order_date, o.expected_delivery_date,
             o.estimated_cost, o.notes,
             s.supplier_name,
             oi.item_name, oi.quantity, oi.unit
      FROM orders o
      LEFT JOIN suppliers s ON s.id = o.supplier_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE 1 = 1
    `;

        const values = [];
        let paramCount = 1;

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        if (supplier_id) {
            query += ` AND o.supplier_id = $${paramCount}`;
            values.push(supplier_id);
            paramCount++;
        }

        if (search) {
            query += ` AND (LOWER(oi.item_name) LIKE LOWER($${paramCount})
                    OR LOWER(o.order_reference) LIKE LOWER($${paramCount}))`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY o.created_at DESC';

        const result = await pool.query(query, values);

        res.json({
            success: true,
            orders: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to load orders',
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, status_note } = req.body;

        const allowedStatuses = [
            'pending',
            'confirmed',
            'delivered',
            'cancelled',
            'overdue',
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status',
            });
        }

        const existing = await pool.query(
            'SELECT status FROM orders WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        const oldStatus = existing.rows[0].status;

        const result = await pool.query(
            `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [status, id]
        );

        await pool.query(
            `INSERT INTO order_status_history
        (order_id, changed_by, old_status, new_status, status_note)
       VALUES ($1, $2, $3, $4, $5)`,
            [id, req.user.id, oldStatus, status, status_note || null]
        );

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Unable to update order status',
        });
    }
};
