const express = require("express");
const router = express.Router();
const EventRoute = require("./event.route");
const PurchaseRoute = require("./purchase.route");
const TicketRoute = require("./ticket.route");

const Routes = [
  {
    path: "/events",
    route: EventRoute,
  },
  {
    path: "/purchases",
    route: PurchaseRoute,
  },
  // Core ticket reservation API
  {
    path: "/",
    route: TicketRoute,
  },
];

Routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
