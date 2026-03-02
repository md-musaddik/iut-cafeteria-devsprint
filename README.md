\# IUT Cafeteria — DevSprint 2026

IUT Computer Society Hackathon Submission



\## Team Name: **Lone Stack**
## Team Memeber: 1

-**Team Leader: Md Musaddik Ibna Solimullah - CSE(SWE)-24- 240042102**



Initially, I built the complete application using the MERN stack as a monolithic architecture. After successfully implementing all core features, I refactored the system into a microservices-based architecture and applied DevOps principles, including containerization, automated testing, CI/CD pipelines, and service monitoring.

**Admin login: admin@iut.edu / Admin@1234**

\## Architecture

5 independent microservices built with Node.js + Express + MongoDB:

| Service           | Port | Responsibility                              |

|-------------------|------|---------------------------------------------|

| Identity Provider | 3001 | JWT authentication, rate limiting (3/min)   |

| Order Gateway     | 3002 | API gateway, token validation, stock cache  |

| Stock Service     | 3003 | Inventory, optimistic locking               |

| Kitchen Queue     | 3004 | Async order processing (responds in <2s)    |

| Notification Hub  | 3005 | Real-time Socket.io status updates          |



\## Run Locally (One Command)

```

docker compose up --build

```

Open http://localhost after all services start (~2 minutes)

**Admin login: admin@iut.edu / Admin@1234**



\## AI Tools Used

\- Claude Ai — architecture guidance, code generation, debugging

\- ChatGPT - Idea generation, requirement analysis, Debugging


🔄 The Lifecycle of an Order
When a student places a meal order, the system processes it through a strict, decoupled flow to guarantee performance and data integrity:
Client Request: The browser sends a POST /orders request to the Order Gateway.
Authentication: The Gateway intercepts the request and calls the Identity Provider (GET /verify) to validate the user's JWT.
Cache Interception: The Gateway checks its cache; if the meal option is mapped to 0 stock, the request is rejected immediately, shielding the database from unnecessary read/write load.
Atomic Deduction: The Gateway calls the Stock Service (POST /deduct). The Stock Service verifies the item version and decrements the stock atomically. It generates a unique idempotencyKey to prevent duplicate charges.
Background Queueing: The Gateway sends the confirmed order ID to the Kitchen Queue (POST /enqueue).
Instant Client Response: The Kitchen Queue immediately responds to the Gateway, which forwards a 201 Created back to the student. This keeps the client-side wait time under 2 seconds.
Async Cooking Simulation: The Kitchen Queue processes the order through multiple stages ("Stock Verified", "In Kitchen", "Ready") using simulated delays.
Real-Time Push Notification: At each stage, the Kitchen calls the Notification Hub, which emits an orderUpdate event via Socket.io directly to the student's isolated room.
⚙️ DevOps & Deployment
Dockerized Environment: Every service and the frontend includes a lightweight Dockerfile (using Alpine Linux images to reduce footprint). The entire stack is orchestrated via docker-compose.yml.
CI/CD Pipeline: A GitHub Actions workflow (ci.yml) is triggered on every push to the main branch. It spins up an Ubuntu runner, installs dependencies, and runs Jest unit tests covering stock deduction and validation logic. The build intentionally fails if any test does not pass.
Reverse Proxy: The React frontend is served via an Nginx container, which proxies /api calls to the Order Gateway and /socket.io connections to the Notification Hub, bypassing complex CORS issues during local execution.
