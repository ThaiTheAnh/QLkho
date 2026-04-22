const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true,
        unique: true 
    },
    quantity: { 
        type: Number, 
        default: 0, 
        required: true,
        min: [0, 'Tồn kho không được phép âm!'] 
    },
    minStock: { 
        type: Number, 
        default: 5 
    }
}, { timestamps: true });

module.exports = mongoose.models.Inventory || mongoose.model('inventory', InventorySchema);