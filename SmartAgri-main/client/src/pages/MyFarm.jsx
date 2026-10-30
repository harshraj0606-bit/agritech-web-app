import { useEffect, useState } from "react";
import CompactSelect from "../components/CompactSelect";
import {
  addFarm as addFarmToStorage,
  FARM_UPDATED_EVENT,
  readFarms,
} from "../farmStorage";

function MyFarm() {
  const [farmName, setFarmName] = useState("");
  const [area, setArea] = useState("");
  const [mainCrop, setMainCrop] = useState("");
  const [soilType, setSoilType] = useState("");

  const [farms, setFarms] = useState([]);
  const [message, setMessage] = useState("");
  const [farmLoadError, setFarmLoadError] = useState("");

  const loadFarms = () => {
    try {
      setFarms(readFarms());
      setFarmLoadError("");
    } catch (error) {
      console.error("Failed to load saved farms:", error);
      setFarmLoadError("Saved farm data could not be read from this browser.");
    }
  };

  useEffect(() => {
    loadFarms();

    window.addEventListener(FARM_UPDATED_EVENT, loadFarms);
    return () => window.removeEventListener(FARM_UPDATED_EVENT, loadFarms);
  }, []);

  const saveFarm = () => {
    const farmArea = Number(area);
    if (!farmName.trim() || !area || !mainCrop || !soilType) {
      setMessage("⚠️ Please fill all fields.");
      return;
    }

    if (!Number.isFinite(farmArea) || farmArea <= 0) {
      setMessage("⚠️ Farm area must be a number greater than zero.");
      return;
    }

    try {
      setFarms(
        addFarmToStorage({
          farmName: farmName.trim(),
          area: farmArea,
          mainCrop,
          soilType,
        })
      );
      setMessage("✅ Farm saved in this browser.");
      setFarmName("");
      setArea("");
      setMainCrop("");
      setSoilType("");
      setFarmLoadError("");
    } catch (error) {
      console.error("Failed to save farm in this browser:", error);
      setMessage("❌ Could not save farm data in this browser.");
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <p className="small-title">FARM MANAGEMENT</p>

        <h1>🚜 My Farm</h1>

        <p>
          Manage your farm information and monitor your crop activities.
        </p>
      </div>

      {/* Add Farm Form */}

      <div className="form-card">
        <h2>Add Farm</h2>

        <div className="form-grid">

          <div>
            <label>Farm Name</label>

            <input
              type="text"
              placeholder="Enter farm name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
            />
          </div>

          <div>
            <label>Farm Area (Acres)</label>

            <input
              type="number"
              placeholder="Example: 5"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          <div>
            <label>Main Crop</label>

            <select
              value={mainCrop}
              onChange={(e) => setMainCrop(e.target.value)}
            >
              <option value="">Select crop</option>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
              <option value="Tomato">Tomato</option>
              <option value="Groundnut">Groundnut</option>
            </select>
          </div>

          <div>
            <label>Soil Type</label>

            <CompactSelect
              ariaLabel="Soil Type"
              options={[
                { value: "Clay", label: "Clay" },
                { value: "Loamy", label: "Loamy" },
                { value: "Sandy", label: "Sandy" },
                { value: "Black Soil", label: "Black Soil" },
                { value: "Red Soil", label: "Red Soil" },
              ]}
              placeholder="Select soil type"
              value={soilType}
              onChange={setSoilType}
            />
          </div>

        </div>

        <button
          className="primary-btn"
          onClick={saveFarm}
        >
          💾 Save Farm
        </button>

        {message && (
          <p style={{ marginTop: "15px" }}>
            {message}
          </p>
        )}
      </div>


      {/* Saved Farms */}

      <div className="dashboard-panel" style={{ marginTop: "25px" }}>

        <div className="panel-header">

          <div>
            <p className="small-title">THIS BROWSER</p>
            <h2>Saved Farms</h2>
          </div>

          <span className="ai-badge">
            {farms.length}
          </span>

        </div>


        {farmLoadError ? (
          <p>❌ {farmLoadError}</p>
        ) : farms.length === 0 ? (

          <p>No farms saved yet.</p>

        ) : (

          <div className="recommendation-list">

            {farms.map((farm) => (

              <div
                className="recommendation-item"
                key={farm._id}
              >

                <span>🚜</span>

                <div>

                  <strong>{farm.farmName}</strong>

                  <p>
                    🌾 Crop: {farm.mainCrop}
                    <br />
                    📐 Area: {farm.area} acres
                    <br />
                    🌱 Soil: {farm.soilType}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

export default MyFarm;
