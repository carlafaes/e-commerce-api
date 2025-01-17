const sequelize = require('../db');
const router = require('express').Router();
const {Product,Transaction, User, Review} = sequelize.models;
const {
    createTransaction, updateTransaction,
  } = require("../controllers/transaction");
const {
  getCart,
} = require("../controllers/cart");
const { isUUID } = require('../controllers/isUUID');

router.post("/:userId", async (req, res) => {
  try {
    const {userId}=req.params;
      let user= await User.findByPk(userId);
      let cart= await getCart(user.cartId);
      let err={status:false};
      let productsInCart=cart.dataValues.ProductInCarts.map(async product=>
        {
          let productDetail=await Product.findOne({
            where:{
              id:product.productId
            },
            include:Review
          }).then(r=>r.dataValues);
          if(product.quantity>productDetail.stock)
            err={status:true,productId:productDetail.id};
         return {
            quantity:product.quantity,
            product: productDetail
          }
        }
        )
      productsInCart= await Promise.all(productsInCart);
      if(err.status)
      return res.json({error:`Quantity must not be greater than the stock of the product: ${err.productId}`});
      cart={id:cart.id,totalPrice:cart.totalPrice,productsInCart};
      let transaction=await createTransaction("process",cart);
      await user.addTransaction(transaction);
      transaction=await Transaction.findByPk(transaction.id);
      return res.status(200).send({status:"Transaction created", transaction})
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({error:error.message});
    }
});

router.get("/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!isUUID(transactionId))
      return res.status(400).send({status:"The sent id is not valid (UUID)"});
    let transaction= await Transaction.findByPk(transactionId);
    if(!transaction)
      return res.status(400).send({status:"Transaction not found"});
    return res.status(200).send({status:"Successfully get transaction", transaction});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({error:error.message});
  }
});
module.exports = router;