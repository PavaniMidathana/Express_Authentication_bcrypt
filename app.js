const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
const bcrypt = require("bcrypt");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Register user API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const selectUserQuery = `SELECT * 
     FROM user 
     WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Add new user

    //Check Password Length
    if (password.length < 5) {
      //If password length is <5 return "Password is too short"
      response.status(400);
      response.send("Password is too short");
    } else {
      //Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `INSERT INTO 
                user(username, name , password , gender , location) 
             VALUES 
                (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
                );`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    //Return user already exists
    response.status(400);
    response.send("User already exists");
  }
});

//Login User API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * 
   FROM user
   WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Invalid User
    response.status(400);
    response.send("Invalid user");
  } else {
    //Valid User and we have to check the password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      //Valid Password
      response.send("Login success!");
    } else {
      //Invalid Password
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change Password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * 
   FROM user
   WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Invalid User
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `UPDATE user 
                    SET password = '${hashedNewPassword}'
                    WHERE username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
