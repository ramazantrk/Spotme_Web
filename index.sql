version: '3.8'

services:
  # 1. DOTNET API SERVICE
  api:
    image: rturk859/my-dotnet-app:amd64-latest
    container_name: dotnet-web-app
    restart: always
    ports:
      - "8080:5005"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ASPNETCORE_URLS=http://+:5005
      - ConnectionStrings__DefaultConnection=Server=db;Port=3306;Database=LocalConnect;Uid=user;Pwd=Ramazan3141. !
      - Jwt:Key=thisisverysecretkeyforyourapplicationon
    depends_on:
      - db

  # 2. MARIADB DATABASE SERVICE
  db:
    image: mariadb:10.4
    container_name: mysql-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: admin3141.!
      MYSQL_DATABASE: LocalConnect
      MYSQL_USER: user
      MYSQL_PASSWORD: Ramazan3141.!
    volumes:
      - db_data:/var/lib/mysql
      - ./LocalConnect.sql:/docker-entrypoint-initdb.d/LocalConnect.sql 

# Verilerin kalıcı olması için volume tanımı
volumes:
  db_data:





docker run -d \
  --name spotme-app \
  --restart always \
  --network bridge \
  -p 8081:5005 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e ASPNETCORE_URLS=http://+:5005 \
  -e "ConnectionStrings__DefaultConnection=Server=172.19.0.3;Port=3306;Database=LocalConnect;Uid=root;Pwd=admin3141.!" \
  -e Jwt__Key=thisisverysecretkeyforyourapplicationon \
  -e Firebase__ServiceAccountKeyPath=/app/firebase-key.json \
  -e Firebase__ProjectId=localconnect-ec6aa \
  -v /home/ramazan/localconnect-ec6aa-firebase-adminsdk-fbsvc-759a35c8af.json:/app/firebase-key.json:ro \
  -v /home/ramazan/uploads:/app/uploads \
  rturk859/my-dotnet-app:amd64-latest