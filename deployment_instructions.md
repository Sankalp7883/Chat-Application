# Production Deployment Instructions

This document provides step-by-step instructions for deploying this chat application in production on **Render**, **Railway**, and **AWS EC2**.

---

## 1. Required Environment Variables

All environments need the following configurations:

| Environment Variable | Description | Example Value |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | The active Spring Boot profile | `prod` |
| `PORT` | The port the web server runs on | `8080` |
| `SPRING_DATASOURCE_URL` | MySQL database connection URL | `jdbc:mysql://<host>:<port>/<dbname>?useSSL=true` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `admin` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `secret_password` |
| `SPRING_DATA_REDIS_HOST` | Redis host | `redis-12345.c1.us-east.redislabs.com` |
| `SPRING_DATA_REDIS_PORT` | Redis port | `6379` |
| `SPRING_DATA_REDIS_PASSWORD` | Redis password (if applicable) | `redis_secret` |
| `CORS_ALLOWED_ORIGINS` | Permitted browser domain origins | `https://yourdomain.com` |

---

## 2. Platform-Specific Deployment Guides

### A. Deploying to Render

Render is a modern platform suited for hosting static websites (React) and web services (Spring Boot) with managed databases.

#### 1. Setup MySQL & Redis Databases
- Provision a **Render PostgreSQL/MySQL** (or external database like PlanetScale/Aiven).
- Provision a **Render Redis** instance (Redis commands: Set, Hash, Value are supported).
- Copy their connection details (URL, host, port, user, password).

#### 2. Deploy Spring Boot Backend (Web Service)
- Create a new **Web Service** on Render.
- Connect your GitHub Repository.
- Select the **Docker** runtime. (Render will automatically detect the root `Dockerfile` or you can configure a customized build path to `server/Dockerfile`).
- Add the required environment variables in the **Environment** settings tab of the service.
- Set `PORT` to `8080`.

#### 3. Deploy React Frontend (Static Site)
- Create a new **Static Site** on Render.
- Set Build Command to: `npm run build` (inside the `frontend` folder).
- Set Publish Directory to: `dist`.
- Set Redirects/Rewrite rules in Render:
  - Route all fallback URLs to `/index.html` (Single Page Application routing).
  - Configure backend redirects (proxy) or ensure the frontend points API calls directly to the backend Render Web Service URL.

---

### B. Deploying to Railway

Railway is optimized for simple, instant deployments directly from Github using configuration variables or Dockerfiles.

#### 1. Set Up Redis and MySQL Services
- In Railway, click **New Project** -> **Provision MySQL**.
- Click **Add Service** -> **Provision Redis**.
- Railway automatically adds the service variables (like `REDISHOST`, `REDISPORT`, `MYSQLURL`) to your environment variables workspace.

#### 2. Deploy the Backend
- Add a service linked to your GitHub repository.
- Under **Settings**, set the Root Directory to the backend server module folder or configure Railway to build using the Maven settings.
- Map the Railway database variables to the Spring Boot variables in the service's **Variables** tab:
  - `SPRING_DATASOURCE_URL` = `${{MYSQL_URL}}`
  - `SPRING_DATASOURCE_USERNAME` = `${{MYSQLUSER}}`
  - `SPRING_DATASOURCE_PASSWORD` = `${{MYSQLPASSWORD}}`
  - `SPRING_DATA_REDIS_HOST` = `${{REDISHOST}}`
  - `SPRING_DATA_REDIS_PORT` = `${{REDISPORT}}`
  - `SPRING_DATA_REDIS_PASSWORD` = `${{REDISPASSWORD}}`
  - `SPRING_PROFILES_ACTIVE` = `prod`
- Railway will build and serve the application automatically.

---

### C. Deploying to AWS EC2

Deploying to AWS EC2 gives you complete virtual server control. We recommend using **Docker Compose** to run the services together cleanly on the EC2 instance.

#### 1. Spin up EC2 Instance
- Launch an EC2 Instance (Ubuntu Server is recommended, minimum `t3.medium` for compile/run performance).
- Associate an **Elastic IP** to keep the server IP static.
- Edit the **Security Group** inbound rules to allow:
  - Port `80` (HTTP)
  - Port `443` (HTTPS)
  - Port `22` (SSH)

#### 2. Install Docker & Docker Compose
Connect to your EC2 instance via SSH and run:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
```

#### 3. Set Up Nginx Reverse Proxy
To securely proxy requests to your containers and terminate SSL (using Let's Encrypt), install Nginx on the host:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Configure Nginx site configuration (`/etc/nginx/sites-available/default`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80; # Points to frontend container proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket traffic
    location /sample-chat/ {
        proxy_pass http://localhost:8080/sample-chat/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
Obtain an SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com
```

#### 4. Run using Docker Compose
- Transfer your `docker-compose.yml` to the EC2 instance.
- Run `docker compose up -d` to build and launch MySQL, Redis, Nginx, the backend service, and React frontend in the background.
