\# IUT Cafeteria — DevSprint 2026

IUT Computer Society Hackathon Submission



\## Team Name: Lone Stack
## Team Memeber: 1

-Team Leader: Md Musaddik Ibna Solimullah - CSE(SWE)-24- 240042102



Initially, I built the complete application using the MERN stack as a monolithic architecture. After successfully implementing all core features, I refactored the system into a microservices-based architecture and applied DevOps principles, including containerization, automated testing, CI/CD pipelines, and service monitoring.



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

Admin login: admin@iut.edu / Admin@1234



\## AI Tools Used

\- Claude Ai — architecture guidance, code generation, debugging

\- ChatGPT - Idea generation, requirement analysis, Debugging

