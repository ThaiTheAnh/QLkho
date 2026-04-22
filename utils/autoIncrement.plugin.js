const mongoose = require('mongoose');

module.exports = function autoIncrementPlugin(schema, options) {
    const { counterName, targetField, prefix = '', padLength = 3 } = options;

    schema.pre('save', async function() {
        if (this.isNew) {
            const Counter = mongoose.model('Counter'); 
            const counter = await Counter.findOneAndUpdate(
                { id: counterName },
                { $inc: { seq: 1 } },
                // Đã đổi { new: true } thành { returnDocument: 'after' } để hết báo Warning
                { returnDocument: 'after', upsert: true } 
            );
            this[targetField] = prefix + String(counter.seq).padStart(padLength, '0');
        }
    });
};