FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY server/Linea.Api/Linea.Api.csproj server/Linea.Api/
RUN dotnet restore server/Linea.Api/Linea.Api.csproj
COPY server/Linea.Api/ server/Linea.Api/
RUN dotnet publish server/Linea.Api/Linea.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/ .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Linea.Api.dll"]
