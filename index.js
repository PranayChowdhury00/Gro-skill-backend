const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"], //replace with client address
    credentials: true,
  })
);

// cookie parser middleware
app.use(cookieParser());

//mongo db start

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.50gak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const collectionOfGroSkill = client.db("GroSkill").collection("Courses");
    const cartCollection = client.db("GroSkill").collection("cart");
    const videoProgressCollection = client
      .db("GroSkill")
      .collection("videoProgress");

    const userStore = client.db("GroSkill").collection("users");
    const storeComment = client.db("GroSkill").collection("comments");

    app.post("/registerUser", async (req, res) => {
      const { email, userName, userRole, photoUrl } = req.body;
      const existingUser = await userStore.findOne({ email });

      if (existingUser) {
        return res.status(400).send({ message: "User already exists" });
      }

      const newUser = { email, userName, userRole, photoUrl };
      const logInUser = await userStore.insertOne(newUser);
      res.send(logInUser);
    });

    app.post("/googleUser", async (req, res) => {
      const { email, userName } = req.body;
      const existingUser = await userStore.findOne({ email });

      if (existingUser) {
        return res.send({ message: "Google user already exists" });
      }

      const newUser = { email, userName };
      const logInUser = await userStore.insertOne(newUser);
      res.send(logInUser);
    });

    app.get("/user", async (req, res) => {
      const getUser = await userStore.find().toArray();
      res.send(getUser);
    });

    //course
    app.post("/addCourses", async (req, res) => {
      try {
        const { courseName, instructor, price, image, category, review } =
          req.body;

        if (!courseName || !instructor || !price || !image || !category) {
          return res.status(400).json({ message: "All fields are required" });
        }

        const newCourse = {
          courseName,
          instructor,
          price: parseFloat(price), // Ensure price is stored as a number
          image,
          category,
          review: review || 4.8, // Default review to 4.8 if not provided
        };

        const addingCourses = await collectionOfGroSkill.insertOne(newCourse);
        res
          .status(201)
          .json({ message: "Course added successfully", data: addingCourses });
      } catch (error) {
        console.error("Error adding course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/courses", async (req, res) => {
      const allCourses = await collectionOfGroSkill.find().toArray();
      res.send(allCourses);
    });

    // Update Course (PATCH)
    app.patch("/updateCourse/:id", async (req, res) => {
      const courseId = req.params.id;
      const updateFields = req.body;
    
      try {
        const result = await collectionOfGroSkill.updateOne(
          { _id: new ObjectId(courseId) }, // Ensure ObjectId is used
          { $set: updateFields }
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Course not found" });
        }
    
        res.send({ message: "Course updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Delete Course (DELETE)
    app.delete('/deleteCourse/:id', async (req, res) => {
      const { id } = req.params;
    
      const result = await collectionOfGroSkill.deleteOne({_id:new ObjectId(id)});
      res.send(result)
    });

    //
    app.post("/addToCart", async (req, res) => {
      const { email, course } = req.body;

      try {
        // Insert the new course to the cart collection
        const result = await cartCollection.insertOne({ email, course });

        // Fetch the updated cart count for the user
        const cartCount = await cartCollection.countDocuments({ email });

        // Send the result and the updated cart count back to the frontend
        res.send({ result, cartCount });
      } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).send({ error: "Something went wrong" });
      }
    });

    app.get("/cartItem/:email", async (req, res) => {
      const email = req.params.email;
      const result = await cartCollection.find({ email: email }).toArray();
      res.send(result);
    });

    app.delete("/deleteCart", async (req, res) => {
      const { id } = req.body;
      try {
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
        }); // Ensure ObjectId is used
        if (result.deletedCount > 0) {
          res.status(200).send({ message: "Item deleted successfully" });
        } else {
          res.status(404).send({ message: "Item not found" });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to delete item" });
      }
    });

    app.get("/cartCount/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const count = await cartCollection.countDocuments({ email: email });
        res.json({ count });
      } catch (error) {
        console.error("Error fetching cart count:", error);
        res.status(500).json({ message: "Failed to fetch cart count" });
      }
    });

    app.post("/api/saveProgress", async (req, res) => {
      const { userName, userEmail, videoId, progress } = req.body;

      try {
        const existingProgress = await videoProgressCollection.findOne({
          userEmail,
          videoId,
        });

        if (existingProgress) {
          // Update progress
          const result = await videoProgressCollection.updateOne(
            { userEmail, videoId },
            { $set: { progress } }
          );
          res
            .status(200)
            .send({ message: "Progress updated successfully", result });
        } else {
          // Insert new progress
          const result = await videoProgressCollection.insertOne({
            userName,
            userEmail,
            videoId,
            progress,
          });
          res
            .status(201)
            .send({ message: "Progress saved successfully", result });
        }
      } catch (error) {
        console.error("Error saving progress:", error);
        res.status(500).send({ message: "Error saving progress" });
      }
    });

    // Get Video Progress
    app.get("/api/getProgress/:userEmail/:videoId", async (req, res) => {
      const { userEmail, videoId } = req.params;

      try {
        const progress = await videoProgressCollection.findOne({
          userEmail,
          videoId,
        });

        if (progress) {
          res.status(200).send(progress);
        } else {
          res.status(404).send({ message: "Progress not found" });
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
        res.status(500).send({ message: "Error fetching progress" });
      }
    });

    // Get Video Progress for a specific user based on email
    app.get("/api/getVideoProgress/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const progress = await videoProgressCollection
          .find({ userEmail: email })
          .toArray();

        if (progress.length > 0) {
          res.status(200).send(progress);
        } else {
          res
            .status(404)
            .send({ message: "No progress data found for this user" });
        }
      } catch (error) {
        console.error("Error fetching video progress:", error);
        res.status(500).send({ message: "Error fetching video progress" });
      }
    });

    //update user role
    app.patch('/makeAdmin/:id', async (req, res) => {
      const userId = req.params.id;
      const { userRole } = req.body;
    
      try {
        const result = await userStore.updateOne(
          { _id: new ObjectId(userId) },  // Find the user by ID
          { $set: { userRole: userRole } } // Update the userRole field
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'User not found' });
        }
    
        res.send({ message: 'User role updated successfully', result });
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).send({ message: 'Error updating user role', error: error.message });
      }
    });
    

    app.delete('/deleteUser/:id',async(req,res)=>{
      const id=req.params.id;
      const result = await userStore.deleteOne({_id:new ObjectId(id)});
      res.send(result)
    })

    //comments
    





    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//mongo db end

app.get("/", (req, res) => {
  res.send("Hello from my server");
});

app.listen(port, () => {
  console.log("My simple server is running at", port);
});
