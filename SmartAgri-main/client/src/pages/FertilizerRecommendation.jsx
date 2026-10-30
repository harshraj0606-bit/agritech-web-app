import { useState } from "react";
import CompactSelect from "../components/CompactSelect";

const soilTypes = [
  { value: "Loamy", label: "Loamy" },
  { value: "Clay", label: "Clay" },
  { value: "Sandy", label: "Sandy" },
  { value: "Silty", label: "Silty" },
  { value: "Black Soil", label: "Black Soil" },
  { value: "Red Soil", label: "Red Soil" },
];

function FertilizerRecommendation() {
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [ph, setPh] = useState("");
  const [moisture, setMoisture] = useState("");
  const [soilType, setSoilType] = useState("");

  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

 const getRecommendation = async () => {
  if (
    nitrogen === "" ||
    phosphorus === "" ||
    potassium === "" ||
    ph === "" ||
    moisture === "" ||
    soilType === ""
  ) {
    setMessage("⚠️ Please fill all fields.");
    setResult(null);
    return;
  }

  try {
    setMessage("🔍 Analyzing soil data...");
    setResult(null);

    const response = await fetch(
      apiUrl("/api/fertilizer-recommendation"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nitrogen: Number(nitrogen),
          phosphorus: Number(phosphorus),
          potassium: Number(potassium),
          ph: Number(ph),
          moisture: Number(moisture),
          soilType: soilType,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage("❌ " + data.message);
      return;
    }

    setMessage("✅ Fertilizer recommendation generated!");

    setResult({
      fertilizer: data.recommendation.fertilizer,
      reason: data.recommendation.reason,
      usage: data.recommendation.usage,
      nitrogen: data.recommendation.nitrogen,
      phosphorus: data.recommendation.phosphorus,
      potassium: data.recommendation.potassium,
      ph: data.recommendation.ph,
      moisture: data.recommendation.moisture,
      soilType: data.recommendation.soilType,
    });
  } catch (error) {
    console.error("❌ Fertilizer API error:", error);
    setMessage("❌ Cannot connect to backend.");
  }
};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🌱 Fertilizer Recommendation</h1>
          <p>
            Get a fertilizer recommendation based on your soil nutrient
            conditions.
          </p>
        </div>
      </div>

      <div className="form-card">
        <h2>🧪 Soil Nutrient Information</h2>

        <div className="form-grid">
          <div>
            <label>Nitrogen (N)</label>
            <input
              type="number"
              placeholder="Example: 70"
              value={nitrogen}
              onChange={(e) => setNitrogen(e.target.value)}
            />
          </div>

          <div>
            <label>Phosphorus (P)</label>
            <input
              type="number"
              placeholder="Example: 35"
              value={phosphorus}
              onChange={(e) => setPhosphorus(e.target.value)}
            />
          </div>

          <div>
            <label>Potassium (K)</label>
            <input
              type="number"
              placeholder="Example: 40"
              value={potassium}
              onChange={(e) => setPotassium(e.target.value)}
            />
          </div>

          <div>
            <label>Soil pH</label>
            <input
              type="number"
              step="0.1"
              placeholder="Example: 6.5"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
            />
          </div>

          <div>
            <label>Soil Moisture (%)</label>
            <input
              type="number"
              placeholder="Example: 55"
              value={moisture}
              onChange={(e) => setMoisture(e.target.value)}
            />
          </div>

          <div>
            <label>Soil Type</label>
            <CompactSelect
              ariaLabel="Soil Type"
              options={soilTypes}
              placeholder="Select Soil Type"
              value={soilType}
              onChange={setSoilType}
            />
          </div>
        </div>

        <button className="primary-btn" onClick={getRecommendation}>
          🌿 Get Fertilizer Recommendation
        </button>

        {message && <p className="form-message">{message}</p>}
      </div>

      {result && (
        <div className="dashboard-panel fertilizer-result">
          <div className="panel-header">
            <h2>🌿 Recommended Fertilizer</h2>
          </div>

          <div className="recommendation">
            <div className="fertilizer-summary">
              <h3>{result.fertilizer}</h3>

              <p>{result.reason}</p>
            </div>

            <div className="info-box">
              <strong>💡 Usage Guidance</strong>
              <p>{result.usage}</p>
            </div>
          </div>

          <div className="dashboard-stats">
            <div className="dashboard-card">
              <span>Nitrogen</span>
              <strong>{result.nitrogen}</strong>
            </div>

            <div className="dashboard-card">
              <span>Phosphorus</span>
              <strong>{result.phosphorus}</strong>
            </div>

            <div className="dashboard-card">
              <span>Potassium</span>
              <strong>{result.potassium}</strong>
            </div>

            <div className="dashboard-card">
              <span>Soil pH</span>
              <strong>{result.ph}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FertilizerRecommendation;
import { apiUrl } from "../api";
