# syntax=docker/dockerfile:1

FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /build

# Cache dependency resolution independently from application source changes.
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -B -DskipTests package && \
    cp target/*.jar /build/app.jar

FROM eclipse-temurin:21-jre AS runtime

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring --home-dir /app spring
COPY --from=build --chown=spring:spring /build/app.jar /app/app.jar

USER spring
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
