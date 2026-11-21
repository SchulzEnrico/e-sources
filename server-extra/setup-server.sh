#!/usr/bin/env bash
# Erzeugt server/ über Spring Initializr (inkl. Maven-Wrapper) und ergänzt die Dateien aus Stufe 1.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d server ] && { echo "server/ existiert schon – Abbruch."; exit 1; }
curl -fsSL https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java -d javaVersion=21 \
  -d groupId=de.esource -d artifactId=server -d name=server \
  -d packageName=de.esource.server -d applicationName=ESourceApplication \
  -d dependencies=web -d baseDir=server -o /tmp/esource-server.zip
unzip -q /tmp/esource-server.zip -d .
cp -R server-extra/src/. server/src/
cp server-extra/application.properties server/src/main/resources/application.properties
chmod +x server/mvnw
echo "server/ fertig."
