require("dotenv").config();
const express = require("express");

const app = express();

app.use(express.json());
const studentModule = require("./modules/users/student");
const lenderModule = require("./modules/users/lender");
const userModule = require("./modules/users/user");

app.use("/students", studentModule);
app.use("/lender", lenderModule);
app.use("/user", userModule);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
