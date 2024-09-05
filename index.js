const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const we = require("./Data/We.json");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 7000;

const app = express();
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
};
app.use(cors(corsConfig));
app.use(express.json());

app.get("/", (req, res) => {
  console.log(`Bistro Server is Running on port ${port}`);
  res.send(`New Bistro Server is Running on port ${port}`);
});

///Verify JWT start
// const verifyJWT=(req,res,next)=>{
//     console.log("Heating verify JWT");
//     const authorization=req.headers.authorization
//     if(!authorization){
//         return res.status(401).send({error:true, message: 'unauthorized access'})
//     }
//     const token=authorization.split(" ")[1]
//     console.log("Token: ",token);

//     jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
//         if(error){
//             return res.status(403).send({error:true,message:"unAuthorized access"})
//         }
//         req.decoded=decoded;
//         next()
//     })
// }

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized token" });
  }

  //bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "unAuthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
///Verify JWT end

///MongoDB Work Start

const User = process.env.USER_DB;
const Password = process.env.USER_PASS;
// console.log("ID: ",User);
// console.log("Password: ",Password);

// const uri = "mongodb+srv://<username>:<password>@cluster0.jokwhaf.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${User}:${Password}@cluster0.jokwhaf.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    ///Operation start
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");
    const userCollection = client.db("bistroDB").collection("user");

    ///JWT work start

    ///JWT API start
    // app.post('/jwt',async(req,res)=>{
    //     const user=req.body;
    //     console.log("JWT Body: ",user);
    //     const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
    //     res.send({token})
    // })
    ///JWT API end

    ///Second Time JWT start
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("JWT Body: ", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    ///Second Time JWT end

    app.get("/we", verifyJwt, async (req, res) => {
      const decoded = req.decoded;
      console.log("Now decoded: ", decoded);
      //    if(decoded.email!==req?.query?.email){
      //       return res.status(403).send({error: true, message: 'forbidden access'})
      //    }
      res.send(we);
    });

    app.get("/we/:id", async (req, res) => {
      const id = req.params.id;
      const target = we.find((w) => w.id == id);
      res.send(target);
    });
    ///JWT work end

    ///Get Menu start
    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });
    ///Get Menu end

    ///Get review start
    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });
    ///Get review end

    ///USer work start

    ///Post User start
    app.post("/user", async (req, res) => {
      const user = req.body;

      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    //Post User end

    ///Get User start
    app.get("/check/:email", async (req, res) => {
      console.log("Check Admin");
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    ///Get User end

    ///Get Api of user start
    app.get("/user", verifyJwt, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    ///Get Api of user end

    //Delete api of User start
    app.delete("/user/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      console.log("delete id: ", id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    //Delete api of User end

    //Patch Api of user mean make admin start
    app.patch("/user/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      // console.log("Patch Id: ",id);
      const user = req.body;
      // console.log("for Admin: ",user);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //Patch Api of user mean make admin end

    ///Check Admin start
    app.get("/user/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    ///Check Admin end

    ///User work end

    ///Cart Work

    ///post Cart start
    app.post("/cart", async (req, res) => {
      const cart = req.body;
      //console.log("Come Cart: ",cart);
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });
    ///post Cart start

    //Delete Cart start
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      console.log("Delete id: ", id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    //Delete Cart end

    ///Get Cart start
    app.get("/cart", verifyJwt, async (req, res) => {
      const decoded = req.decoded;
      console.log("Now decoded: ", decoded);
      if (decoded.email !== req?.query?.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      let query = {};
      if (req.query.email) {
        query = { userEmail: req.query.email };
      }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    ///Get Cart end

    ///Operation end
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

///MongoDB Work End

app.listen(port, () => {
  console.log(`Bistro Serverfie is Running on port ${port}`);
});
