const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', supplierController.getSuppliers);
router.post('/', supplierController.createSupplier);

module.exports = router;
