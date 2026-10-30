<div align="center">

# 🌱 SmartAgri

### Practical tools for smarter farm decisions

Crop guidance, soil insights, disease screening, weather, and farm management
in one application.

</div>

---

## What you can do

| Module | What it does |
| --- | --- |
| 🌾 Crop Recommendation | Suggests crops from soil and weather inputs |
| 🔬 Disease Detection | Checks for a visible leaf, then screens for 38 disease classes |
| 🧪 Soil Analysis | Summarizes soil nutrients, pH, and moisture |
| 🌿 Fertilizer Recommendation | Provides guidance based on soil measurements |
| 💧 Smart Irrigation | Estimates water needs from farm conditions |
| 🌦️ Weather | Looks up current weather by city |
| 🚜 My Farm | Saves and displays farms in this browser |

## Get started

### Prerequisites

- Node.js and npm
- Python 3.9+
- Internet access for model downloads and live weather
- MongoDB only for database-backed authentication and profile features

### 1. Start the backend

```sh
cd server
npm install
npm start
```

The API runs at `http://localhost:5001` by default. Set `PORT` to use another
port. Add `MONGO_URI` to `server/.env` to enable database-backed features.

### 2. Start the AI service

In a new terminal, from the project root:

```sh
python3 -m venv ai/.venv
ai/.venv/bin/python -m pip install -r ai/requirements.txt
ai/.venv/bin/python ai/download_disease_model.py
ai/.venv/bin/python ai/app.py
```

The AI service runs at `http://127.0.0.1:8000`. The pinned model downloads
include an approximately 88 MB disease classifier and an approximately 114 MB
leaf detector. Both are required for disease detection.

### 3. Start the frontend

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The
frontend connects to `http://localhost:5001` by default. To change it, set
`VITE_API_URL` in `client/.env`:

```dotenv
VITE_API_URL=http://localhost:5001
```

## How the app handles data

- **My Farm:** farm entries are stored in this browser's local storage; they
  are not synced between devices.
- **Authentication and profile:** use MongoDB when `MONGO_URI` is configured.
- **Crop recommendations:** use the trained model when available; otherwise,
  the backend provides rule-based guidance.
- **Weather:** uses Open-Meteo and requires internet access.
- **Disease images:** are uploaded temporarily for analysis and removed after
  the request completes.

## Disease screening notes

The disease classifier has 38 PlantVillage classes. Its reported 98.9%
accuracy is on held-out PlantVillage leaf images, so results on field photos
may be less reliable. The leaf detector helps reject unrelated images but
cannot guarantee every accepted image is a crop leaf. Treat results as
screening guidance, not a diagnosis.

Both model downloads are pinned to specific revisions and verified with
SHA-256 checks. The disease classifier is released under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) by
[Rodayna Emad Mohamed](https://huggingface.co/rodynaemad). The leaf detector is
[MIT-licensed](https://huggingface.co/pedromiguelsanchez/yolo-plant-leaf-detection).

## Useful commands

| Where | Command | Purpose |
| --- | --- | --- |
| `client/` | `npm run build` | Build the frontend |
| `client/` | `npm run lint` | Lint the frontend |
| `client/` | `npm run preview` | Preview a production build |
| `server/` | `npm start` | Start the API |
| `ai/` | `.venv/bin/python app.py` | Start the AI service |

## Project structure

```text
SmartAgri/
├── ai/       Python AI service and model setup
├── client/   React + Vite frontend
├── server/   Express API and MongoDB models
└── .gitignore
```
