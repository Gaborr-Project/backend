require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


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
