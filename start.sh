#!/bin/bash

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
