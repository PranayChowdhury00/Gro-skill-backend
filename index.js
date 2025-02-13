const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173","https://gro-skill.web.app"], //replace with client address
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
    

    const collectionOfGroSkill = client.db("GroSkill").collection("Courses");
    const cartCollection = client.db("GroSkill").collection("cart");
    const videoProgressCollection = client
      .db("GroSkill")
      .collection("videoProgress");

    const userStore = client.db("GroSkill").collection("users");
    const storeComment = client.db("GroSkill").collection("comments");
    const storeInstructors = client.db("GroSkill").collection("instructors");
    const storePayments = client.db("GroSkill").collection("payment");
    const reviewsCollection = client.db("GroSkill").collection("reviews");

    // Stripe Payment Route
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
    
        if (!price || isNaN(price) || price <= 0) {
          return res.status(400).send({ error: "Invalid price value" });
        }
    
        const amount = parseInt(price * 100);
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
    
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (err) {
        console.error("Error creating payment intent:", err);
        res.status(500).send({ error: "Failed to create payment intent" });
      }
    });
    

  app.post("/save-payment", async (req, res) => {
  try {
    const paymentData = req.body;
    console.log(paymentData)
    const result = await storePayments.insertOne(paymentData);
    res.status(201).json({ message: "Payment saved successfully", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to save payment" });
  }
  });

  app.get('/payment/:email', async (req, res) => {
    const query = { email: req.params.email };
    try {
        // Use find() if expecting multiple documents
        const result = await storePayments.find(query).toArray(); 
        res.send(result);
    } catch (error) {
        console.error("Error fetching payment data:", error);
        res.status(500).send({ error: "Failed to fetch payment data" });
    }
});
  app.get('/allPayment', async (req, res) => {
    try {
        // Use find() if expecting multiple documents
        const result = await storePayments.find().toArray(); 
        res.send(result);
    } catch (error) {
        console.error("Error fetching payment data:", error);
        res.status(500).send({ error: "Failed to fetch payment data" });
    }
});


    //save user in db
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
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const getUser = await userStore.find({email:email}).toArray();
      res.send(getUser);
    });

    app.patch("/user/:email",async(req,res)=>{
      const email = req.params.email;
      const updatedUser=req.body;
      const result = await userStore.updateOne(
        {email:email},
        {$set:updatedUser}
      )
      res.send(result);
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

    // Backend: Route to remove cart items after payment
app.post("/remove-cart-items", async (req, res) => {
  try {
    const { email } = req.body; // Get the email of the user
    const result = await cartCollection.deleteMany({ email }); // Delete all cart items for the user

    res.status(200).json({ message: "Cart items removed successfully", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove cart items" });
  }
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
    app.post('/doComment',async(req,res)=>{
      const {comment,email,name}=req.body;
      const data={comment,email,name};
      const result = await storeComment.insertOne(data);
      res.send(result)
    })

    app.get('/getComment', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default page = 1
  const limit = parseInt(req.query.limit) || 5; // Default limit = 5 comments
  const skip = (page - 1) * limit;

  try {
    const comments = await storeComment.find().skip(skip).limit(limit).toArray();
    const totalComments = await storeComment.countDocuments();
    res.send({ comments, totalComments });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

//get all the storeInstructors

app.post("/applyInstructor", async (req, res) => {
  try {
    const instructorData = req.body;
    const result = await storeInstructors.insertOne(instructorData);
    if (result.acknowledged) {
      res.status(201).json({ success: true, message: "Application submitted successfully" });
    } else {
      res.status(400).json({ success: false, message: "Failed to submit application" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.get('/getInstructor',async(req,res)=>{
  const result = await storeInstructors.find().toArray();
  res.send(result)
})
app.delete('/deleteInstructorRequest/:id',async(req,res)=>{
  const id = req.params.id;
  const result = await storeInstructors.deleteOne({_id:new ObjectId(id)});
  res.send(result);
})
app.patch('/updateTheUsrRole/:id', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  
  try {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { status: status } } // Ensure "status" field updates
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true, message: "User role updated successfully!" });
    } else {
      res.json({ success: false, message: "No changes made!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

//add review
app.post('/review', async (req, res) => {
  const { rating, reviewText, userEmail, userName } = req.body;

  // Validate rating
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Invalid rating. Rating must be between 1 and 5.' });
  }

  // Validate reviewText (optional)
  if (!reviewText.trim()) {
    return res.status(400).json({ success: false, message: 'Review text cannot be empty.' });
  }

  const newReview = {
    rating,
    reviewText,
    userEmail,
    userName,
    createdAt: new Date(),
  };

  try {
    const result = await reviewsCollection.insertOne(newReview);
    res.status(201).json({ success: true, message: 'Review added successfully.' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Failed to add review. Please try again later.' });
  }
});

// Route to get all reviews for a specific course
app.get('/review',async(req,res)=>{
  const result= await reviewsCollection.find().toArray();
  res.send(result)
})




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
