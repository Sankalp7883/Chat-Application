# Production Deployment Instructions

This application can be deployed as a Spring Boot WAR and a separately served React
static site. Use a managed MySQL and Redis service in production.

## Required environment variables

| Environment Variable | Description |
| :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Spring profile, usually `prod` |
| `PORT` | Port used by the backend web service |
| `SPRING_DATASOURCE_URL` | MySQL JDBC connection URL |
| `SPRING_DATASOURCE_USERNAME` | MySQL username |
| `SPRING_DATASOURCE_PASSWORD` | MySQL password |
| `SPRING_DATA_REDIS_HOST` | Redis hostname |
| `SPRING_DATA_REDIS_PORT` | Redis port |
| `SPRING_DATA_REDIS_PASSWORD` | Redis password, when required |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origin |

## Build the backend

From the repository root:

```bash
mvn clean package
```

The deployable artifact is `server/target/sample-chat.war`. Run it with a Java
21 runtime or deploy it to a compatible servlet container.

## Build the frontend

From `frontend`:

```bash
npm ci
npm run build
```

Publish the resulting `frontend/dist` directory using the static hosting
provider of your choice. Configure the host to serve `index.html` for client-side
routes and set the frontend API base URL to the backend service.

## Managed hosting

For Render, Railway, AWS, or another hosting provider:

1. Provision MySQL and Redis separately.
2. Create a backend web service that runs the packaged WAR.
3. Create a static site service that publishes `frontend/dist`.
4. Configure the environment variables above on the backend.
5. Set `CORS_ALLOWED_ORIGINS` to the public frontend URL.
6. Expose only the backend and frontend service ports; keep database services
   private where the provider supports private networking.
