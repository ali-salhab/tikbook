const axios = require("axios");

const login = async () => {
  try {
    console.log("Attempting login on port 5000...");
    const response = await axios.post("http://localhost:5000/api/auth/login", {
      email: "admin@tikbook.com",
      password: "123456",
    });
    console.log("Login Successful!");
    console.log("Token:", response.data.token ? "Received" : "Missing");
    console.log("Is Admin:", response.data.isAdmin);
  } catch (error) {
    console.error("Login Failed!");
    if (error.code === "ECONNREFUSED") {
      console.error("Connection Refused - Server is likely down");
    } else if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
};

login();
