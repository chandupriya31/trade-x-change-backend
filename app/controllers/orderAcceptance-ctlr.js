const OrderAcceptance = require('../models/orderacceptance-model')
const Product = require('../models/product-model')
const Payment = require('../models/payment-model')
const User = require('../models/users-model')
const { validationResult } = require('express-validator')
const transporter = require('../config/nodemailer')
const cron = require('node-cron')
const Quotation = require('../models/quotation-model')
const Company = require('../models/company-model')
const orderAcceptanceCtlr = {}


const sendNotificationToAdmin = async (order) => {
   try {
      // Retrieve admin's email (replace with your admin's email)
      const adminEmail = 'pavanat24official@gmail.com';

      const product = await Product.findById(order.product_id)

      const mailOptions = {
         from: process.env.NODE_MAILER_MAIL,
         to: adminEmail,
         subject: 'Notification: Product Delivery',
         html: `<p>The delivery for product "${product.productname}" (ID: ${order.product_id}) is scheduled on ${new Date(order.delivery_date).toLocaleDateString()}.</p>`
      };
      const info = await transporter.sendMail(mailOptions);
      // console.log('Email sent: ' + info.response);
   } catch (error) {
      console.error('Error sending email:', error);
   }
};

orderAcceptanceCtlr.create = async (req, res) => {
   const errors = validationResult(req)
   if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
   }
   const body = req.body
   const order = new OrderAcceptance(body)
   const quotation = await Quotation.findById(order.quotation_id)
   const payment = await Payment.findOne({ quotation: order.quotation_id })
   const company = await Company.findOne({ user_id: req.user.id })
   // console.log(payment)
   order.company = company._id
   order.transaction_id = payment.transaction_id
   order.customer_id = payment.customer
   order.product_id = quotation.product//populate
   order.date = new Date()
   // order.process.user_id = req.user.id
   try {
      await order.save()
      if (order.orderAcceptance) {
         const customer = await User.findById(order.customer_id)
         const product = await Product.findById(order.product_id)
         const payment = await Payment.findById(order.paymentId)
         const delivery_date = new Date(order.delivery_date)
         // const notificationDate = new Date(delivery_date)
         // notificationDate.setDate(delivery_date.getDate() - 3)
         // const cronExpression = `0 9 ${notificationDate.getDate() - 3} ${notificationDate.getMonth() + 1} *`;
         // console.log(cronExpression)
         if (customer && customer.email) {
            if (product) {
               if (payment) {
                  const mailOptions = {
                     from: process.env.NODE_MAILER_MAIL,
                     to: customer.email && 'pn14016@gmail.com',
                     subject: 'order acceptance',
                     html: `<p>
                     Dear ${customer.username}<br/>
                        your order for -"${product.productname}" has been accepted. <br/>
                        your expected deliver date - "${new Date(order.delivery_date).toLocaleDateString()}" <br/>
                        payment received - <i>transaction_id</i> - ${payment.transaction_id.slice(8)}<br/><br/><br/>
                        thanks and regards:-<br/>
                        TXC and co.
                     </p > `
                  }
                  await transporter.sendMail(mailOptions)
               }
            }
         }
         // cron.schedule(cronExpression, async () => {
         //    await sendNotificationToAdmin(order)
         // }, {
         //    timezone: 'Asia/Kolkata'
         // })
      }
      await User.findOneAndUpdate({ _id: order.customer_id }, { $push: { my_orders: order._id } })
      await Company.findOneAndUpdate({ user_id: req.user.id }, { $push: { orders: order._id } })
      res.json(order)
   } catch (e) {
      res.status(500).json(e)
   }

}
orderAcceptanceCtlr.list = async (req, res) => {
   try {
      const order = await OrderAcceptance.find().populate({
         path: 'product_id'
      })
         .populate({
            path: 'customer_id',
            populate: {
               path: 'my_quotations'
            }
         })
         .exec()
      res.json(order)
   } catch (e) {
      res.status(500).json(e)
   }
}

orderAcceptanceCtlr.update = async (req, res) => {
   const orderId = req.params.id
   const { status_of_product } = req.body;
   try {
      const updatedOrder = await OrderAcceptance.findByIdAndUpdate(orderId, { status_of_product }, { new: true }).populate({
         path: 'product_id'
      })
         .populate({
            path: 'customer_id',
            populate: {
               path: 'my_quotations'
            }
         })
         .exec()

      res.json(updatedOrder);
   } catch (e) {
      res.status(500).json(e)
   }
}

// // orderAcceptanceCtlr.notify = async (req, res) => {

// // }
// orderAcceptanceCtlr.notify = async () => {
//   // Set up a cron job to run daily (adjust the timing as needed)
// cron.schedule('0 0 * * *', async () => {
//    try {
//       const today = new Date();

//       // Fetch orders scheduled for delivery today
//       const ordersForToday = await OrderAcceptance.find({
//          delivery_date: {
//             $gte: today,
//             $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Within the current day
//          }
//       });

//       // Process and send notifications for orders due today
//       ordersForToday.forEach(async (order) => {
//          await sendNotificationToAdmin(order); // Notify admin about the delivery
//          const customer = await User.findById(order.customer_id);

//          if (customer && customer.email) {
//             const product = await Product.findById(order.product_id);

//             const mailOptions = {
//                from: process.env.NODE_MAILER_MAIL,
//                to: 'pn14016@gmail.com',
//                subject: 'Delivery Today',
//                html: `<p>Your order for "${product.productname}" is scheduled for delivery today. Please expect it soon!</p>`
//             };

//             await transporter.sendMail(mailOptions); // Send notification to customer
//          }
//       });

//       console.log('Delivery notifications sent for today');
//    } catch (error) {
//       console.error('Error sending delivery notifications:', error);
//    }
// }, {
//    timezone: 'Your Timezone' // Set your desired timezone
// });

// };

module.exports = orderAcceptanceCtlr