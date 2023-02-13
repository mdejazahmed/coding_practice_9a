const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let database = null;

function validatePassword(password) {
  if (password.length >= 5) {
    return true;
  } else {
    return false;
  }
}

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running");
    });
  } catch (err) {
    console.log(err.message);
  }
};
initializeDbAndServer();

//register user
app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUserQuery = `
  SELECT
      *
  FROM
      user
  WHERE
      username='${username}';`;

  const existUser = await database.get(existingUserQuery);

  if (existUser !== undefined) {
    res.status(400);
    res.send("User already exists");
  } else {
    const isValidPassword = validatePassword(password);
    if (isValidPassword) {
      const addUserQuery = `
        INSERT INTO
            user (username,name,password,gender,location)
        VALUES
            ('${username}','${name}','${hashedPassword}','${gender}','${location}')`;

      await database.run(addUserQuery);
      res.status(200);
      res.send("User created successfully");
    } else {
      res.status(400);
      res.send("Password is too short");
    }
  }
});

//login user
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const existingUserQuery = `
    SELECT
        *
    FROM
        user
    WHERE
        username="${username}";`;

  const existingUser = await database.get(existingUserQuery);

  if (existingUser !== undefined) {
    const isValidPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (isValidPassword) {
      res.status(200);
      res.send("Login success!");
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  } else {
    res.status(400);
    res.send("Invalid user");
  }
});

//change password
app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  const existingUserPassQuery = `
        SELECT
            *
        FROM
            user
        WHERE
            username='${username}';`;

  const existingUser = await database.get(existingUserPassQuery);
  const isValidPassword = await bcrypt.compare(
    oldPassword,
    existingUser.password
  );

  if (isValidPassword) {
    if (validatePassword(newPassword)) {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      const changePasswordQuery = `
        UPDATE user
        SET password='${hashedNewPassword}'
        WHERE username='${username}';`;

      await database.run(changePasswordQuery);

      res.status(200);
      res.send("Password updated");
    } else {
      res.status(400);
      res.send("Password is too short");
    }
  } else {
    res.status(400);
    res.send("Invalid current password");
  }
});

module.exports = app;
