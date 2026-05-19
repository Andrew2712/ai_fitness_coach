# 🏋️ AI Fitness Coach

An intelligent, agent-based fitness coaching system that delivers personalized workout guidance, fatigue prediction, burnout detection, and recovery planning — powered by machine learning and real-time wearable integrations.

---

## 📌 Project Description

AI Fitness Coach is a full-stack application that acts as your personal AI-powered fitness advisor. It ingests health data from wearables (Fitbit & Strava), processes it through a multi-agent pipeline, and provides actionable, adaptive coaching — including goal generation, fatigue forecasting, burnout alerts, and dynamic recovery plans.

The system uses a trained Random Forest classifier to predict fatigue levels and combines daily activity data, heart rate variability (HRV), sleep metrics, and session-level data into a unified fitness profile. A memory layer ensures recommendations evolve with user behavior over time.

---

## 🗂️ Project Structure

```
ai_fitness_coach/
├── backend/
│   ├── agents/                  # Modular AI agent system
│   │   ├── analysis_agent.py    # Profile building, trend analysis, recovery, burnout
│   │   ├── decision_agent.py    # AI goal generation and planning
│   │   ├── memory_agent.py      # Persistent user memory and feedback tracking
│   │   ├── inference_agent.py   # Fatigue prediction via ML
│   │   ├── fusion_agent.py      # Merges daily + session fatigue scores
│   │   ├── daily_feature_agent.py  # Feature engineering with HRV
│   │   ├── live_pipeline_agent.py  # Real-time data ingestion from Fitbit/Strava
│   │   ├── fitbit_agent.py      # Fitbit OAuth2 integration
│   │   ├── strava_agent.py      # Strava OAuth2 integration
│   │   ├── session_agent.py     # Session detection
│   │   ├── session_feature_agent.py
│   │   ├── session_ml_agent.py
│   │   ├── label_agent.py       # Fatigue labeling logic
│   │   ├── ml_agent.py          # Model training utilities
│   │   ├── data_agent.py        # Data loading and preprocessing
│   │   ├── health_agent.py      # Overall health score computation
│   │   ├── registry_agent.py    # Model version registry
│   │   ├── collector_agent.py   # Data collection orchestration
│   │   └── logger.py
│   ├── Memory/
│   │   └── memory.json          # Persistent user memory store
│   ├── models/
│   │   └── registry.json        # Model version registry
│   ├── api.py                   # FastAPI REST API
│   ├── controller.py            # Core orchestration logic
│   ├── coach.py                 # Coach entry point and feature engineering
│   ├── compare_models.py        # Model benchmarking utilities
│   ├── database.py              # PostgreSQL ORM (SQLAlchemy)
│   ├── auth.py                  # Authentication helpers
│   ├── profile.py               # User profile utilities
│   ├── scheduler.py             # Scheduled background jobs
│   ├── main.py                  # Application entry point
│   ├── Procfile                 # Deployment process config
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Main dashboard view
│   │   │   ├── ProgressCard.jsx # Progress visualization
│   │   │   ├── BurnoutStatus.jsx
│   │   │   └── Forecast.jsx     # Weekly forecast view
│   │   ├── components/
│   │   │   ├── UserSelector.jsx
│   │   │   ├── ProgressCard.jsx
│   │   │   ├── BurnoutStatus.jsx
│   │   │   └── Forecast.jsx
│   │   ├── api/
│   │   │   └── coachApi.js      # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── acoach_logo.png
│   ├── package.json
│   └── vite.config.js
│
├── training/
│   ├── model.py                 # Random Forest model training
│   ├── create_labels.py         # Fatigue label generation
│   └── build_master_dataset.py  # Dataset construction pipeline
│
├── data/
│   ├── final_fitness_data.csv       # Merged, processed dataset
│   ├── master_fitness_dataset.csv
│   ├── fitness_ml_data.csv          # ML-ready labeled dataset
│   ├── dailyActivity_merged.csv     # Raw daily activity data
│   ├── sleepDay_merged.csv          # Raw sleep data
│   ├── heartrate_seconds_merged.csv # Second-level heart rate data
│   ├── session_data.csv
│   └── model_comparison_results.json
│
├── models/
│   ├── best_fatigue.pkl         # Best performing fatigue model
│   ├── features.json            # Feature schema for inference
│   ├── registry.json            # Model version tracking
│   └── v3–v7_fatigue.pkl        # Historical model versions
│
├── Dockerfile
├── requirements.txt
└── app.py
```

---

## ✨ Features

### 🤖 Multi-Agent AI System
A modular pipeline of specialized agents handles every stage of the coaching lifecycle:
- **Analysis Agent** — builds user fitness profiles, computes recovery index and progress scores
- **Decision Agent** — generates personalized goals and plans using rule-based + memory-driven logic
- **Memory Agent** — tracks sessions, adherence, and feedback across time to adapt recommendations
- **Fusion Agent** — combines daily fatigue predictions with session-level fatigue for a blended score
- **Live Pipeline Agent** — ingests real-time data from Fitbit or Strava and prepares it for inference

### 📊 Fatigue & Burnout Prediction
- Machine learning model (Random Forest) trained on steps, calories, sleep, heart rate, and HRV
- Three-level fatigue classification: low / moderate / high
- Burnout alerting with configurable threshold logic
- Weekly recovery forecasting based on recent trends

### 🔗 Wearable Integrations
- **Fitbit** — OAuth2 integration fetching activity, sleep, heart rate, and HRV
- **Strava** — OAuth2 integration fetching weekly/monthly activity summaries, pace, and elevation

### 🧠 Adaptive Memory & Feedback
- Users build a history of goals, progress scores, and session data
- The system detects repeated low adherence and automatically simplifies goals
- Consistent performance decline triggers a structured reset plan

### 📈 Key Health Metrics Tracked
- Steps, calories, active minutes
- Sleep duration and efficiency
- Average and trended heart rate
- Heart Rate Variability (HRV, 7-day rolling)
- Training load (steps × HR)
- Weekly load, weekly sleep, step consistency
- Recovery index and overall progress score

### 🖥️ Dashboard (React + Vite)
- User selector to switch between tracked users
- Progress card with key fitness metrics
- Burnout status panel
- Weekly forecast visualization

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI, Uvicorn |
| ML / Data | scikit-learn (Random Forest), pandas, numpy, joblib |
| Database | PostgreSQL, SQLAlchemy |
| Wearables | Fitbit API (OAuth2), Strava API (OAuth2) |
| Frontend | React, Vite |
| Deployment | Docker, Railway (Procfile) |
| Scheduling | Background scheduler (scheduler.py) |
| Model Storage | joblib `.pkl` files + JSON registry |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL instance
- Fitbit Developer App credentials (optional)
- Strava API credentials (optional)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/ai_fitness_coach.git
cd ai_fitness_coach

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost/fitness_db"
export FITBIT_CLIENT_ID="your_fitbit_client_id"
export FITBIT_CLIENT_SECRET="your_fitbit_client_secret"
export STRAVA_CLIENT_ID="your_strava_client_id"
export STRAVA_CLIENT_SECRET="your_strava_client_secret"

# Start the API server
cd backend
uvicorn api:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
docker build -t ai-fitness-coach .
docker run -p 8000:8000 ai-fitness-coach
```

---

## 🧪 Model Training

To retrain the fatigue prediction model on updated data:

```bash
# Build the master dataset (merges activity, sleep, HR data)
python training/build_master_dataset.py

# Generate fatigue labels
python training/create_labels.py

# Train the Random Forest model
python training/model.py
```

The trained model is saved to `models/fitness_model.pkl` and the feature schema to `models/features.json`.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/users` | List all tracked user IDs |
| `GET` | `/coach/{user_id}` | Get full coaching report for a user |
| `POST` | `/feedback` | Submit goal adherence feedback |
| `GET` | `/strava/auth` | Initiate Strava OAuth flow |
| `GET` | `/fitbit/auth` | Initiate Fitbit OAuth flow |

---

## 📋 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `FITBIT_CLIENT_ID` | Fitbit Developer App client ID |
| `FITBIT_CLIENT_SECRET` | Fitbit Developer App client secret |
| `STRAVA_CLIENT_ID` | Strava API client ID |
| `STRAVA_CLIENT_SECRET` | Strava API client secret |
| `DATA_DIR` | Override path to data directory |
| `MODEL_DIR` | Override path to models directory |

---

## 🗺️ Roadmap

- [ ] Real-time push notifications for burnout alerts
- [ ] Nutrition tracking integration
- [ ] LLM-powered natural language coaching chat
- [ ] Mobile app (React Native)
- [ ] Multi-user leaderboard and social features
- [ ] Garmin and Apple Health integrations

---
