# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# 1️⃣ Copy only Maven files to cache dependencies
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

# 2️⃣ Copy the rest of the source code
COPY src ./src

# 3️⃣ Build the project
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# ✅ UPDATED: Use JAVA_OPTS from environment variable
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -Dserver.address=0.0.0.0 -jar app.jar"]