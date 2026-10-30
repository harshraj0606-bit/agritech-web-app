const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Farm = require("./models/Farm");
const User = require("./models/User");
const bcrypt = require("bcrypt");

const app = express();

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
const UPLOADS_DIR = path.join(__dirname, "uploads");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());


// ======================================================
// FILE UPLOAD CONFIGURATION
// ======================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Please upload an image file."));
    }

    cb(null, true);
  },
});


// ======================================================
// BASIC TEST ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "🌱 SmartAgri Backend is Running!",
    status: "success",
  });
});


// ======================================================
// AUTHENTICATION - SIGNUP
// ======================================================

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email, and password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Failed to create account.",
    });
  }
});


// ======================================================
// AUTHENTICATION - LOGIN
// ======================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    res.json({
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Failed to login.",
    });
  }
});


// ======================================================
// PROFILE - UPDATE
// ======================================================

app.put("/api/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      farmName,
      location,
    } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (email !== undefined) {
      user.email = email.toLowerCase().trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (farmName !== undefined) {
      user.farmName = farmName.trim();
    }

    if (location !== undefined) {
      user.location = location.trim();
    }

    await user.save();

    res.json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        farmName: user.farmName,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      message: "Failed to update profile.",
    });
  }
});


// ======================================================
// PROFILE - GET
// ======================================================

app.get("/api/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        farmName: user.farmName,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch profile.",
    });
  }
});

console.log("✅ PROFILE GET ROUTE LOADED");

app.get("/api/test-profile", (req, res) => {
  res.json({
    message: "PROFILE ROUTE TEST WORKING"
  });
});


// ======================================================
// CROP RECOMMENDATION
// ======================================================

function getRuleBasedCropRecommendation({
  nitrogen,
  phosphorus,
  potassium,
  temperature,
  humidity,
  ph,
  rainfall,
  soilType,
}) {
  const inRange = (value, min, max) => value >= min && value <= max;
  const candidates = [
    {
      crop: "rice",
      matches: [
        inRange(temperature, 20, 35),
        humidity >= 70,
        rainfall >= 150,
        inRange(ph, 5.5, 7.5),
        ["clay", "loamy"].includes(soilType.toLowerCase()),
        nitrogen >= 40,
      ],
      conditions: "warm temperatures, high humidity, and ample rainfall",
    },
    {
      crop: "maize",
      matches: [
        inRange(temperature, 18, 32),
        inRange(humidity, 40, 80),
        inRange(rainfall, 50, 200),
        inRange(ph, 5.5, 7.5),
        nitrogen >= 40,
        phosphorus >= 20,
      ],
      conditions: "moderate rainfall, warm temperatures, and balanced nutrients",
    },
    {
      crop: "cotton",
      matches: [
        inRange(temperature, 21, 35),
        inRange(rainfall, 50, 150),
        inRange(ph, 5.5, 8),
        soilType.toLowerCase().includes("black"),
        potassium >= 20,
      ],
      conditions: "warm temperatures, moderate rainfall, and suitable soil",
    },
    {
      crop: "chickpea",
      matches: [
        inRange(temperature, 15, 30),
        inRange(rainfall, 20, 100),
        inRange(ph, 5.5, 8),
        ["sandy", "loamy", "red soil"].includes(soilType.toLowerCase()),
        phosphorus >= 15,
      ],
      conditions: "mild temperatures, lower rainfall, and well-drained soil",
    },
    {
      crop: "millet",
      matches: [
        inRange(temperature, 25, 38),
        rainfall <= 100,
        inRange(ph, 5, 8.5),
        ["sandy", "red soil"].includes(soilType.toLowerCase()),
        potassium >= 15,
      ],
      conditions: "warm conditions, lower rainfall, and well-drained soil",
    },
    {
      crop: "kidneybeans",
      matches: [
        inRange(temperature, 15, 25),
        inRange(humidity, 50, 80),
        inRange(rainfall, 60, 150),
        inRange(ph, 5.5, 7),
        nitrogen < 100,
        potassium >= 15,
      ],
      conditions: "mild temperatures, moderate rainfall, and slightly acidic soil",
    },
  ];

  const recommendation = candidates.reduce((best, candidate) => {
    const score = candidate.matches.filter(Boolean).length;
    return score > best.score ? { ...candidate, score } : best;
  }, { score: -1 });

  if (recommendation.score === 0) {
    return {
      crop: "No clear match",
      confidence: null,
      source: "rules",
      reason:
        "The supplied conditions do not match the guide's crop ranges well. " +
        "Check the measurements and consult local agricultural guidance before selecting a crop.",
    };
  }

  return {
    crop: recommendation.crop,
    confidence: null,
    source: "rules",
    reason:
      `The trained AI model is unavailable. This rule-based guide suggests ${recommendation.crop} ` +
      `because the supplied conditions match ${recommendation.conditions}. ` +
      "Use this as a starting point and confirm suitability with local agricultural guidance.",
  };
}

app.post("/api/crop-recommendation", async (req, res) => {
  try {
    const {
      nitrogen,
      phosphorus,
      potassium,
      temperature,
      humidity,
      ph,
      rainfall,
      soilType,
    } = req.body;

    if (
      nitrogen === undefined ||
      phosphorus === undefined ||
      potassium === undefined ||
      temperature === undefined ||
      humidity === undefined ||
      ph === undefined ||
      rainfall === undefined ||
      typeof soilType !== "string" ||
      !soilType.trim()
    ) {
      return res.status(400).json({
        message: "Please provide all crop conditions.",
      });
    }

    const conditions = {
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      temperature: Number(temperature),
      humidity: Number(humidity),
      ph: Number(ph),
      rainfall: Number(rainfall),
    };

    if (Object.values(conditions).some((value) => !Number.isFinite(value))) {
      return res.status(400).json({
        message: "Crop conditions must contain valid numbers.",
      });
    }

    const response = await axios.post(
      "http://127.0.0.1:8000/predict-crop",
      conditions
    );

    const prediction = response.data.prediction;

    res.json({
      message: "AI crop recommendation generated successfully",

      recommendation: {
        crop: prediction.crop,
        confidence: prediction.confidence,
        source: "ai",

        reason:
          "The recommendation was generated using the SmartAgri Random Forest machine learning model.",

        input: {
          nitrogen,
          phosphorus,
          potassium,
          temperature,
          humidity,
          ph,
          rainfall,
          soilType,
        },
      },
    });
  } catch (error) {
    if (
      ["ECONNREFUSED", "ECONNABORTED", "ETIMEDOUT"].includes(error.code) ||
      error.response?.status === 503
    ) {
      console.warn(
        "Crop AI service is unavailable; using rule-based recommendation."
      );
      return res.json({
        message: "Rule-based crop guidance generated successfully",
        recommendation: getRuleBasedCropRecommendation({
          nitrogen: Number(req.body.nitrogen),
          phosphorus: Number(req.body.phosphorus),
          potassium: Number(req.body.potassium),
          temperature: Number(req.body.temperature),
          humidity: Number(req.body.humidity),
          ph: Number(req.body.ph),
          rainfall: Number(req.body.rainfall),
          soilType: req.body.soilType,
        }),
      });
    }

    console.error(
      "Crop ML recommendation failed:",
      error.message
    );

    res.status(500).json({
      message: "Failed to generate AI crop recommendation",
      error: error.message,
    });
  }
});


// ======================================================
// FARM - GET ALL FARMS
// ======================================================

app.get("/api/farms", async (req, res) => {
  try {
    const farms = await Farm.find().sort({
      createdAt: -1,
    });

    res.json({
      message: "Farms fetched successfully",
      farms: farms,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch farms",
      error: error.message,
    });
  }
});


// ======================================================
// FARM - CREATE
// ======================================================

app.post("/api/farms", async (req, res) => {
  try {
    const farm = new Farm(req.body);

    const savedFarm = await farm.save();

    res.status(201).json({
      message: "🚜 Farm saved successfully!",
      farm: savedFarm,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save farm",
      error: error.message,
    });
  }
});


// ======================================================
// DISEASE DETECTION
// ======================================================

app.post(
  "/api/disease-detection",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a crop image.",
        });
      }

      console.log(
        "📷 Image received:",
        req.file.filename
      );

      const formData = new FormData();

      formData.append(
        "image",
        fs.createReadStream(req.file.path)
      );

      const aiResponse = await axios.post(
        "http://127.0.0.1:8000/predict",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      console.log(
        "🤖 AI response:",
        aiResponse.data
      );

      res.json({
        message: "Image analyzed successfully!",

        image: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          size: req.file.size,
        },

        prediction: aiResponse.data.prediction,
      });
    } catch (error) {
      if (error.response?.status === 400) {
        return res.status(400).json({
          message:
            error.response.data?.message || "Please upload a valid image file.",
        });
      }

      if (error.response?.status === 422) {
        return res.status(422).json({
          message:
            error.response.data?.message ||
            "No clear plant leaf was detected. Upload a close, well-lit photo of a crop leaf.",
        });
      }

      if (error.response?.status === 503) {
        return res.status(503).json({
          message:
            "Disease detection is not configured. Install both AI models and start the AI service.",
        });
      }

      console.error(
        "❌ AI server error:",
        error.message
      );

      const aiUnavailable = [
        "ECONNREFUSED",
        "ECONNABORTED",
        "ETIMEDOUT",
      ].includes(error.code);

      res.status(aiUnavailable ? 503 : 500).json({
        message: aiUnavailable
          ? "Disease detection AI service is not running. Start the Python AI service and try again."
          : "Failed to analyze the uploaded image.",
      });
    } finally {
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (error) {
          console.error("Failed to remove uploaded image:", error.message);
        }
      }
    }
  }
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge
        ? "Image must be 10 MB or smaller."
        : "Please upload one image file.",
    });
  }

  if (error.message === "Please upload an image file.") {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});


// ======================================================
// SOIL ANALYSIS
// ======================================================

app.post("/api/soil-analysis", async (req, res) => {
  try {
    const {
      nitrogen,
      phosphorus,
      potassium,
      ph,
      moisture,
      soilType,
    } = req.body;

    if (
      nitrogen === undefined ||
      phosphorus === undefined ||
      potassium === undefined ||
      ph === undefined ||
      moisture === undefined ||
      !soilType
    ) {
      return res.status(400).json({
        message: "Please provide all soil details.",
      });
    }

    const soilValues = [nitrogen, phosphorus, potassium, ph, moisture];
    if (
      soilValues.some(
        (value) =>
          value === null ||
          (typeof value === "string" && !value.trim()) ||
          !Number.isFinite(Number(value))
      )
    ) {
      return res.status(400).json({
        message: "Soil measurements must be valid numbers.",
      });
    }

    const n = Number(nitrogen);
    const p = Number(phosphorus);
    const k = Number(potassium);
    const soilPh = Number(ph);
    const soilMoisture = Number(moisture);

    if (
      n < 0 ||
      p < 0 ||
      k < 0 ||
      soilPh < 0 ||
      soilPh > 14 ||
      soilMoisture < 0 ||
      soilMoisture > 100
    ) {
      return res.status(400).json({
        message:
          "Nutrient levels must be non-negative, pH must be between 0 and 14, and moisture must be between 0 and 100.",
      });
    }

    let condition = "";
    let recommendation = "";

    if (
      n >= 50 &&
      p >= 30 &&
      k >= 30 &&
      soilPh >= 6 &&
      soilPh <= 7.5 &&
      soilMoisture >= 40 &&
      soilMoisture <= 70
    ) {
      condition = "Healthy Soil";

      recommendation =
        "The soil has good nutrient levels, suitable pH and sufficient moisture. It is generally suitable for crop cultivation.";
    } else if (
      n < 50 ||
      p < 30 ||
      k < 30
    ) {
      condition = "Nutrient Deficient";

      recommendation =
        "The soil may require additional nutrients. Consider using suitable organic manure or fertilizer based on a professional soil test.";
    } else if (soilPh < 6) {
      condition = "Acidic Soil";

      recommendation =
        "The soil is acidic. Consider suitable soil amendments after consulting an agricultural expert.";
    } else if (soilPh > 7.5) {
      condition = "Alkaline Soil";

      recommendation =
        "The soil is alkaline. Suitable soil management practices may be required to improve nutrient availability.";
    } else if (soilMoisture < 40) {
      condition = "Low Soil Moisture";

      recommendation =
        "The soil moisture is low. Irrigation may be required depending on the crop and weather conditions.";
    } else if (soilMoisture > 70) {
      condition = "High Soil Moisture";

      recommendation =
        "The soil has high moisture. Avoid excessive irrigation and ensure proper drainage.";
    } else {
      condition = "Moderate Soil Condition";

      recommendation =
        "The soil condition is moderate. Regular monitoring of nutrients, pH and moisture is recommended.";
    }

    res.json({
      message: "Soil analysis completed successfully",

      result: {
        condition,
        recommendation,
        nitrogen: n,
        phosphorus: p,
        potassium: k,
        ph: soilPh,
        moisture: soilMoisture,
        soilType,
      },
    });
  } catch (error) {
    console.error(
      "❌ Soil analysis error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to analyze soil.",
      error: error.message,
    });
  }
});


// ======================================================
// FERTILIZER RECOMMENDATION
// ======================================================

app.post(
  "/api/fertilizer-recommendation",
  async (req, res) => {
    try {
      const {
        nitrogen,
        phosphorus,
        potassium,
        ph,
        moisture,
        soilType,
      } = req.body;

      if (
        nitrogen === undefined ||
        phosphorus === undefined ||
        potassium === undefined ||
        ph === undefined ||
        moisture === undefined ||
        !soilType
      ) {
        return res.status(400).json({
          message: "Please provide all soil details.",
        });
      }

      const n = Number(nitrogen);
      const p = Number(phosphorus);
      const k = Number(potassium);
      const soilPh = Number(ph);
      const soilMoisture = Number(moisture);

      const soilValues = [nitrogen, phosphorus, potassium, ph, moisture];
      if (
        soilValues.some(
          (value) =>
            value === null ||
            (typeof value === "string" && !value.trim()) ||
            !Number.isFinite(Number(value))
        )
      ) {
        return res.status(400).json({
          message: "Soil measurements must be valid numbers.",
        });
      }

      if (
        n < 0 ||
        p < 0 ||
        k < 0 ||
        soilPh < 0 ||
        soilPh > 14 ||
        soilMoisture < 0 ||
        soilMoisture > 100
      ) {
        return res.status(400).json({
          message:
            "Nutrient levels must be non-negative, pH must be between 0 and 14, and moisture must be between 0 and 100.",
        });
      }

      let fertilizer = "";
      let reason = "";
      let usage = "";

      if (n < 50) {
        fertilizer = "Urea";

        reason =
          "Nitrogen level is low. Nitrogen fertilizer can support plant growth and leaf development.";

        usage =
          "Apply according to the crop requirement and a proper soil-test recommendation.";
      } else if (p < 30) {
        fertilizer = "DAP (Diammonium Phosphate)";

        reason =
          "Phosphorus level is low. Phosphorus supports root development and flowering.";

        usage =
          "Apply DAP according to the crop requirement and recommended agricultural dosage.";
      } else if (k < 30) {
        fertilizer = "MOP (Muriate of Potash)";

        reason =
          "Potassium level is low. Potassium helps improve plant strength and crop quality.";

        usage =
          "Apply potassium fertilizer according to crop requirements and soil-test recommendations.";
      } else if (soilPh < 6) {
        fertilizer = "Agricultural Lime";

        reason =
          "The soil is acidic. Lime can help increase soil pH and improve nutrient availability.";

        usage =
          "Apply lime only after confirming soil acidity through a proper soil test.";
      } else if (soilPh > 7.5) {
        fertilizer = "Sulfur-based Soil Amendment";

        reason =
          "The soil is alkaline. A suitable soil amendment may help improve nutrient availability.";

        usage =
          "Use soil amendments carefully based on soil-test results and expert advice.";
      } else if (soilMoisture > 70) {
        fertilizer = "No Immediate Fertilizer Required";

        reason =
          "The soil moisture is high. Excess moisture can affect nutrient uptake and root health.";

        usage =
          "Improve drainage and avoid excessive irrigation before applying fertilizer.";
      } else {
        fertilizer = "Balanced NPK Fertilizer";

        reason =
          "The soil has relatively balanced nutrient levels and suitable pH.";

        usage =
          "Use a balanced fertilizer according to the crop type and recommended dosage.";
      }

      res.json({
        message:
          "Fertilizer recommendation generated successfully",

        recommendation: {
          fertilizer,
          reason,
          usage,
          nitrogen: n,
          phosphorus: p,
          potassium: k,
          ph: soilPh,
          moisture: soilMoisture,
          soilType,
        },
      });
    } catch (error) {
      console.error(
        "❌ Fertilizer recommendation error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to generate fertilizer recommendation.",
        error: error.message,
      });
    }
  }
);


// ======================================================
// MONGODB CONNECTION + SERVER START
// ======================================================

app.listen(PORT, () => {
  console.log(`🚀 SmartAgri server running on http://localhost:${PORT}`);
});

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("❌ MongoDB connection failed:", error.message);
    });
} else {
  console.warn(
    "⚠️ MONGO_URI is not set; database-backed features will be unavailable."
  );
}