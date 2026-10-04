# Stage 1: Build the Maven project
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy the pom.xml files to cache dependencies
COPY pom.xml .
COPY model/pom.xml model/
COPY server/pom.xml server/
COPY java-web-sock-client/pom.xml java-web-sock-client/

# Run dependency resolution to cache them
RUN mvn dependency:go-offline -B

# Copy the actual source files
COPY model/src model/src
COPY server/src server/src
COPY java-web-sock-client/src java-web-sock-client/src

# Package the application
RUN mvn clean package -DskipTests

# Stage 2: Run the Spring Boot application
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the war file from build stage
COPY --from=build /app/server/target/sample-chat.war app.war

# Expose port 8080
EXPOSE 8080

# Run the war
ENTRYPOINT ["java", "-jar", "app.war"]
