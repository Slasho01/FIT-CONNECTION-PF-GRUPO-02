const { Purchases, PurchaseDetail } = require('../db');
const { sequelize } = require('../db');
const { updateStock, checkStockAvailability } = require('../../utils/stockVerific')

const postPurchasesController = async (req, res) => {
    const { payment_method, payment_date, status, user_id, details } = req.body;
    try {
        if (!payment_method || !payment_date || !status || !user_id || !details) {
            return res.status(400).json({ error: "Faltan datos" });
        }
        await sequelize.transaction(async (t) => {
            await checkStockAvailability(details, t);
            const purchase = await Purchases.create(
                { payment_method, payment_date, status, user_id },
                { transaction: t }
            );
            const purchase_id = purchase.id;
            await Promise.all(
                details.map(async (detail) => {
                    await PurchaseDetail.create(
                        {
                            product_id: detail.product_id,
                            quantity: detail.quantity,
                            purchase_id: purchase_id,
                        },
                        { transaction: t }
                    );
                })
            );
            if(status!=="cancelled") await updateStock(status, details, t);
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const getPurchasesController = async () => {
    try {
        const purchases = await Purchases.findAll({
            include: [{
                model: PurchaseDetail,
                as: 'PurchaseDetail',
                foreignKey: 'purchase_id'
            }]
        })
        if (purchases.length === 0) throw new Error("No existen Compras");
        const purchasesWithDetails = purchases.reduce((result, purchase) => {
            const purchaseId = purchase.id;
            if (!result[purchaseId]) {
                result[purchaseId] = {
                    ...purchase.toJSON(),
                    PurchaseDetails: purchase.PurchaseDetails
                };
            } else {
                result[purchaseId].PurchaseDetails = (result[purchaseId].PurchaseDetails).concat(purchase.PurchaseDetails);
            }

            return result;
        }, {});

        // Devolver un array de objetos en lugar de un objeto
        const result = Object.values(purchasesWithDetails);
        return result
    } catch (error) {
        throw new Error(`Error al cargar las compras  ${error.message}`);
    }
}

const putPurchasesController = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const transaction = await sequelize.transaction();
    try {
        const existingPurchase = await Purchases.findOne({
            where: { id: `${id}` },
        });

        if (!existingPurchase) {
            return res.status(404).json({ error: "Purchase not found" });
        }

        // Verificar si el estado actual es "cancelled" y el nuevo estado es el mismo
        if (existingPurchase.status === "cancelled" && status === "cancelled") {
            return res.status(400).json({ error: "No se puede actualizar al mismo estado 'cancelado'." });
        }
        const details = await PurchaseDetail.findAll({
            where: { purchase_id: `${id}` },
        })
        const [putRowCount, updatePurchase] = await Purchases.update(
            { status },
            {
                where: { id: `${id}` },
                transaction,
            });

        if (putRowCount === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Purchase not found" });
        }

        // Actualiza el stock solo si la compra se completó
        if (status === "completed" || status === "cancelled") {
            await updateStock(status, details, transaction);
        }

        // Commit de la transacción
        await transaction.commit();

        return res.status(200).json({ success: true });
    } catch (error) {
        // Rollback de la transacción en caso de error
        await transaction.rollback();

        return res.status(500).json({ error: "Internal Server Error" });
    }
};
module.exports = {
    postPurchasesController,
    getPurchasesController,
    putPurchasesController
};