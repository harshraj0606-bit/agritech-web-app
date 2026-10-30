from flask import Flask, request, jsonify
import joblib
import numpy as np
import onnxruntime as ort
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO
import os
import json
from pathlib import Path


app = Flask(__name__)


# ==========================================
# FILE PATHS
# ==========================================

MODEL_DIR = Path(__file__).resolve().parent / "model"
DISEASE_MODEL_PATH = Path(
    os.environ.get(
        "DISEASE_MODEL_PATH",
        MODEL_DIR / "plant_disease_model.onnx",
    )
)
LEAF_DETECTOR_PATH = Path(
    os.environ.get(
        "LEAF_DETECTOR_PATH",
        MODEL_DIR / "yolo11x_leaf.pt",
    )
)
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
CROP_MODEL_PATH = Path(
    os.environ.get("CROP_MODEL_PATH", MODEL_DIR / "crop_recommendation_model.pkl")
)


# ==========================================
# LOAD CLASS NAMES
# ==========================================

with open(CLASS_NAMES_PATH, "r") as file:
    class_names = json.load(file)

print("🌿 Classes loaded:", len(class_names))


# ==========================================
# LOAD TRAINED DISEASE MODEL
# ==========================================

disease_session = None
if DISEASE_MODEL_PATH.is_file():
    disease_session = ort.InferenceSession(
        str(DISEASE_MODEL_PATH),
        providers=["CPUExecutionProvider"],
    )
    print("✅ Plant disease model loaded successfully!")
else:
    print(f"⚠️ Disease model not found: {DISEASE_MODEL_PATH}")


# ==========================================
# LOAD PLANT LEAF DETECTOR
# ==========================================

leaf_detector = None
if LEAF_DETECTOR_PATH.is_file():
    leaf_detector = YOLO(str(LEAF_DETECTOR_PATH))
    print("✅ Plant leaf detector loaded successfully!")
else:
    print(f"⚠️ Plant leaf detector not found: {LEAF_DETECTOR_PATH}")

LEAF_DETECTION_CONFIDENCE = 0.5


# ==========================================
# LOAD CROP RECOMMENDATION MODEL
# ==========================================

crop_model = None
if CROP_MODEL_PATH.is_file():
    crop_model = joblib.load(CROP_MODEL_PATH)
    print("✅ Crop recommendation model loaded successfully!")
else:
    print(f"⚠️ Crop recommendation model not found: {CROP_MODEL_PATH}")


# ==========================================
# IMAGE TRANSFORMATION
# ==========================================

def prepare_image(image):
    image = image.convert("RGB")
    resize_size = 256
    scale = resize_size / min(image.size)
    resized_size = (round(image.width * scale), round(image.height * scale))
    image = image.resize(resized_size, Image.Resampling.BICUBIC)

    left = (image.width - 224) // 2
    top = (image.height - 224) // 2
    image = image.crop((left, top, left + 224, top + 224))

    pixels = np.asarray(image, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    pixels = (pixels - mean) / std
    return np.expand_dims(np.transpose(pixels, (2, 0, 1)), axis=0)


# ==========================================
# DISEASE RECOMMENDATIONS
# ==========================================

recommendations = {

    "Apple___Apple_scab":
        "Remove infected leaves and fruits. Improve air circulation and avoid excessive moisture.",

    "Apple___Black_rot":
        "Remove infected plant material and prune affected branches. Keep the orchard clean.",

    "Apple___Cedar_apple_rust":
        "Remove infected leaves and improve air circulation. Monitor the plant regularly.",

    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot":
        "Remove heavily affected leaves and improve field airflow. Use recommended disease management practices.",

    "Corn_(maize)___Common_rust_":
        "Monitor the crop regularly and remove severely affected leaves. Follow appropriate fungicide guidance.",

    "Corn_(maize)___Northern_Leaf_Blight":
        "Remove severely affected leaves and maintain good field sanitation. Use resistant varieties when possible.",

    "Grape___Black_rot":
        "Remove infected leaves and fruit. Improve air circulation and avoid prolonged leaf wetness.",

    "Grape___Esca_(Black_Measles)":
        "Remove severely affected plant parts and monitor vines carefully. Consult an agricultural expert.",

    "Orange___Haunglongbing_(Citrus_greening)":
        "Remove severely affected plants and control insect vectors. Consult an agricultural expert.",

    "Peach___Bacterial_spot":
        "Remove affected leaves and fruit. Maintain good airflow and avoid unnecessary leaf wetness.",

    "Pepper,_bell___Bacterial_spot":
        "Remove infected leaves and maintain good sanitation. Avoid overhead watering.",

    "Potato___Early_blight":
        "Remove affected leaves and maintain proper field sanitation. Avoid excessive moisture on leaves.",

    "Potato___Late_blight":
        "Remove infected plant material immediately and avoid prolonged leaf wetness. Seek expert treatment advice.",

    "Squash___Powdery_mildew":
        "Improve air circulation and remove heavily infected leaves. Avoid overcrowding plants.",

    "Strawberry___Leaf_scorch":
        "Remove affected leaves and maintain good plant spacing and airflow.",

    "Cherry_(including_sour)___Powdery_mildew":
        "Improve air circulation and remove infected plant parts. Monitor the crop regularly.",

    "Tomato___Bacterial_spot":
        "Remove infected leaves and avoid overhead watering. Maintain good garden sanitation.",

    "Tomato___Early_blight":
        "Remove affected leaves, improve airflow and avoid watering the foliage.",

    "Tomato___Late_blight":
        "Remove infected plant material quickly and avoid prolonged leaf moisture. Consult an expert.",

    "Tomato___Leaf_Mold":
        "Improve ventilation and reduce humidity around plants. Remove infected leaves.",

    "Tomato___Septoria_leaf_spot":
        "Remove infected leaves and improve airflow. Avoid overhead watering.",

    "Tomato___Spider_mites Two-spotted_spider_mite":
        "Inspect the underside of leaves and maintain adequate plant moisture. Seek pest management advice.",

    "Tomato___Target_Spot":
        "Remove affected leaves and improve air circulation. Avoid excessive leaf moisture.",

    "Tomato___Tomato_mosaic_virus":
        "Remove infected plants or plant parts and disinfect tools. Control spread between plants.",

    "Tomato___Tomato_Yellow_Leaf_Curl_Virus":
        "Control whitefly populations and remove severely infected plants. Consult an agricultural expert."
}


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():

    return jsonify({
        "message": "🌱 SmartAgri AI Server is Running!",
        "status": "success",
        "model": "Plant Disease DINOv2 Small (ONNX)",
        "leaf_validation": "available" if leaf_detector is not None else "unavailable",
        "classes": len(class_names)
    })


# ==========================================
# PREDICTION
# ==========================================

@app.route("/predict", methods=["POST"])
def predict():

    try:
        if leaf_detector is None:
            return jsonify({
                "message": "The plant leaf validation model is missing. Run ai/download_disease_model.py.",
                "status": "unavailable"
            }), 503

        if disease_session is None:
            return jsonify({
                "message": "The trained plant disease model is missing.",
                "status": "unavailable"
            }), 503

        if "image" not in request.files:

            return jsonify({
                "message": "Please upload an image.",
                "status": "error"
            }), 400


        image_file = request.files["image"]

        print("📷 Image received:", image_file.filename)


        # Open image
        image = Image.open(image_file).convert("RGB")

        leaf_results = leaf_detector.predict(
            source=image,
            conf=LEAF_DETECTION_CONFIDENCE,
            imgsz=640,
            device="cpu",
            verbose=False,
        )
        leaf_boxes = leaf_results[0].boxes if leaf_results else None
        image_area = image.width * image.height
        largest_leaf_fraction = 0.0
        if leaf_boxes is not None and len(leaf_boxes) > 0:
            box = leaf_boxes.xyxy.cpu().numpy()
            areas = (box[:, 2] - box[:, 0]) * (box[:, 3] - box[:, 1])
            largest_leaf_fraction = float(np.max(areas) / image_area)

        if largest_leaf_fraction < 0.02:
            return jsonify({
                "message": "No clear plant leaf was detected. Upload a close, well-lit photo of a crop leaf.",
                "status": "invalid_image"
            }), 422


        # AI prediction
        input_name = disease_session.get_inputs()[0].name
        outputs = disease_session.run(
            None,
            {input_name: prepare_image(image)}
        )
        logits = outputs[0][0]
        exp_logits = np.exp(logits - np.max(logits))
        probabilities = exp_logits / np.sum(exp_logits)
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])


        # Get class
        disease_code = class_names[predicted_class]


        confidence_percentage = (
            confidence * 100
        )


        # ======================================
        # CLEAN CROP + DISEASE NAME
        # ======================================

        parts = disease_code.split("___")

        crop_name = parts[0]

        disease_name = parts[1] if len(parts) > 1 else "Unknown"


        # Clean crop name
        crop_name = crop_name.replace("_", " ")

        crop_name = crop_name.replace(
            "(including sour)",
            ""
        )

        crop_name = crop_name.replace(
            ",",
            ""
        )

        crop_name = crop_name.strip()


        # Clean disease
        disease_name = disease_name.replace(
            "_",
            " "
        )

        disease_name = disease_name.strip()


        # ======================================
        # HEALTHY CHECK
        # ======================================

        is_healthy = (
            "healthy" in disease_name.lower()
        )


        if is_healthy:

            status = "Healthy"

            recommendation = (
                "The plant appears healthy. "
                "Continue regular monitoring, proper watering "
                "and good crop care."
            )

        else:

            status = "Disease Detected"

            recommendation = recommendations.get(
                disease_code,
                "Monitor the plant carefully and consult an agricultural expert for appropriate treatment."
            )


        # ======================================
        # PRINT RESULT
        # ======================================

        print("🌱 Crop:", crop_name)

        print("🦠 Disease:", disease_name)

        print(
            f"📊 Confidence: {confidence_percentage:.2f}%"
        )


        # ======================================
        # SEND RESULT
        # ======================================

        return jsonify({

            "message":
                "AI prediction completed successfully.",

            "status": "success",

            "prediction": {

                "crop": crop_name,

                "disease": disease_name,

                "status": status,

                "confidence":
                    round(
                        confidence_percentage,
                        2
                    ),

                "recommendation":
                    recommendation
            }

        })


    except UnidentifiedImageError:
        return jsonify({
            "message": "Please upload a valid image file.",
            "status": "invalid_image"
        }), 400

    except Exception as error:

        print(
            "❌ Prediction error:",
            str(error)
        )

        return jsonify({

            "message":
                "Failed to analyze image.",

            "status": "error",

            "error": str(error)

        }), 500
# ==========================================
# CROP RECOMMENDATION
# ==========================================

@app.route("/predict-crop", methods=["POST"])
def predict_crop():

    try:
        if crop_model is None:
            return jsonify({
                "status": "unavailable",
                "message": "The trained crop recommendation model is missing."
            }), 503

        data = request.get_json()

        nitrogen = float(data["nitrogen"])
        phosphorus = float(data["phosphorus"])
        potassium = float(data["potassium"])
        temperature = float(data["temperature"])
        humidity = float(data["humidity"])
        ph = float(data["ph"])
        rainfall = float(data["rainfall"])

        features = [[
            nitrogen,
            phosphorus,
            potassium,
            temperature,
            humidity,
            ph,
            rainfall
        ]]

        prediction = crop_model.predict(features)[0]

        probabilities = crop_model.predict_proba(features)[0]
        confidence = max(probabilities) * 100

        # ==========================================
        # CROP RECOMMENDATION EXPLANATION
        # ==========================================

        reason = (
            f"The AI model analyzed the soil nutrients (N: {nitrogen}, "
            f"P: {phosphorus}, K: {potassium}), temperature "
            f"({temperature}°C), humidity ({humidity}%), soil pH "
            f"({ph}), and rainfall ({rainfall} mm). "
            f"Based on these conditions, the model recommends {prediction}."
        )
        print("🌱 Recommended Crop:", prediction)
        print(f"📊 Confidence: {confidence:.2f}%")

        return jsonify({
            "status": "success",
            "prediction": {
    "crop": prediction,
    "confidence": round(confidence, 2),
    "reason": reason
}
        })

    except Exception as error:

        print("❌ Crop recommendation error:", error)

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500

# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False,
    )